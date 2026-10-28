# Review fixes implementation plan

**Goal:** Fix the seven non-authentication audit findings without changing anonymous LAN access or existing UI edits.

**Architecture:** Keep project and ontology metadata in a dedicated host-local JSON KV namespace alongside existing storage files. Copy legacy metadata before removing cache copies. Expose prefix reads through the KV interface for listing and migration. Keep the existing RAG and API interfaces.

**Tech stack:** Python, FastAPI, pytest, existing storage adapters and shared locks.

**Spec:** User-approved fixes for audit findings 3 through 9; authentication is excluded.

- [x] Add regression tests and confirm failures for cache deletion, cross-project answers, missing project filters, independent asset writers, document deduplication, entity routes and public-interface project listing.
- [x] Add dedicated metadata lifecycle, durable CRUD and copy-first migration; update all metadata consumers and storage prefix implementations.
- [x] Include query scope, context and history in answer cache keys; reject invalid project filters and retrieve all document pages.
- [x] Serialize asset read-modify-write operations across instances/processes and replace metadata files atomically.
- [x] Scope document filenames, IDs and chunk IDs to their project; retain unscoped document compatibility.
- [x] Reuse core entity edit/delete operations and correct graph searches and counts.
- [x] Run regression and existing offline tests, lint touched logic, build frontend if changed, and smoke-test service startup.

**Checks:** Preserve user data on migration failure; avoid silent global queries; preserve both asset writers and deletions; retain global imports; check existing metadata after cache clearing and restart. Do not change authentication.

**Validation:** 108 relevant backend tests passed; 1 Bun API contract test passed; frontend production build and targeted ESLint passed; real server verified legacy migration, cache clearing, missing-project 404, WebUI and persistence across forced restart. No additional Ruff diagnostics relative to baseline. Optional Qdrant tests could not collect without qdrant_client; external database services were not exercised. See `docs/Validation-2026-10-28.md` for real MinerU, model and multimodal pipeline results.

**Operations:** Restart the server to load these changes and migrate legacy records. Back up the complete working directory, including kv_store_project_metadata.json (inside the configured workspace subdirectory when used). Migration does not rewrite existing document or chunk IDs. Authentication behavior is unchanged.
