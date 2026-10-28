"""Exercise real extraction, indexing, retrieval and multimodal HTTP plumbing.

Only the external model and MinerU responses are controlled fixtures. These
tests check application behavior, not real model accuracy or OCR quality.
"""

import base64
import io
import json
from unittest.mock import patch

import httpx
import numpy as np
import pytest
import pytest_asyncio
from aiohttp import web
from fastapi import FastAPI
from PIL import Image
from pypdf import PdfWriter

from lightrag import LightRAG
from lightrag.base import QueryParam
from lightrag.projects import ProjectManager
from lightrag.utils import EmbeddingFunc


class Models:
    def __init__(self):
        self.stages = []
        self.answer_contexts = []

    async def embed(self, texts):
        return np.tile(np.array([1.0, 0.0, 0.0, 0.0]), (len(texts), 1))

    async def vision(self, prompt, image_data=None, **kwargs):
        assert image_data.startswith("data:image/png;base64,")
        self.stages.append("vision")
        return "A Bronze Vessel displayed in the Heritage Museum."

    async def llm(self, prompt, system_prompt=None, **kwargs):
        if kwargs.get("keyword_extraction"):
            self.stages.append("keywords")
            return json.dumps(
                {
                    "high_level_keywords": ["heritage"],
                    "low_level_keywords": ["Bronze Vessel"],
                }
            )
        if "---Data to be Processed---" in prompt:
            self.stages.append("extraction")
            return "\n".join(  # noqa: FLY002 - Keep extraction records readable.
                [
                    "entity<|#|>Bronze Vessel<|#|>Artifact<|#|>The Bronze Vessel is kept in the Heritage Museum.",
                    "entity<|#|>Heritage Museum<|#|>Organization<|#|>The Heritage Museum holds the Bronze Vessel.",
                    "relation<|#|>Bronze Vessel<|#|>Heritage Museum<|#|>LocatedIn<|#|>collection,heritage<|#|>The Heritage Museum holds the Bronze Vessel.",
                    "<|COMPLETE|>",
                ]
            )
        if "Knowledge Graph Specialist" in (system_prompt or ""):
            return "<|COMPLETE|>"
        if system_prompt and "Bronze Vessel" in system_prompt:
            self.stages.append("answer")
            self.answer_contexts.append(system_prompt)
            return "The Bronze Vessel is in the Heritage Museum. [1]"
        self.stages.append("description")
        return "The Bronze Vessel weighs 12 kg. Its measurement formula is m = 12 kg."


@pytest_asyncio.fixture
async def models():
    return Models()


def make_rag(tmp_path, models, **kwargs):
    return LightRAG(
        working_dir=str(tmp_path / "storage"),
        workspace=tmp_path.name,
        llm_model_func=models.llm,
        vision_model_func=models.vision,
        embedding_func=EmbeddingFunc(
            embedding_dim=4, max_token_size=8192, func=models.embed
        ),
        entity_extract_max_gleaning=0,
        enable_llm_cache=False,
        vector_db_storage_cls_kwargs={"cosine_better_than_threshold": 0.1},
        addon_params={"language": "English"},
        **kwargs,
    )


@pytest.mark.asyncio
async def test_project_vector_filter_uses_real_stored_vectors(tmp_path, models):
    rag = make_rag(tmp_path, models, multimodal_enabled=False)
    await rag.initialize_storages()
    try:
        await rag.chunks_vdb.upsert(
            {
                "chunk-a": {
                    "content": "Bronze Vessel",
                    "full_doc_id": "a",
                    "file_path": "a.txt",
                },
                "chunk-b": {
                    "content": "Another collection",
                    "full_doc_id": "b",
                    "file_path": "b.txt",
                },
            }
        )
        result = await rag.chunks_vdb.query("vessel", top_k=5, ids=["chunk-a"])
        assert [item["id"] for item in result] == ["chunk-a"]
        assert await rag.chunks_vdb.query("vessel", top_k=5, ids=[]) == []
    finally:
        await rag.finalize_storages()


@pytest.mark.asyncio
async def test_text_extraction_graph_vectors_and_answer(tmp_path, models):
    rag = make_rag(tmp_path, models, multimodal_enabled=False)
    await rag.initialize_storages()
    try:
        await rag.ainsert(
            "The Bronze Vessel is held by the Heritage Museum.",
            file_paths="heritage.txt",
        )
        assert await rag.chunk_entity_relation_graph.has_node("Bronze Vessel")
        assert await rag.chunk_entity_relation_graph.has_edge(
            "Bronze Vessel", "Heritage Museum"
        )
        assert await rag.entities_vdb.query("vessel", top_k=5)
        assert await rag.relationships_vdb.query("museum", top_k=5)
        for mode in ("local", "global", "hybrid", "mix", "naive"):
            result = await rag.aquery_llm(
                "Where is the Bronze Vessel?",
                QueryParam(mode=mode, enable_rerank=False),
            )
            assert "Heritage Museum" in result["llm_response"]["content"], (
                mode,
                result,
            )
            assert result["data"]["chunks"], (mode, result)
            assert result["data"]["references"], (mode, result)
            structured = await rag.aquery_data(
                "Where is the Bronze Vessel?",
                QueryParam(mode=mode, enable_rerank=False),
            )
            assert structured["status"] == "success", (mode, structured)
            assert structured["data"]["chunks"], (mode, structured)
        assert "extraction" in models.stages and "keywords" in models.stages
        assert len(models.answer_contexts) == 5
    finally:
        await rag.finalize_storages()


@pytest_asyncio.fixture
async def mineru_server():
    image = io.BytesIO()
    Image.new("RGB", (32, 32), "#ba3825").save(image, format="PNG")
    image_data = "data:image/png;base64," + base64.b64encode(image.getvalue()).decode()
    calls = []

    async def parse(request):
        fields = await request.post()
        assert fields["files"].file.read().startswith(b"%PDF")
        assert fields["return_content_list"] == "true"
        calls.append(fields["backend"])
        blocks = [
            {
                "type": "text",
                "text": "The Bronze Vessel is held by the Heritage Museum.",
                "page_idx": 0,
            },
            {
                "type": "image",
                "img_path": "images/vessel.png",
                "img_caption": ["Bronze Vessel"],
                "page_idx": 0,
            },
            {
                "type": "table",
                "table_body": "<table><tr><th>Artifact</th><th>Mass</th></tr><tr><td>Bronze Vessel</td><td>12 kg</td></tr></table>",
                "page_idx": 0,
            },
            {
                "type": "interline_equation",
                "text": "m = 12 \\mathrm{kg}",
                "page_idx": 0,
            },
        ]
        return web.json_response(
            {
                "results": {
                    "sample": {
                        "md_content": "Bronze Vessel",
                        "content_list": json.dumps(blocks),
                        "images": {"vessel.png": image_data},
                    }
                }
            }
        )

    app = web.Application()
    app.router.add_post("/file_parse", parse)

    async def schema(request):
        return web.json_response({"paths": {"/file_parse": {}}})

    app.router.add_get("/openapi.json", schema)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    try:
        yield f"http://127.0.0.1:{site._server.sockets[0].getsockname()[1]}", calls
    finally:
        await runner.cleanup()


@pytest.mark.asyncio
async def test_pdf_parser_multimodal_graph_answer_and_asset_http(
    tmp_path, models, mineru_server
):
    url, calls = mineru_server
    pdf = tmp_path / "sample.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=300, height=300)
    with pdf.open("wb") as stream:
        writer.write(stream)
    rag = make_rag(
        tmp_path,
        models,
        multimodal_enabled=True,
        multimodal_parser_type="mineru_api",
        mineru_api_url=url,
        multimodal_output_dir=str(tmp_path / "parsed"),
    )
    await rag.initialize_storages()
    try:
        project = await ProjectManager(rag.project_metadata).create("E2E")
        await rag.ainsert_multimodal(
            str(pdf), metadata={"project_id": project.project_id}
        )
        docs, count = await rag.doc_status.get_docs_paginated(
            project_id=project.project_id, page_size=10
        )
        assert count == 1 and docs[0][1].status.value == "processed", docs
        assert calls and "vision" in models.stages and "extraction" in models.stages
        nodes = await rag.chunk_entity_relation_graph.get_all_nodes()
        by_name = {node.get("display_name"): node["id"] for node in nodes}
        assert await rag.chunk_entity_relation_graph.has_edge(by_name["Bronze Vessel"], by_name["Heritage Museum"])
        with patch("sys.argv", ["lightrag-server"]):
            from lightrag.api.routers.multimodal_routes import create_multimodal_routes
            from lightrag.api.routers.query_routes import create_query_routes
        app = FastAPI()
        app.include_router(create_query_routes(rag))
        app.include_router(create_multimodal_routes(rag))
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/query",
                json={
                    "query": "Where is the Bronze Vessel?",
                    "mode": "mix",
                    "project_id": project.project_id,
                    "include_references": True,
                    "enable_rerank": False,
                },
            )
            assert response.status_code == 200, response.text
            data = response.json()
            assert "Heritage Museum" in data["response"] and data["references"]
            multimodal = data.get("multimodal_results") or []
            assert {"image", "table", "equation"} <= {
                item["content_type"] for item in multimodal
            }, multimodal
            picture = next(
                item for item in multimodal if item["content_type"] == "image"
            )
            table = next(item for item in multimodal if item["content_type"] == "table")
            assert "<table" in table["table_html"]
            assert "|" in table["table_markdown"]
            assert picture["asset_url"], picture
            image = await client.get(picture["asset_url"])
            assert image.status_code == 200 and image.content.startswith(b"\x89PNG")
            assert "12" in "".join(models.answer_contexts)
    finally:
        await rag.finalize_storages()
