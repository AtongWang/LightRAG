"""One upload must not close another upload's HTTP connector."""

import asyncio
from unittest.mock import AsyncMock, patch

import httpx
import pytest
import test_ontology_integrity
from aiohttp import web
from fastapi import FastAPI

from lightrag.parsers.mineru_api import MineruAPIParser
from lightrag.parsers.mineru_cloud import MineruCloudParser
from lightrag.projects import ProjectManager

rag = test_ontology_integrity.rag


@pytest.mark.asyncio
@pytest.mark.parametrize("parser_class", [MineruAPIParser, MineruCloudParser])
async def test_concurrent_parses_do_not_close_each_others_connectors(
    tmp_path, monkeypatch, parser_class
):
    started, release = asyncio.Event(), asyncio.Event()

    async def slow_response(request):
        started.set()
        await release.wait()
        return web.json_response({"text": "slow parsed"})

    app = web.Application()
    app.router.add_get("/slow", slow_response)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    url = f"http://127.0.0.1:{site._server.sockets[0].getsockname()[1]}/slow"
    parser = parser_class()
    sessions = []

    async def upload_and_parse(session, file_path, **kwargs):
        sessions.append(session)
        if file_path.stem == "fast":
            await started.wait()
            text = "fast parsed"
        else:
            async with session.get(url) as response:
                text = (await response.json())["text"]
        return [{"type": "text", "text": text}], {"markdown": text}

    monkeypatch.setattr(parser, "_upload_and_parse", upload_and_parse)
    for name in ("fast", "slow"):
        (tmp_path / f"{name}.pdf").write_bytes(b"%PDF-1.7\nfixture")
    fast = asyncio.create_task(
        parser.parse_document(
            str(tmp_path / "fast.pdf"), output_dir=str(tmp_path / "parsed")
        )
    )
    slow = asyncio.create_task(
        parser.parse_document(
            str(tmp_path / "slow.pdf"), output_dir=str(tmp_path / "parsed")
        )
    )
    fast.add_done_callback(lambda _: release.set())
    try:
        results = await asyncio.wait_for(
            asyncio.gather(fast, slow, return_exceptions=True), timeout=5
        )
        assert not any(isinstance(result, BaseException) for result in results), results
        assert [result.markdown for result in results] == ["fast parsed", "slow parsed"]
        assert len({id(session) for session in sessions}) == 2
        assert all(session.closed for session in sessions)
    finally:
        release.set()
        for task in (fast, slow):
            if not task.done():
                task.cancel()
        await asyncio.gather(fast, slow, return_exceptions=True)
        await runner.cleanup()


@pytest.mark.asyncio
@pytest.mark.parametrize("parser_class", [MineruAPIParser, MineruCloudParser])
async def test_cancelling_one_parse_leaves_the_other_session_open(
    tmp_path, monkeypatch, parser_class
):
    started, cancelled = asyncio.Event(), asyncio.Event()
    sessions = {}
    parser = parser_class()

    async def upload_and_parse(session, file_path, **kwargs):
        sessions[file_path.stem] = session
        if file_path.stem == "cancel":
            started.set()
            await asyncio.Future()
        else:
            await cancelled.wait()
            assert not session.closed
            return [{"type": "text", "text": "remaining"}], {"markdown": "remaining"}

    monkeypatch.setattr(parser, "_upload_and_parse", upload_and_parse)
    for name in ("cancel", "remain"):
        (tmp_path / f"{name}.pdf").write_bytes(b"%PDF-1.7\nfixture")
    first = asyncio.create_task(
        parser.parse_document(
            str(tmp_path / "cancel.pdf"), output_dir=str(tmp_path / "parsed")
        )
    )
    await started.wait()
    second = asyncio.create_task(
        parser.parse_document(
            str(tmp_path / "remain.pdf"), output_dir=str(tmp_path / "parsed")
        )
    )
    first.cancel()
    try:
        await asyncio.gather(first, return_exceptions=True)
        cancelled.set()
        result = await asyncio.wait_for(second, timeout=5)
        assert result.markdown == "remaining"
        assert all(session.closed for session in sessions.values())
    finally:
        cancelled.set()
        for task in (first, second):
            if not task.done():
                task.cancel()
        await asyncio.gather(first, second, return_exceptions=True)


@pytest.mark.asyncio
async def test_failed_multimodal_upload_does_not_return_success(rag, monkeypatch):
    project = await ProjectManager(rag.project_metadata).create("Failed upload")
    parser = type(
        "Parser",
        (),
        {"parse": AsyncMock(side_effect=RuntimeError("Connector is closed."))},
    )()
    monkeypatch.setattr(rag, "_get_enhanced_multimodal_parser", lambda: parser)
    with patch("sys.argv", ["lightrag-server"]):
        from lightrag.api.routers.multimodal_routes import create_multimodal_routes
    app = FastAPI()
    app.include_router(create_multimodal_routes(rag))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/multimodal/documents/upload",
            params={"project_id": project.project_id},
            files={"file": ("bad.pdf", b"%PDF-1.7 fixture", "application/pdf")},
        )
    assert response.status_code == 500, response.text
    assert "Connector is closed" in response.text
    docs, count = await rag.doc_status.get_docs_paginated(project_id=project.project_id)
    assert count == 1 and docs[0][1].status.value == "failed"
