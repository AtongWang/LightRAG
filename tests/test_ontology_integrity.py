"""Semantic regressions using real extraction, stores and query contexts."""

import asyncio
import json
from unittest.mock import AsyncMock, patch

import httpx
import numpy as np
import pytest
import pytest_asyncio
from fastapi import FastAPI

from lightrag import LightRAG, operate
from lightrag.base import QueryParam
from lightrag.ontology import OntologyService, OntologySpec, OntologyValidator
from lightrag.projects import ProjectManager
from lightrag.utils import EmbeddingFunc


async def model(prompt, system_prompt=None, **kwargs):
    if kwargs.get("keyword_extraction"):
        return json.dumps(
            {"high_level_keywords": ["collection"], "low_level_keywords": ["Vessel"]}
        )
    if "---Data to be Processed---" not in prompt:
        return "<|COMPLETE|>"
    marker = "CATALOG_A" if "CATALOG_A" in prompt else "CATALOG_B"
    return "\n".join(
        [
            f"entity<|#|>Vessel<|#|>Artifact<|#|>{marker} vessel.",
            f"entity<|#|>Museum<|#|>Organization<|#|>{marker} museum.",
            f"relation<|#|>Vessel<|#|>Museum<|#|>located_in<|#|>collection<|#|>{marker} displayed in museum.",
            f"relation<|#|>Vessel<|#|>Museum<|#|>owned_by<|#|>ownership<|#|>{marker} owned by museum.",
            f"relation<|#|>Museum<|#|>Vessel<|#|>owns<|#|>ownership<|#|>{marker} museum owns vessel.",
            "<|COMPLETE|>",
        ]
    )


@pytest_asyncio.fixture
async def rag(tmp_path):
    async def embed(texts):
        return np.tile([1.0, 0.0, 0.0, 0.0], (len(texts), 1))

    instance = LightRAG(
        working_dir=str(tmp_path),
        workspace=tmp_path.name,
        llm_model_func=model,
        embedding_func=EmbeddingFunc(embedding_dim=4, max_token_size=8192, func=embed),
        multimodal_enabled=False,
        entity_extract_max_gleaning=0,
        enable_llm_cache=True,
        enable_llm_cache_for_entity_extract=True,
        addon_params={"language": "English"},
        vector_db_storage_cls_kwargs={"cosine_better_than_threshold": 0.1},
    )
    await instance.initialize_storages()
    yield instance
    await instance.finalize_storages()


async def insert(rag, project, marker):
    await rag.apipeline_enqueue_documents(
        marker,
        file_paths=f"{marker}.txt",
        metadata={"project_id": project.project_id},
    )
    await rag.apipeline_process_enqueue_documents()


@pytest.mark.asyncio
async def test_namesakes_are_isolated_and_query_keeps_display_names(rag):
    manager = ProjectManager(rag.project_metadata)
    a = await manager.create("A")
    b = await manager.create("B")
    await insert(rag, a, "CATALOG_A")
    await insert(rag, b, "CATALOG_B")
    nodes = await rag.chunk_entity_relation_graph.get_all_nodes()
    vessels = [n for n in nodes if n.get("display_name") == "Vessel"]
    assert len(vessels) == 2
    assert vessels[0]["id"] != vessels[1]["id"]
    assert all(
        not ("CATALOG_A" in n["description"] and "CATALOG_B" in n["description"])
        for n in nodes
    )
    docs, _ = await rag.doc_status.get_docs_paginated(project_id=a.project_id)
    chunk_ids = docs[0][1].chunks_list
    answer = await rag.aquery_data(
        "Vessel collection",
        QueryParam(mode="mix", chunk_ids=chunk_ids, enable_rerank=False),
    )
    assert answer["data"]["entities"]
    assert "CATALOG_B" not in json.dumps(answer)
    assert "Vessel" in json.dumps(answer)
    await rag.adelete_by_entity(vessels[0]["id"])
    assert await rag.chunk_entity_relation_graph.has_node(vessels[1]["id"])


@pytest.mark.asyncio
async def test_typed_directions_survive_merge_context_and_document_deletion(rag):
    await rag.ainsert("CATALOG_A", ids="doc-a")
    await rag.ainsert("CATALOG_B", ids="doc-b")
    edge = await rag.chunk_entity_relation_graph.get_edge("Museum", "Vessel")
    facts = json.loads(edge["relation_facts"])
    assert {(f["src_id"], f["tgt_id"], f["relation_type"]) for f in facts} == {
        ("Vessel", "Museum", "located_in"),
        ("Vessel", "Museum", "owned_by"),
        ("Museum", "Vessel", "owns"),
    }
    assert len(facts) == 6
    context = await rag.aquery_llm(
        "Vessel collection",
        QueryParam(mode="mix", only_need_context=True, enable_rerank=False),
    )
    assert "owned_by" in context["llm_response"]["content"]
    assert "owns" in context["llm_response"]["content"]
    await rag.adelete_by_doc_id("doc-a")
    edge = await rag.chunk_entity_relation_graph.get_edge("Museum", "Vessel")
    facts = json.loads(edge["relation_facts"])
    assert len(facts) == 3
    assert all("CATALOG_A" not in f["description"] for f in facts)
    assert len(edge["relation_type"].split("<SEP>")) == 3


@pytest.mark.asyncio
async def test_cached_rebuild_preserves_project_namespace(rag):
    project = await ProjectManager(rag.project_metadata).create("Scoped")
    await insert(rag, project, "CATALOG_A")
    await insert(rag, project, "CATALOG_B")
    docs, _ = await rag.doc_status.get_docs_paginated(project_id=project.project_id)
    await rag.adelete_by_doc_id(docs[0][0])
    nodes = await rag.chunk_entity_relation_graph.get_all_nodes()
    assert len(nodes) == 2
    assert all(n.get("project_id") == project.project_id for n in nodes)
    edge = (await rag.chunk_entity_relation_graph.get_all_edges())[0]
    assert len(json.loads(edge["relation_facts"])) == 3


@pytest.mark.asyncio
@pytest.mark.parametrize("failure", [None, RuntimeError("metadata unavailable")])
async def test_configured_ontology_cannot_silently_fallback(rag, failure):
    config = rag._get_config_dict()
    config["addon_params"] = {"language": "English", "ontology_id": "missing"}
    getter = (
        AsyncMock(return_value=None)
        if failure is None
        else AsyncMock(side_effect=failure)
    )
    with (
        patch("lightrag.operate.OntologyService.get", getter),
        pytest.raises((ValueError, RuntimeError), match="ontology|Ontology|metadata"),
    ):
        await operate.extract_entities(
            {"chunk-a": {"content": "CATALOG_A"}},
            config,
            project_metadata=rag.project_metadata,
        )


@pytest.mark.asyncio
async def test_attachment_nodes_are_explicit_system_records(rag):
    spec = OntologySpec(
        "audit",
        "p",
        "Audit",
        "",
        "1.0",
        "en",
        ["Artifact", "Organization", "Other"],
        ["located_in", "Other"],
    )
    config = rag._get_config_dict()
    config["addon_params"] = {"language": "English", "ontology_id": "audit"}
    with patch("lightrag.operate.OntologyService.get", AsyncMock(return_value=spec)):
        result = await operate.extract_entities(
            {
                "chunk-a": {
                    "content": "CATALOG_A",
                    "is_multimodal": True,
                    "modal_type": "image",
                    "asset_id": "asset",
                }
            },
            config,
            project_metadata=rag.project_metadata,
        )
    nodes, edges = result[0]
    attachments = [
        r for entries in nodes.values() for r in entries if r.get("is_multimodal")
    ]
    assert attachments and all(r.get("is_system") is True for r in attachments)
    system_edges = [
        r for entries in edges.values() for r in entries if r.get("is_system")
    ]
    assert system_edges and all(
        r["relation_type"] == "has_attachment" for r in system_edges
    )


@pytest.mark.asyncio
async def test_delete_ontology_detaches_project(rag):
    manager = ProjectManager(rag.project_metadata)
    project = await manager.create("Ontology")
    await manager.get(project.project_id)
    spec = OntologySpec(
        "audit", project.project_id, "Audit", "", "1.0", "en", ["Other"], ["Other"]
    )
    await OntologyService(rag.project_metadata).create(spec)
    await ProjectManager(rag.project_metadata).set_ontology_id(
        project.project_id, spec.ontology_id
    )
    with patch("sys.argv", ["lightrag-server"]):
        from lightrag.api.routers.ontology_routes import create_ontology_router
    app = FastAPI()
    app.include_router(create_ontology_router(rag, None))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.delete("/ontology/audit")
    assert response.status_code == 200
    assert (await manager.get(project.project_id)).ontology_id is None


@pytest.mark.asyncio
async def test_concurrent_ontology_creation_leaves_one_consistent_definition(rag):
    project = await ProjectManager(rag.project_metadata).create("Concurrent")
    specs = [
        OntologySpec(
            f"ont-{i}",
            project.project_id,
            "Audit",
            "",
            "1.0",
            "en",
            ["Other"],
            ["Other"],
        )
        for i in range(2)
    ]
    results = await asyncio.gather(
        *(OntologyService(rag.project_metadata).create(s) for s in specs),
        return_exceptions=True,
    )
    assert sum(not isinstance(r, Exception) for r in results) == 1
    current = await OntologyService(rag.project_metadata).get_by_project(
        project.project_id
    )
    assert (
        await ProjectManager(rag.project_metadata).get(project.project_id)
    ).ontology_id == current.ontology_id


def test_ontology_rejects_unknown_endpoint_types():
    spec = OntologySpec(
        "audit",
        "p",
        "Audit",
        "",
        "1.0",
        "en",
        ["Artifact", "Other"],
        ["located_in", "Other"],
    )
    spec.relation_constraints = {
        "located_in": {"source_types": ["Artifact"], "target_types": ["Missing"]}
    }
    assert not OntologyValidator.validate(spec).is_valid


@pytest.mark.parametrize(
    "field,value",
    [
        ("entity_types", ["Artifact", "arti fact", "Other"]),
        ("relation_types", ["held_by", "heldby", "Other"]),
        ("version", "not-a-version"),
    ],
)
def test_ontology_rejects_ambiguous_types_and_invalid_versions(field, value):
    spec = OntologySpec(
        "audit",
        "p",
        "Audit",
        "",
        "1.0",
        "en",
        ["Artifact", "Other"],
        ["held_by", "Other"],
    )
    setattr(spec, field, value)
    assert not OntologyValidator.validate(spec).is_valid


@pytest.mark.asyncio
async def test_gleaning_does_not_replace_other_predicates(rag):
    config = rag._get_config_dict()
    config["entity_extract_max_gleaning"] = 1
    initial = await model("---Data to be Processed---CATALOG_A")
    glean = "relation<|#|>Vessel<|#|>Museum<|#|>owned_by<|#|>ownership<|#|>A substantially longer ownership description.\n<|COMPLETE|>"
    with patch(
        "lightrag.operate.use_llm_func_with_cache",
        AsyncMock(side_effect=[(initial, 1), (glean, 2)]),
    ):
        result = await operate.extract_entities({"c": {"content": "CATALOG_A"}}, config)
    _, edges = result[0]
    assert {entry["relation_type"] for entry in edges[("Vessel", "Museum")]} == {
        "located_in",
        "owned_by",
    }


@pytest.mark.asyncio
async def test_cached_snapshot_retains_constraints_after_cache_clear(rag):
    project = await ProjectManager(rag.project_metadata).create("Constrained")
    spec = OntologySpec(
        "audit",
        project.project_id,
        "Audit",
        "",
        "1.0",
        "en",
        ["Artifact", "Organization", "Other"],
        ["located_in", "Other"],
        relation_constraints={
            "located_in": {
                "source_types": ["Artifact"],
                "target_types": ["Organization"],
            }
        },
    )
    await OntologyService(rag.project_metadata).create(spec)
    await insert(rag, project, "CATALOG_A")
    await insert(rag, project, "CATALOG_B")
    docs, _ = await rag.doc_status.get_docs_paginated(project_id=project.project_id)
    await rag.aclear_cache()
    await rag.adelete_by_doc_id(docs[0][0])
    edge = (await rag.chunk_entity_relation_graph.get_all_edges())[0]
    assert {f["relation_type"] for f in json.loads(edge["relation_facts"])} == {
        "located_in"
    }
    nodes = await rag.chunk_entity_relation_graph.get_all_nodes()
    assert {n["entity_type"] for n in nodes} == {"Artifact", "Organization"}


@pytest.mark.asyncio
async def test_graph_api_exposes_typed_directions_and_warns_about_legacy(rag):
    project = await ProjectManager(rag.project_metadata).create("Graph")
    await insert(rag, project, "CATALOG_A")
    docs, _ = await rag.doc_status.get_docs_paginated(project_id=project.project_id)
    await rag.chunk_entity_relation_graph.upsert_node(
        "Legacy",
        {
            "source_id": docs[0][1].chunks_list[0],
            "description": "mixed old descriptions",
        },
    )
    with patch("sys.argv", ["lightrag-server"]):
        from lightrag.api.routers.graph_routes import create_graph_routes
    app = FastAPI()
    app.include_router(create_graph_routes(rag))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get(f"/graphs/project/{project.project_id}")
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["rebuild_required"] is True
        assert len(data["nodes"]) == 2 and len(data["edges"]) == 3
        assert {e["relation_type"] for e in data["edges"]} == {
            "located_in",
            "owned_by",
            "owns",
        }
        assert all(e["direction_known"] for e in data["edges"])
        response = await client.get("/graphs", params={"label": "*"})
        assert response.status_code == 200, response.text
        assert len(response.json()["edges"]) == 3


@pytest.mark.asyncio
async def test_endpoint_constraint_rejects_reversed_predicate(rag):
    config = rag._get_config_dict()
    config["addon_params"] = {"language": "English", "ontology_id": "audit"}
    spec = OntologySpec(
        "audit",
        "p",
        "Audit",
        "",
        "1.0",
        "en",
        ["Artifact", "Organization", "Other"],
        ["located_in", "Other"],
        relation_constraints={
            "located_in": {
                "source_types": ["Artifact"],
                "target_types": ["Organization"],
            }
        },
    )
    output = await model("---Data to be Processed---CATALOG_A")
    output = output.replace(
        "Museum<|#|>Vessel<|#|>owns", "Museum<|#|>Vessel<|#|>located_in"
    )
    with (
        patch("lightrag.operate.OntologyService.get", AsyncMock(return_value=spec)),
        patch(
            "lightrag.operate.use_llm_func_with_cache",
            AsyncMock(return_value=(output, 1)),
        ),
    ):
        result = await operate.extract_entities(
            {"c": {"content": "catalog"}},
            config,
            project_metadata=rag.project_metadata,
        )
    assert set(result[0][1]) == {("Vessel", "Museum")}


@pytest.mark.asyncio
async def test_project_entity_cannot_be_renamed_outside_its_namespace(rag):
    project = await ProjectManager(rag.project_metadata).create("Scoped")
    await insert(rag, project, "CATALOG_A")
    node = (await rag.chunk_entity_relation_graph.get_all_nodes())[0]
    with pytest.raises(ValueError, match="immutable|namespace"):
        await rag.aedit_entity(
            node["id"], {"entity_name": "Unscoped"}, allow_rename=True
        )
    assert await rag.chunk_entity_relation_graph.has_node(node["id"])


@pytest.mark.asyncio
async def test_ontology_api_roundtrips_constraints_and_rejects_invalid_definition(rag):
    project = await ProjectManager(rag.project_metadata).create("API")
    with patch("sys.argv", ["lightrag-server"]):
        from lightrag.api.routers.ontology_routes import create_ontology_router
    app = FastAPI()
    app.include_router(create_ontology_router(rag, None))
    spec = {
        "project_id": project.project_id,
        "name": "Audit",
        "entity_types": ["Artifact", "Organization", "Other"],
        "relation_types": ["located_in", "Other"],
        "relation_constraints": {
            "located_in": {
                "source_types": ["Artifact"],
                "target_types": ["Organization"],
            }
        },
    }
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/ontology/create", json=spec)
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["relation_constraints"] == spec["relation_constraints"]
        exported = await client.get(f"/ontology/{data['ontology_id']}/export")
        assert exported.json()["relation_constraints"] == spec["relation_constraints"]
        response = await client.put(
            f"/ontology/{data['ontology_id']}",
            json={"name": "Updated", "version": data["version"]},
        )
        assert response.status_code == 200, response.text
        response = await client.put(
            f"/ontology/{data['ontology_id']}",
            json={"name": "Stale", "version": data["version"]},
        )
        assert response.status_code == 409, response.text
        response = await client.put(
            f"/ontology/{data['ontology_id']}",
            json={"entity_types": ["Artifact", "Other"]},
        )
        assert response.status_code == 400, response.text


@pytest.mark.asyncio
async def test_rename_updates_assertions_and_later_deletion_rebuild(rag):
    await rag.ainsert("CATALOG_A", ids="doc-a")
    await rag.ainsert("CATALOG_B", ids="doc-b")
    await rag.aedit_entity("Vessel", {"entity_name": "Renamed"}, allow_rename=True)
    edge = await rag.chunk_entity_relation_graph.get_edge("Museum", "Renamed")
    facts = json.loads(edge["relation_facts"])
    assert all("Vessel" not in (f["src_id"], f["tgt_id"]) for f in facts)
    await rag.adelete_by_doc_id("doc-a")
    edge = await rag.chunk_entity_relation_graph.get_edge("Museum", "Renamed")
    assert len(json.loads(edge["relation_facts"])) == 3
    assert "CATALOG_A" not in edge["description"]


@pytest.mark.asyncio
async def test_merge_updates_assertions_and_rebuild_indices(rag):
    await rag.ainsert("CATALOG_A", ids="doc-a")
    await rag.ainsert("CATALOG_B", ids="doc-b")
    await rag.amerge_entities(["Vessel"], "Merged")
    edge = await rag.chunk_entity_relation_graph.get_edge("Museum", "Merged")
    assert all(
        "Vessel" not in (f["src_id"], f["tgt_id"])
        for f in json.loads(edge["relation_facts"])
    )
    await rag.adelete_by_doc_id("doc-a")
    edge = await rag.chunk_entity_relation_graph.get_edge("Museum", "Merged")
    assert len(json.loads(edge["relation_facts"])) == 3
    assert "CATALOG_A" not in edge["description"]


@pytest.mark.asyncio
async def test_merge_cannot_cross_project_namespaces(rag):
    a = await ProjectManager(rag.project_metadata).create("A")
    b = await ProjectManager(rag.project_metadata).create("B")
    await insert(rag, a, "CATALOG_A")
    await insert(rag, b, "CATALOG_B")
    nodes = await rag.chunk_entity_relation_graph.get_all_nodes()
    source = next(n["id"] for n in nodes if n["project_id"] == a.project_id)
    target = next(n["id"] for n in nodes if n["project_id"] == b.project_id)
    with pytest.raises(ValueError, match="namespace"):
        await rag.amerge_entities([source], target)


@pytest.mark.asyncio
@pytest.mark.parametrize("operation", ["delete", "update"])
async def test_project_mutations_serialize_with_ontology_creation(
    rag, monkeypatch, operation
):
    manager = ProjectManager(rag.project_metadata)
    project = await manager.create("Original")
    captured, resume = asyncio.Event(), asyncio.Event()
    original_get = rag.project_metadata.get_by_id

    async def controlled_get(key):
        record = await original_get(key)
        if key == f"project_{project.project_id}" and not captured.is_set():
            captured.set()
            await resume.wait()
        return record

    monkeypatch.setattr(rag.project_metadata, "get_by_id", controlled_get)
    spec = OntologySpec(
        "race", project.project_id, "Audit", "", "1.0", "en", ["Other"], ["Other"]
    )
    create_task = asyncio.create_task(
        OntologyService(rag.project_metadata).create(spec)
    )
    await captured.wait()
    mutate_task = asyncio.create_task(
        manager.delete(project.project_id)
        if operation == "delete"
        else manager.update(project.project_id, name="Updated")
    )
    await asyncio.sleep(0.01)
    resume.set()
    await asyncio.wait_for(asyncio.gather(create_task, mutate_task), timeout=5)
    saved = await manager.get(project.project_id)
    if operation == "delete":
        assert saved is None
        assert await OntologyService(rag.project_metadata).get("race") is None
    else:
        assert saved.name == "Updated"
        assert saved.ontology_id == "race"
