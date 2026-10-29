# MinerU concurrent upload failure

## Root cause

The cached parser reused one aiohttp ClientSession across concurrent uploads.
Each parse closed the shared session in its `finally` block. When a faster parse
finished, another request's connector was closed while it was still awaiting a
response, reproducing `ClientConnectionError: Connector is closed.`

The enhanced parser then attempted its legacy RAGAnything fallback. Since no
local RAGAnything service was running, the combined error misleadingly suggested
starting a local parser service. The configured backend is MinerU Cloud.

Separately, `ainsert_multimodal` records processing failures instead of raising
them. Its upload route interpreted the returned track ID as success, producing
HTTP 200 even for a failed document.

## Fix

- Both MinerU API and cloud parsers create operation-owned sessions. Parse and
  async health-check cleanup close only the session they created.
- Cancellation and completion cannot close another upload's connector.
- The multimodal upload route checks tracked status after insertion and returns
  HTTP 500 for a failed document, preserving its recorded failure details.
- Multimodal router construction is scoped to each application; routes no longer
  retain another app's RAG/storage instance when creating multiple applications.

## Verification and recovery

Five new offline regression cases cover API/cloud concurrent HTTP requests,
cancellation cleanup, and failed-upload HTTP reporting. The initial tests
reproduced the closed connector and false success before the fix.

Relevant backend suite: 148 passed. Real MinerU Cloud validation ran two concurrent
parses through one parser instance; each returned 2 text blocks, 1 image and 1
table. It used the existing synthetic DOCX sample, not user PDFs. The report is
ignored `.cache/mineru-concurrent-live.json`. This checks connection lifecycle,
not the OCR accuracy of every uploaded PDF.

Restart the backend to load the fix, then upload the original failed PDFs again.
Existing failed status records are retained and can be retried. No failed user
documents were automatically reprocessed and no token was changed. Local
RAGAnything is not required for successful MinerU Cloud operation.
