"""Chinese semantic output and ontology-before-graph project uploads."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest
import pytest_asyncio
import test_ontology_integrity
from fastapi import FastAPI

from lightrag import operate
from lightrag.kg.shared_storage import get_namespace_data, get_namespace_lock
from lightrag.ontology import OntologyService, OntologySpec, OntologyValidator
from lightrag.projects import ProjectManager

rag = test_ontology_integrity.rag


@pytest_asyncio.fixture
async def client(rag):
    with patch("sys.argv", ["lightrag-server"]):
        from lightrag.api.routers.project_routes import create_project_router
    app = FastAPI()
    app.include_router(create_project_router(rag, None))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as session:
        yield session


def chinese_spec(project_id):
    return OntologySpec(
        "zh",
        project_id,
        "中文本体",
        "",
        "1.0",
        "zh",
        ["文物", "机构", "其他"],
        ["收藏于", "其他"],
    )


@pytest.mark.asyncio
async def test_chinese_ontology_controls_extraction_despite_english_server_default(rag):
    project = await ProjectManager(rag.project_metadata).create("中文项目")
    spec = chinese_spec(project.project_id)
    await OntologyService(rag.project_metadata).create(spec)
    model = AsyncMock(
        return_value="entity<|#|>青铜鼎<|#|>文物<|#|>青铜鼎为馆藏文物。\n<|COMPLETE|>"
    )
    config = rag._get_config_dict()
    assert config["addon_params"]["language"] == "English"
    with patch(
        "lightrag.operate.use_llm_func_with_cache",
        AsyncMock(return_value=(model.return_value, 1)),
    ) as call:
        await operate.extract_entities(
            {"c": {"content": "青铜鼎", "project_id": project.project_id}},
            config,
            project_metadata=rag.project_metadata,
        )
    assert "written in `Chinese`" in call.await_args.kwargs["system_prompt"]
    assert "written in `English`" not in call.await_args.kwargs["system_prompt"]


def test_chinese_fallback_types_are_valid():
    assert OntologyValidator.validate(chinese_spec("p")).is_valid


@pytest.mark.asyncio
async def test_staged_text_is_available_before_ontology_and_only_builds_after_confirmation(
    rag, client, monkeypatch
):
    project = await ProjectManager(rag.project_metadata).create("中文项目")
    extraction = AsyncMock(return_value=[])
    monkeypatch.setattr(rag, "_process_extract_entities", extraction)
    await rag.apipeline_enqueue_documents(
        "青铜鼎收藏于博物馆。",
        metadata={"project_id": project.project_id, "defer_graph": True},
    )
    await rag.apipeline_process_enqueue_documents()
    extraction.assert_not_awaited()
    docs, _ = await rag.doc_status.get_docs_paginated(project_id=project.project_id)
    doc_id, status = docs[0]
    assert status.status.value == "preprocessed" and status.chunks_list
    assert await rag.full_docs.get_by_id(doc_id)
    assert await rag.chunk_entity_relation_graph.get_all_nodes() == []
    response = await client.post(
        f"/projects/{project.project_id}/build-graph",
        json={"ontology_id": "missing", "ontology_version": "1.0"},
    )
    assert response.status_code == 409
    spec = chinese_spec(project.project_id)
    await OntologyService(rag.project_metadata).create(spec)
    response = await client.post(
        f"/projects/{project.project_id}/build-graph",
        json={"ontology_id": "zh", "ontology_version": "stale"},
    )
    assert response.status_code == 409
    response = await client.post(
        f"/projects/{project.project_id}/build-graph",
        json={"ontology_id": "zh", "ontology_version": "1.0"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["built_documents"] == 1
    extraction.assert_awaited_once()
    assert (await rag.doc_status.get_by_id(doc_id))["status"] == "processed"


@pytest.mark.asyncio
async def test_build_rejects_busy_pipeline_and_releases_busy_after_validation(
    rag, client
):
    status = await get_namespace_data("pipeline_status", workspace=rag.workspace)
    lock = get_namespace_lock("pipeline_status", workspace=rag.workspace)
    async with lock:
        status["busy"] = True
    try:
        response = await client.post(
            "/projects/missing/build-graph",
            json={"ontology_id": "zh", "ontology_version": "1.0"},
        )
        assert response.status_code == 409
        assert status["busy"] is True
    finally:
        async with lock:
            status["busy"] = False
    response = await client.post(
        "/projects/missing/build-graph",
        json={"ontology_id": "zh", "ontology_version": "1.0"},
    )
    assert response.status_code == 404
    assert status["busy"] is False


@pytest.mark.asyncio
async def test_missing_chunk_prevents_partial_success(rag, client, monkeypatch):
    project = await ProjectManager(rag.project_metadata).create("中文项目")
    await rag.apipeline_enqueue_documents(
        "青铜鼎收藏于博物馆。",
        metadata={"project_id": project.project_id, "defer_graph": True},
    )
    await rag.apipeline_process_enqueue_documents()
    documents, _ = await rag.doc_status.get_docs_paginated(
        project_id=project.project_id
    )
    doc_id, doc = documents[0]
    record = await rag.doc_status.get_by_id(doc_id)
    await rag.doc_status.upsert(
        {
            doc_id: {
                **record,
                "chunks_list": [*doc.chunks_list, "missing-chunk"],
                "chunks_count": len(doc.chunks_list) + 1,
            }
        }
    )
    spec = chinese_spec(project.project_id)
    await OntologyService(rag.project_metadata).create(spec)
    extract = AsyncMock()
    monkeypatch.setattr(rag, "_process_extract_entities", extract)
    response = await client.post(
        f"/projects/{project.project_id}/build-graph",
        json={"ontology_id": "zh", "ontology_version": "1.0"},
    )
    assert response.status_code == 409
    extract.assert_not_awaited()
    assert (await rag.doc_status.get_by_id(doc_id))["status"] == "preprocessed"


@pytest.mark.asyncio
async def test_build_resumes_parsing_requested_while_busy(rag, client, monkeypatch):
    status = await get_namespace_data("pipeline_status", workspace=rag.workspace)
    status["request_pending"] = True
    resume = AsyncMock()
    monkeypatch.setattr(rag, "apipeline_process_enqueue_documents", resume)
    response = await client.post(
        "/projects/missing/build-graph",
        json={"ontology_id": "zh", "ontology_version": "1.0"},
    )
    assert response.status_code == 404
    resume.assert_awaited_once()
    assert status["busy"] is False
