"""Multimodal descriptions stay concise while preserving structured content."""

from unittest.mock import AsyncMock

import pytest

from lightrag.kg.multimodal_processor import (
    EquationProcessor,
    ImageProcessor,
    TableProcessor,
)
from lightrag.parsers.base import ContentBlock, ContentType


@pytest.mark.asyncio
@pytest.mark.parametrize("language", ["Chinese", "English"])
async def test_image_prompt_requests_short_plain_description(tmp_path, language):
    image = tmp_path / "figure.png"
    image.write_bytes(b"image fixture")
    description = "图中为一件青铜鼎，具有双耳、三足和纹饰。"
    vision = AsyncMock(return_value=description)
    processor = ImageProcessor(vision_func=vision, language=language)
    block = ContentBlock(type=ContentType.IMAGE, img_path=str(image))
    result = await processor.process(
        block, context="相关资料", source_file="catalog.pdf"
    )
    prompt = vision.await_args.args[0]
    if language == "Chinese":
        assert "2～4" in prompt and "不要使用" in prompt and "Markdown" in prompt
        assert "无法确认" in prompt
    else:
        assert "2–4" in prompt and "Do not use Markdown" in prompt
    assert "相关资料" in prompt
    assert result.description == description
    assert result.to_chunk_dict()["description"] == description
    assert description in result.chunk_content
    assert vision.await_args.kwargs["image_data"].startswith("data:image/png;base64,")


@pytest.mark.asyncio
@pytest.mark.parametrize("language", ["Chinese", "English"])
@pytest.mark.parametrize("kind", ["table", "equation"])
async def test_table_and_equation_descriptions_preserve_structured_content(
    language, kind
):
    model = AsyncMock(return_value="资料记录了文物的相关数据。")
    html = "<table><tr><th>数量</th></tr><tr><td>3</td></tr></table>"
    latex = r"E=mc^2"
    if kind == "table":
        processor = TableProcessor(llm_func=model, language=language)
        block = ContentBlock(type=ContentType.TABLE, table_html=html)
    else:
        processor = EquationProcessor(llm_func=model, language=language)
        block = ContentBlock(type=ContentType.EQUATION, equation_latex=latex)
    result = await processor.process(block, context="相关资料")
    prompt = model.await_args.args[0]
    assert "Markdown" in prompt
    assert ("2～4" if language == "Chinese" else "2–4") in prompt
    assert result.description == model.return_value
    if kind == "table":
        assert result.table_html == html
        assert "3" in result.table_markdown and "3" in result.chunk_content
    else:
        assert result.equation_latex == latex and latex in result.chunk_content
