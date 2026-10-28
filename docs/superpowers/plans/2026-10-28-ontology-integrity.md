# Ontology and graph integrity

## Design

Retain the existing undirected retrieval graph and storage interfaces. Store
directed, typed, source-linked assertions on each aggregate edge as JSON, so
multiple predicates and reverse directions survive ingestion, deletion and
retrieval. Do not invent directions for legacy aggregates.

Give project entities deterministic internal IDs and separate display names.
Apply the same transformation when rebuilding cached extraction after deletion.
Unscoped IDs remain compatible. Never merge new project entities into legacy
unscoped nodes; exclude mixed legacy descriptions from project answers.

Configured ontologies must load and validate before extraction. Attachment
nodes/links are explicitly marked as system records outside domain constraints.
Support optional relation endpoint constraints through existing ontology APIs
and JSON import/export. Keep legacy type-only ontologies valid. Delete project
ontology associations together with the ontology under a shared project lock.

## Tasks

- [x] Add failing tests for project namesakes, typed/reverse relations, deletion
  rebuild, missing ontology, system attachments and ontology lifecycle.
- [x] Scope extracted and rebuilt entity identifiers; preserve display names in
  graph API, vector content and retrieval context; reject mixed legacy records.
- [x] Preserve relation assertions and deterministic type summaries through
  merge, deletion rebuild, graph responses and LLM context.
- [x] Enforce configured ontology loading and optional endpoint constraints;
  label attachment records explicitly and repair ontology deletion/lifecycle.
- [x] Run relevant Python/Bun/lint/build checks, review changes, and document
  compatibility, reindex requirements and coverage limits.

## Validation

Use isolated stores and controlled LLM responses for semantic regressions. Reuse
the existing real extraction/storage/query pipeline tests. Do not alter user
projects or repeat paid provider checks unless a provider contract changes.
