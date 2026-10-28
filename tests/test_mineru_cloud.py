"""Contract tests for the documented MinerU official cloud protocol."""

import io
import json
import zipfile

import pytest
from aiohttp import web

from lightrag.kg.doc_pipeline import DocumentPipeline, PipelineConfig


@pytest.mark.asyncio
async def test_cloud_upload_poll_download_without_leaking_token(tmp_path, monkeypatch):
    token = "test-only-mineru-token"
    monkeypatch.setenv("MINERU_API_TOKEN", token)
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w") as archive:
        archive.writestr("full.md", "# Heritage Museum")
        archive.writestr(
            "document_content_list.json",
            json.dumps(
                [
                    {
                        "type": "text",
                        "text": "The Bronze Vessel is held by the Heritage Museum.",
                        "page_idx": 0,
                    },
                    {
                        "type": "table",
                        "table_body": "<table><tr><td>12 kg</td></tr></table>",
                        "page_idx": 0,
                    },
                ]
            ),
        )
    calls = []

    async def submit(request):
        assert request.headers["Authorization"] == "Bearer " + token
        body = await request.json()
        assert body["files"][0]["name"] == "sample.pdf"
        calls.append("submit")
        return web.json_response(
            {"code": 0, "data": {"batch_id": "batch", "file_urls": [base + "/upload"]}}
        )

    async def upload(request):
        assert "Authorization" not in request.headers
        assert "Content-Type" not in request.headers
        assert (await request.read()).startswith(b"%PDF")
        calls.append("upload")
        return web.Response(status=200)

    async def poll(request):
        assert request.headers["Authorization"] == "Bearer " + token
        calls.append("poll")
        return web.json_response(
            {
                "code": 0,
                "data": {
                    "extract_result": [
                        {"state": "done", "full_zip_url": base + "/download"}
                    ]
                },
            }
        )

    async def download(request):
        assert "Authorization" not in request.headers
        calls.append("download")
        return web.Response(body=result.getvalue(), content_type="application/zip")

    app = web.Application()
    app.router.add_post("/file-urls/batch", submit)
    app.router.add_put("/upload", upload)
    app.router.add_get("/extract-results/batch/batch", poll)
    app.router.add_get("/download", download)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    base = f"http://127.0.0.1:{site._server.sockets[0].getsockname()[1]}"
    pdf = tmp_path / "sample.pdf"
    pdf.write_bytes(b"%PDF-1.7\ncontract fixture")
    try:
        pipeline = DocumentPipeline(
            llm_func=None,
            config=PipelineConfig(
                parser_type="mineru_cloud",
                mineru_api_url=base,
                output_dir=str(tmp_path / "parsed"),
            ),
        )
        parser = await pipeline._get_parser()
        parsed = await parser.parse_document(str(pdf))
        assert parsed.markdown == "# Heritage Museum"
        assert parsed.table_blocks == 1 and parsed.text_blocks == 1
        assert calls == ["submit", "upload", "poll", "download"]
        assert token not in repr(parsed)
    finally:
        await runner.cleanup()


@pytest.mark.asyncio
async def test_cloud_archive_rejects_escaping_paths(tmp_path):
    from lightrag.parsers.mineru_cloud import MineruCloudParser

    payload = io.BytesIO()
    with zipfile.ZipFile(payload, "w") as archive:
        archive.writestr("../outside.txt", "unsafe")
    parser = MineruCloudParser()
    with pytest.raises(ValueError, match="Unsafe"):
        parser._read_archive(payload.getvalue(), tmp_path / "result")
    assert not (tmp_path / "outside.txt").exists()
