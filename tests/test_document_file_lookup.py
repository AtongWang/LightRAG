"""Document lookup accepts serialized paths, including renamed queued files."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import FastAPI


@pytest.mark.asyncio
@pytest.mark.parametrize("endpoint", ["view", "download", "preview"])
@pytest.mark.parametrize("exists", [True, False])
@pytest.mark.parametrize("scoped", [True, False])
async def test_queued_file_lookup(tmp_path, endpoint, exists, scoped):
    with patch("sys.argv", ["lightrag-server"]):
        from lightrag.api.routers.document_routes import (
            DocumentManager,
            create_document_routes,
        )
    manager = DocumentManager(str(tmp_path / "inputs"), workspace="")
    queued = manager.input_dir / "__enqueued__"
    queued.mkdir(parents=True, exist_ok=True)
    if scoped:
        (queued / "sample.txt").write_text("unrelated global file", encoding="utf-8")
        queued /= "project-a"
        queued.mkdir()
    (queued / "sample_other.txt").write_text("unrelated prefix file", encoding="utf-8")
    if exists:
        (queued / "sample_123.txt").write_text("parsed material", encoding="utf-8")
    from types import SimpleNamespace

    rag = SimpleNamespace(
        doc_status=SimpleNamespace(
            get_by_id=AsyncMock(
                return_value={
                    "file_path": "project-a/sample.txt" if scoped else "sample.txt",
                    "status": "preprocessed",
                    "metadata": {},
                }
            )
        )
    )
    app = FastAPI()
    app.include_router(create_document_routes(rag, manager, None))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get(f"/documents/{endpoint}/doc-test")
    assert response.status_code == (200 if exists else 404), response.text
    if exists:
        assert "parsed material" in response.text
