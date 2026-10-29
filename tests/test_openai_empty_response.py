"""Empty responses expose safe diagnostic metadata, never prompt or reasoning."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from lightrag.llm import openai


@pytest.mark.asyncio
async def test_empty_response_reports_truncation_without_logging_private_content(
    monkeypatch, caplog
):
    response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                finish_reason="length",
                message=SimpleNamespace(
                    content="",
                    reasoning_content="private reasoning",
                    refusal=None,
                    tool_calls=None,
                ),
            )
        ],
        usage=SimpleNamespace(prompt_tokens=1000, completion_tokens=9000),
    )
    client = SimpleNamespace(
        chat=SimpleNamespace(
            completions=SimpleNamespace(create=AsyncMock(return_value=response))
        ),
        close=AsyncMock(),
    )
    monkeypatch.setattr(openai, "create_openai_async_client", lambda **kwargs: client)
    with pytest.raises(openai.InvalidResponseError):
        await openai.openai_complete_if_cache.__wrapped__(
            "test-model", "private document", max_completion_tokens=9000
        )
    assert "finish_reason=length" in caplog.text
    assert "reasoning_chars=17" in caplog.text
    assert "completion_tokens=9000" in caplog.text
    assert "private reasoning" not in caplog.text
    assert "private document" not in caplog.text
