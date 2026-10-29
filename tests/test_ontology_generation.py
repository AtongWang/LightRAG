"""Draft validation and generated definitions must not mutate stored ontology."""

import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest
import pytest_asyncio
import test_ontology_integrity
from fastapi import FastAPI

from lightrag.ontology import OntologyService, OntologySpec
from lightrag.projects import ProjectManager

rag = test_ontology_integrity.rag


@pytest_asyncio.fixture
async def client(rag):
    with patch("sys.argv", ["lightrag-server"]):
        from lightrag.api.routers.ontology_routes import create_ontology_router
    app = FastAPI()
    app.include_router(create_ontology_router(rag, None))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as session:
        yield session


def definition(project_id):
    return {
        "project_id": project_id,
        "name": "Heritage",
        "description": "Museum collections",
        "language": "zh",
        "entity_types": ["Artifact", "Organization", "Other"],
        "relation_types": ["held_by", "Other"],
        "relation_constraints": {
            "held_by": {"source_types": ["Artifact"], "target_types": ["Organization"]}
        },
    }


@pytest.mark.asyncio
async def test_validate_working_copy_instead_of_saved_definition(rag, client):
    project = await ProjectManager(rag.project_metadata).create("Heritage")
    saved = await OntologyService(rag.project_metadata).create(
        OntologySpec(
            ontology_id="saved", version="1.0", **definition(project.project_id)
        )
    )
    draft = {**saved.to_dict(), "entity_types": ["Other", "Other"]}
    response = await client.post("/ontology/validate", json=draft)
    assert response.status_code == 200, response.text
    assert response.json()["is_valid"] is False
    valid = await client.get("/ontology/saved/validate")
    assert valid.json()["is_valid"] is True
    assert (
        await OntologyService(rag.project_metadata).get("saved")
    ).entity_types == saved.entity_types


@pytest.mark.asyncio
@pytest.mark.parametrize("has_saved", [False, True])
async def test_generation_returns_valid_draft_without_persisting(
    rag, client, monkeypatch, has_saved
):
    project = await ProjectManager(rag.project_metadata).create(
        "Heritage", description="Bronze vessels"
    )
    if has_saved:
        original = {**definition(project.project_id), "name": "Original definition"}
        await OntologyService(rag.project_metadata).create(
            OntologySpec(ontology_id="saved", version="1.0", **original)
        )
    output = definition("untrusted-project")
    model = AsyncMock(return_value="```json\n" + json.dumps(output) + "\n```")
    monkeypatch.setattr(rag, "llm_model_func", model)
    response = await client.post(
        "/ontology/generate",
        json={
            "project_id": project.project_id,
            "requirements": "Model museum ownership and include source/target types.",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["project_id"] == project.project_id
    assert data["relation_constraints"] == output["relation_constraints"]
    stored = await OntologyService(rag.project_metadata).get_by_project(
        project.project_id
    )
    if has_saved:
        assert stored.name == "Original definition" and stored.version == "1.0"
    else:
        assert stored is None
    assert (
        await ProjectManager(rag.project_metadata).get(project.project_id)
    ).ontology_id == ("saved" if has_saved else None)
    assert "Bronze vessels" in model.await_args.args[0]
    assert "Model museum ownership" in model.await_args.args[0]
    assert "max_tokens" not in model.await_args.kwargs
    assert "max_completion_tokens" not in model.await_args.kwargs


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "result", ["not json", '{"entity_types": []}', "__provider_error__"]
)
async def test_bad_generation_is_rejected_without_replacing_existing(
    rag, client, monkeypatch, result
):
    project = await ProjectManager(rag.project_metadata).create("Heritage")
    await OntologyService(rag.project_metadata).create(
        OntologySpec(
            ontology_id="saved", version="1.0", **definition(project.project_id)
        )
    )
    model = AsyncMock(
        side_effect=RuntimeError("private credential")
        if result == "__provider_error__"
        else None,
        return_value=result,
    )
    monkeypatch.setattr(rag, "llm_model_func", model)
    response = await client.post(
        "/ontology/generate",
        json={"project_id": project.project_id, "requirements": "Museum"},
    )
    assert response.status_code == 502, response.text
    assert "private credential" not in response.text
    assert (await OntologyService(rag.project_metadata).get("saved")).version == "1.0"


@pytest.mark.asyncio
async def test_missing_project_and_empty_requirements_do_not_call_llm(
    rag, client, monkeypatch
):
    model = AsyncMock()
    monkeypatch.setattr(rag, "llm_model_func", model)
    response = await client.post(
        "/ontology/generate", json={"project_id": "missing", "requirements": "Museum"}
    )
    assert response.status_code == 404
    response = await client.post(
        "/ontology/generate", json={"project_id": "missing", "requirements": "   "}
    )
    assert response.status_code == 422
    model.assert_not_awaited()
