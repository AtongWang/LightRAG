"""Project-scoped file generation and editable project metadata."""

import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest
import pytest_asyncio
import test_ontology_integrity
from fastapi import FastAPI

from lightrag.projects import ProjectManager

rag = test_ontology_integrity.rag


@pytest_asyncio.fixture
async def client(rag):
    with patch("sys.argv", ["lightrag-server"]):
        from lightrag.api.routers.ontology_routes import create_ontology_router
        from lightrag.api.routers.project_routes import create_project_router
    app = FastAPI()
    app.include_router(create_ontology_router(rag, None))
    app.include_router(create_project_router(rag, None))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as session:
        yield session


async def upload_text(rag, project_id, content, filename):
    await rag.apipeline_enqueue_documents(
        content, file_paths=filename, metadata={"project_id": project_id}
    )
    docs, _ = await rag.doc_status.get_docs_paginated(project_id=project_id)
    record_id = next(doc_id for doc_id, record in docs if record.file_path == filename)
    await rag.full_docs.upsert({record_id: {"content": content, "file_path": filename}})
    return record_id


@pytest.mark.asyncio
async def test_ontology_uses_selected_document_body_without_requiring_typed_material(
    rag, client, monkeypatch
):
    project = await ProjectManager(rag.project_metadata).create("Heritage")
    selected = await upload_text(
        rag, project.project_id, "UNIQUE_BRONZE_BODY " * 5000, "bronze.txt"
    )
    await upload_text(
        rag, project.project_id, "UNSELECTED_PRIVATE_MATERIAL", "other.txt"
    )
    model = AsyncMock(
        return_value=json.dumps(
            {
                "name": "Heritage",
                "entity_types": ["Artifact", "Other"],
                "relation_types": ["Other"],
            }
        )
    )
    monkeypatch.setattr(rag, "llm_model_func", model)
    response = await client.post(
        "/ontology/generate",
        json={"project_id": project.project_id, "document_ids": [selected]},
    )
    assert response.status_code == 200, response.text
    prompt = model.await_args.args[0]
    assert "UNIQUE_BRONZE_BODY" in prompt and "bronze.txt" in prompt
    assert "UNSELECTED_PRIVATE_MATERIAL" not in prompt
    assert len(prompt) < 45000
    assert response.json()["material_summary"]["sampled"] is True


@pytest.mark.asyncio
async def test_wrong_project_file_and_missing_parse_never_reach_model(
    rag, client, monkeypatch
):
    a = await ProjectManager(rag.project_metadata).create("A")
    b = await ProjectManager(rag.project_metadata).create("B")
    foreign = await upload_text(rag, b.project_id, "PRIVATE", "b.txt")
    own = await upload_text(rag, a.project_id, "Not parsed yet", "a.txt")
    await rag.full_docs.delete([own])
    model = AsyncMock()
    monkeypatch.setattr(rag, "llm_model_func", model)
    for path in (
        "/ontology/generate",
        f"/projects/{a.project_id}/generate-description",
    ):
        response = await client.post(
            path, json={"project_id": a.project_id, "document_ids": [foreign]}
        )
        assert response.status_code == 404, response.text
        response = await client.post(
            path, json={"project_id": a.project_id, "document_ids": [own]}
        )
        assert response.status_code == 422, response.text
    model.assert_not_awaited()


@pytest.mark.asyncio
async def test_description_uses_existing_files_and_stays_unsaved_until_update(
    rag, client, monkeypatch
):
    project = await ProjectManager(rag.project_metadata).create(
        "Original", description="Original description"
    )
    await upload_text(rag, project.project_id, "BRONZE_ARCHAEOLOGY body", "first.txt")
    await upload_text(rag, project.project_id, "MUSEUM_COLLECTION body", "second.txt")
    model = AsyncMock(return_value="这是一个研究青铜器考古与博物馆收藏的资料项目。")
    monkeypatch.setattr(rag, "llm_model_func", model)
    response = await client.post(
        f"/projects/{project.project_id}/generate-description", json={}
    )
    assert response.status_code == 200, response.text
    assert (
        "BRONZE_ARCHAEOLOGY" in model.await_args.args[0]
        and "MUSEUM_COLLECTION" in model.await_args.args[0]
    )
    assert response.json()["material_summary"]["used_files"] == 2
    assert (
        await ProjectManager(rag.project_metadata).get(project.project_id)
    ).description == "Original description"
    updated = await client.put(
        f"/projects/{project.project_id}",
        json={
            "name": "Reviewed name",
            "description": response.json()["description"],
            "tags": ["bronze"],
            "cover_image": "cover.png",
        },
    )
    assert updated.status_code == 200
    record = await ProjectManager(rag.project_metadata).get(project.project_id)
    assert (
        record.name == "Reviewed name"
        and record.tags == ["bronze"]
        and record.cover_image == "cover.png"
    )
    assert (
        record.project_id == project.project_id
        and record.workspace == project.workspace
    )


@pytest.mark.asyncio
async def test_description_without_files_does_not_hallucinate(rag, client, monkeypatch):
    project = await ProjectManager(rag.project_metadata).create("Empty")
    model = AsyncMock()
    monkeypatch.setattr(rag, "llm_model_func", model)
    response = await client.post(
        f"/projects/{project.project_id}/generate-description", json={}
    )
    assert response.status_code == 422, response.text
    model.assert_not_awaited()
