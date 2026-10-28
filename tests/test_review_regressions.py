"""Offline regressions for project isolation and storage integrity."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI

from lightrag import LightRAG, operate
from lightrag.base import QueryContextResult, QueryParam
from lightrag.kg.multimodal_storage import MultimodalAssetStorage
from lightrag.projects import ProjectManager
from lightrag.projects.service import get_project_documents, migrate_project_metadata
from lightrag.utils import EmbeddingFunc


@pytest_asyncio.fixture
async def rag(tmp_path):
    instance = LightRAG(
        working_dir=str(tmp_path),
        workspace=tmp_path.name,
        llm_model_func=AsyncMock(return_value="answer"),
        embedding_func=EmbeddingFunc(
            embedding_dim=2, max_token_size=32, func=AsyncMock()
        ),
        multimodal_enabled=False,
    )
    await instance.initialize_storages()
    yield instance
    await instance.finalize_storages()


@pytest_asyncio.fixture
async def client(rag):
    with patch("sys.argv", ["lightrag-server"]):
        from lightrag.api.routers.entity_routes import create_entity_router
        from lightrag.api.routers.ontology_routes import create_ontology_router
        from lightrag.api.routers.project_routes import create_project_router
        from lightrag.api.routers.query_routes import create_query_routes

    app = FastAPI()
    for factory in (
        create_project_router,
        create_ontology_router,
        create_query_routes,
        create_entity_router,
    ):
        app.include_router(factory(rag, None))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as session:
        yield session


@pytest.mark.asyncio
async def test_clear_cache_preserves_project_and_ontology(rag, client):
    response = await client.post("/projects/create", json={"name": "Preserved"})
    assert response.status_code == 200, response.text
    project_id = response.json()["project_id"]
    ontology = await client.post(
        "/ontology/create",
        json={
            "project_id": project_id,
            "name": "Schema",
            "entity_types": ["Other"],
            "relation_types": ["Other"],
        },
    )
    assert ontology.status_code == 200, ontology.text
    await rag.aclear_cache()
    assert (await client.get(f"/projects/{project_id}")).status_code == 200
    assert (await client.get(f"/ontology/project/{project_id}")).status_code == 200


@pytest.mark.asyncio
async def test_project_listing_uses_public_kv_interface():
    class KV:
        def __init__(self):
            self.records = {}

        async def upsert(self, data):
            self.records.update(data)

        async def get_by_id(self, key):
            return self.records.get(key)

        async def get_by_prefix(self, prefix):
            return {
                key: value
                for key, value in self.records.items()
                if key.startswith(prefix)
            }

        async def index_done_callback(self):
            pass

    kv = KV()
    project = await ProjectManager(kv).create("Remote")
    projects = await ProjectManager(kv).list_all()
    assert [item.project_id for item in projects] == [project.project_id]


@pytest.mark.asyncio
async def test_missing_project_never_queries_global_data(rag, client):
    rag.aquery_llm = AsyncMock()
    for endpoint in ("/query", "/query/stream", "/query/data"):
        response = await client.post(
            endpoint, json={"query": "question", "project_id": "missing"}
        )
        assert response.status_code == 404, (endpoint, response.text)
    rag.aquery_llm.assert_not_called()


@pytest.mark.asyncio
async def test_project_lookup_failure_does_not_query_global_data(
    rag, client, monkeypatch
):
    monkeypatch.setattr(
        ProjectManager,
        "get",
        AsyncMock(side_effect=RuntimeError("storage unavailable")),
    )
    rag.aquery_llm = AsyncMock()
    response = await client.post(
        "/query", json={"query": "question", "project_id": "broken"}
    )
    assert response.status_code == 500
    rag.aquery_llm.assert_not_called()


@pytest.mark.asyncio
async def test_answer_cache_separates_project_context_and_history(rag, monkeypatch):
    monkeypatch.setattr(
        operate,
        "get_keywords_from_query",
        AsyncMock(return_value=(["topic"], ["entity"])),
    )

    async def context(*args):
        return QueryContextResult(
            context="context:" + args[7].chunk_ids[0], raw_data={}
        )

    monkeypatch.setattr(operate, "_build_query_context", context)
    model = AsyncMock(side_effect=["answer-a", "answer-b", "answer-followup"])
    config = {
        "llm_model_func": model,
        "tokenizer": SimpleNamespace(encode=lambda text: list(text)),
    }
    results = []
    for chunk_ids, history in [
        (["a"], []),
        (["b"], []),
        (["b"], [{"role": "user", "content": "previous"}]),
    ]:
        result = await operate.kg_query(
            "same question",
            None,
            None,
            None,
            None,
            QueryParam(chunk_ids=chunk_ids, conversation_history=history),
            config,
            hashing_kv=rag.llm_response_cache,
        )
        results.append(result.content)
    assert results == ["answer-a", "answer-b", "answer-followup"]
    assert model.await_count == 3


@pytest.mark.asyncio
async def test_asset_writers_preserve_each_other_and_deletions(tmp_path):
    first, second = (
        MultimodalAssetStorage(str(tmp_path)),
        MultimodalAssetStorage(str(tmp_path)),
    )
    await first.initialize()
    await second.initialize()
    a = await first.store_asset(b"first", "first.txt")
    b = await second.store_asset(b"second", "second.txt")
    assert await second.get_asset(a.asset_id) is not None
    assert await first.get_asset(b.asset_id) is not None
    assert await second.delete_asset(a.asset_id)
    await first.store_asset(b"third", "third.txt")
    reloaded = MultimodalAssetStorage(str(tmp_path))
    assert await reloaded.get_asset(a.asset_id) is None
    assert await reloaded.get_asset(b.asset_id) is not None


@pytest.mark.asyncio
async def test_identical_documents_are_independent_per_project(rag):
    for project_id in ("project-a", "project-b"):
        await rag.apipeline_enqueue_documents(
            "identical document", metadata={"project_id": project_id}
        )
    for project_id in ("project-a", "project-b"):
        docs, count = await rag.doc_status.get_docs_paginated(
            project_id=project_id, page=1, page_size=10
        )
        assert count == 1, project_id
        assert docs[0][1].metadata["project_id"] == project_id


@pytest.mark.asyncio
async def test_entity_routes_use_core_graph_and_mutations(rag, client, monkeypatch):
    await rag.chunk_entity_relation_graph.upsert_node(
        "example",
        {
            "entity_type": "Other",
            "description": "before",
            "source_id": "manual",
        },
    )
    response = await client.get("/entities/example")
    assert response.status_code == 200, response.text
    edit = AsyncMock(return_value={"entity_name": "example", "description": "after"})
    delete = AsyncMock(return_value=SimpleNamespace(status="success"))
    monkeypatch.setattr(rag, "aedit_entity", edit)
    monkeypatch.setattr(rag, "adelete_by_entity", delete)
    response = await client.put("/entities/example", json={"description": "after"})
    assert response.status_code == 200, response.text
    edit.assert_awaited_once()
    response = await client.delete("/entities/example")
    assert response.status_code == 200, response.text
    delete.assert_awaited_once_with("example")


@pytest.mark.asyncio
async def test_same_filename_uploads_and_downloads_in_two_projects(
    rag, tmp_path, monkeypatch
):
    with patch("sys.argv", ["lightrag-server"]):
        from lightrag.api.routers import document_routes

    monkeypatch.setattr(rag, "apipeline_process_enqueue_documents", AsyncMock())
    manager = document_routes.DocumentManager(str(tmp_path / "inputs"), workspace="")
    app = FastAPI()
    app.include_router(document_routes.create_document_routes(rag, manager, None))
    projects = [
        await ProjectManager(rag.project_metadata).create(name) for name in ("A", "B")
    ]
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as session:
        for project, content in zip(
            projects, (b"first project content", b"second project content")
        ):
            response = await session.post(
                "/documents/upload",
                data={"project_id": project.project_id},
                files={"file": ("same.txt", content, "text/plain")},
            )
            assert response.status_code == 200, response.text
            assert response.json()["status"] == "success"
            docs, count = await rag.doc_status.get_docs_paginated(
                project_id=project.project_id, page=1, page_size=10
            )
            assert count == 1
            doc_id = docs[0][0]
            response = await session.get(f"/documents/download/{doc_id}")
            assert response.status_code == 200, response.text
            assert response.content == content

        response = await session.post(
            "/documents/upload",
            files={"file": ("same.txt", b"global document", "text/plain")},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "success"


@pytest.mark.asyncio
async def test_metadata_migration_is_durable_and_idempotent(rag):
    import json
    from pathlib import Path

    project = await ProjectManager(rag.llm_response_cache).create("Legacy")
    key = f"project_{project.project_id}"
    await migrate_project_metadata(rag.llm_response_cache, rag.project_metadata)
    assert await rag.llm_response_cache.get_by_id(key) is None
    saved = json.loads(
        Path(rag.project_metadata._file_name).read_text(encoding="utf-8")
    )
    assert saved[key]["name"] == "Legacy"
    await ProjectManager(rag.project_metadata).update(project.project_id, name="Newer")
    await rag.llm_response_cache.upsert({key: project.to_dict()})
    await migrate_project_metadata(rag.llm_response_cache, rag.project_metadata)
    assert (
        await ProjectManager(rag.project_metadata).get(project.project_id)
    ).name == "Newer"


@pytest.mark.asyncio
async def test_migration_write_failure_keeps_legacy_records(rag, monkeypatch):
    project = await ProjectManager(rag.llm_response_cache).create("Legacy")
    monkeypatch.setattr(
        rag.project_metadata,
        "index_done_callback",
        AsyncMock(side_effect=OSError("disk full")),
    )
    with pytest.raises(OSError, match="disk full"):
        await migrate_project_metadata(rag.llm_response_cache, rag.project_metadata)
    assert (
        await rag.llm_response_cache.get_by_id(f"project_{project.project_id}")
        is not None
    )


@pytest.mark.asyncio
async def test_project_documents_read_every_page():
    store = SimpleNamespace(
        get_docs_paginated=AsyncMock(
            side_effect=[
                ([(str(index), None) for index in range(200)], 201),
                ([("last", None)], 201),
            ]
        )
    )
    documents, total = await get_project_documents(store, "project")
    assert total == len(documents) == 201
    assert store.get_docs_paginated.await_args.kwargs["page"] == 2


@pytest.mark.asyncio
async def test_project_chunks_and_deletion_are_independent(rag, monkeypatch):
    monkeypatch.setattr(rag, "_process_extract_entities", AsyncMock(return_value=[]))
    monkeypatch.setattr(rag.chunks_vdb, "upsert", AsyncMock())
    for project_id in ("project-a", "project-b"):
        await rag.apipeline_enqueue_documents(
            "shared text", metadata={"project_id": project_id}
        )
    await rag.apipeline_process_enqueue_documents()
    a, _ = await rag.doc_status.get_docs_paginated(project_id="project-a", page_size=10)
    b, _ = await rag.doc_status.get_docs_paginated(project_id="project-b", page_size=10)
    a_chunks, b_chunks = a[0][1].chunks_list, b[0][1].chunks_list
    assert a_chunks and b_chunks and set(a_chunks).isdisjoint(b_chunks)
    result = await rag.adelete_by_doc_id(a[0][0])
    assert result.status == "success"
    assert await rag.text_chunks.get_by_id(b_chunks[0]) is not None


@pytest.mark.asyncio
async def test_entity_search_and_counts_respect_project(rag, client):
    project = await ProjectManager(rag.project_metadata).create("A")
    await rag.apipeline_enqueue_documents(
        "A document", metadata={"project_id": project.project_id}
    )
    docs, _ = await rag.doc_status.get_docs_paginated(
        project_id=project.project_id, page_size=10
    )
    doc_id = docs[0][0]
    record = await rag.doc_status.get_by_id(doc_id)
    await rag.doc_status.upsert({doc_id: {**record, "chunks_list": ["chunk-a"]}})
    for name, source_id in (("A", "chunk-a"), ("B", "chunk-b")):
        await rag.chunk_entity_relation_graph.upsert_node(
            name, {"source_id": source_id, "entity_type": "Other", "project_id": project.project_id if name == "A" else "other"}
        )
    response = await client.get(
        "/entities/search", params={"project_id": project.project_id}
    )
    assert response.status_code == 200
    assert [node["id"] for node in response.json()["entities"]] == ["A"]
    response = await client.get(
        "/entities/stats", params={"project_id": project.project_id}
    )
    assert response.json()["node_count"] == 1
    assert (
        await client.get("/entities/search", params={"project_id": "missing"})
    ).status_code == 404


@pytest.mark.asyncio
async def test_asset_metadata_write_failure_preserves_previous_file(
    tmp_path, monkeypatch
):
    from pathlib import Path

    storage = MultimodalAssetStorage(str(tmp_path))
    await storage.store_asset(b"original", "original.txt")
    before = Path(storage._metadata_path).read_bytes()
    monkeypatch.setattr(
        "lightrag.kg.multimodal_storage.os.replace",
        lambda *_: (_ for _ in ()).throw(OSError("disk full")),
    )
    with pytest.raises(OSError, match="disk full"):
        await storage.store_asset(b"new", "new.txt")
    assert Path(storage._metadata_path).read_bytes() == before


@pytest.mark.asyncio
async def test_multimodal_reimport_preserves_project_chunk_ids(rag, monkeypatch):
    from lightrag.multimodal.parser import ParseResult

    monkeypatch.setattr(rag, "_process_extract_entities", AsyncMock(return_value=[]))
    monkeypatch.setattr(rag.chunks_vdb, "upsert", AsyncMock())
    result = ParseResult(content="shared parsed text")
    for project_id in ("project-a", "project-b", "project-a"):
        await rag._process_multimodal_parse_result(
            result, "example.pdf", "audit-track", metadata={"project_id": project_id}
        )
    a, _ = await rag.doc_status.get_docs_paginated(project_id="project-a", page_size=10)
    b, _ = await rag.doc_status.get_docs_paginated(project_id="project-b", page_size=10)
    assert len(a) == len(b) == 1
    assert a[0][1].chunks_list and set(a[0][1].chunks_list).isdisjoint(
        b[0][1].chunks_list
    )
