# Pipeline validation: 2026-10-28

## Real services tested

All documents and vector/graph stores used for these checks are isolated under
`.cache/`. Existing user projects were not used as test data.

| Component | Result |
| --- | --- |
| DeepSeek `deepseek-flash`, text | Returned the requested `CHECK_OK` |
| DeepSeek vision | Identified the supplied red image as red |
| Local Ollama 0.40.12, `embeddinggemma-2:latest` | OpenAI `/v1/embeddings` returned 768-dimensional text vectors |
| Ollama multimodal embeddings via OpenAI Python SDK | Batched image and text objects returned four 768-dimensional vectors |
| Image/text alignment check | Red image: red text 0.716, blue text 0.641; blue image: blue text 0.723, red text 0.655 |
| MinerU precision API, public PDF URL | Authenticated submission, polling and structured ZIP download completed |
| MinerU precision API, local DOCX upload | Signed upload, polling and ZIP parsing completed; 2 text blocks, 1 image and 1 table |
| Real graph extraction and indexing | Generated 10 nodes, 20 edges and 3 chunks from the synthetic catalog |
| Real mixed and vector-only answers | Correctly identified Heritage Museum and the mass of 12 kg, with citations, image and table |
| Real structured query API | Both mixed and vector-only queries returned indexed chunks |
| Real streaming API | Returned the correct answer, references and multimodal attachments |

The source catalog and illustration are synthetic test data. These checks prove
the tested provider contracts and application paths work together; they are not
a broad benchmark of OCR, extraction accuracy or retrieval quality.

The final query rerun reused the successfully ingested real document to avoid
repeating cloud parsing. Intermediate failures were investigated and fixed;
one separate retry encountered a transient connection error to mineru.net.

## Fixes found during these checks

- Correct self-hosted MinerU parser construction and timeout argument.
- Run synchronous parser health checks outside the event loop.
- Add `mineru_cloud` for the official signed-upload/poll/ZIP protocol.
- Omit inferred Content-Type on signed upload; adding it caused an actual OSS 403.
- Keep the MinerU token off signed upload/download requests and validate ZIP paths.
- Reuse the existing safe configuration collector after parsers are initialized.
- Restore chunk metadata using requested IDs rather than assuming backend ID fields.
- Preserve that metadata in vector-only queries and multimodal query responses.
- Recognize MinerU table HTML stored in `table_body` for display and description.
- Use NanoVectorDB's public query filter instead of a removed internal vector field.
- Cover graph and vector branches of both answer and structured query APIs.

## Running configuration

The local `.env` Embedding settings were updated to the tested configuration:

```dotenv
EMBEDDING_BINDING=openai
EMBEDDING_BINDING_HOST=http://127.0.0.1:11434/v1
EMBEDDING_BINDING_API_KEY=ollama
EMBEDDING_MODEL=embeddinggemma-2:latest
EMBEDDING_DIM=768
EMBEDDING_SEND_DIM=false
EMBEDDING_TOKEN_LIMIT=8192
```

The official MinerU service is now configured persistently in the local `.env`:

```dotenv
MULTIMODAL_ENABLED=true
MULTIMODAL_PARSER_TYPE=mineru_cloud
MINERU_API_URL=https://mineru.net/api/v4
MINERU_API_TOKEN=<your private token>
```

At the user's request, the supplied token is stored only in the Git-ignored local
`.env`. It is excluded from this report and the commit. Earlier validation
processes received the token only through their environment.
Restart the application after changing its configuration.

The Ollama OpenAI extension accepts multimodal input objects, for example:

```python
client = OpenAI(base_url="http://127.0.0.1:11434/v1", api_key="ollama")
vectors = client.embeddings.create(
    model="embeddinggemma-2:latest",
    input=[{"text": "A red square"}, {"image": image_base64}],
    encoding_format="float",
)
```

The application currently embeds extracted text and visual descriptions. Passing
an image directly to Ollama works, but a separate raw-pixel image-vector index
has not been added to the application's ingestion pipeline.

## Repeatable checks

```powershell
python -m pytest tests/test_pipeline_e2e.py tests/test_mineru_cloud.py tests/test_review_regressions.py tests/test_chunking.py tests/test_overlap_validation.py tests/test_token_auto_renewal.py tests/test_write_json_optimization.py tests/test_unified_lock_safety.py tests/test_rerank_chunking.py -q
```

Result: 108 passed. External responses in the automated pipeline tests are
controlled fixtures; real-provider checks are reported separately above.
New parser and test files pass Ruff. Existing unrelated lint findings remain.

Not covered: broad Chinese/scanned-document benchmarks, live equation OCR,
external database services, browser interaction or sustained concurrent load.
Older vector collections built with another model/dimension require reindexing;
they must not be mixed with the tested 768-dimensional embeddings.

## Primary references

- [MinerU official API documentation](https://mineru.net/apiManage/docs)
- [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)
- [EmbeddingGemma 2 model](https://ollama.com/library/embeddinggemma-2)
- [Ollama 0.40.12 embedding input definition](https://github.com/ollama/ollama/blob/v0.40.12/api/types.go)
