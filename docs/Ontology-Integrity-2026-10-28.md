# Ontology and graph integrity changes: 2026-10-28

## Behavior

- Project entities use deterministic internal IDs of the form
  `project:<project hash>:<entity name>`. Display names remain separate. New
  project data never merges with another project's namesakes or legacy nodes.
- LightRAG keeps its undirected graph for retrieval and backend compatibility.
  Each aggregate edge also stores directed, typed, source-linked assertions in
  `relation_facts`. Graph HTTP responses expose separate edges per predicate and
  direction; the UI preserves parallel edges and draws arrows for known facts.
- Multiple extraction rounds merge individual facts instead of replacing an
  entire entity pair. Relation type summaries and assertion ordering are stable.
- A configured ontology must exist, belong to the project and pass validation.
  Loading errors stop extraction instead of silently selecting default types.
  Accepted entity/relation types use the ontology's canonical spellings.
- Image/table/equation attachments are explicit `is_system` records linked by
  `has_attachment`. They are separate from domain ontology constraints.
- Each text chunk saves its accepted extraction and ontology ID/version. Document
  deletion rebuilds from that snapshot even after clearing the LLM cache.
- Rename/merge operations update assertion endpoints, chunk snapshots and
  document graph indices. Project IDs are immutable; edit `display_name` to
  change their labels. Cross-project merges are rejected.
- Project and ontology lifecycle writes share a project lock. Creation and
  deletion attach/detach the project association; stale local object caches no
  longer hide changes. Updates detect stale ontology versions.
- The editor sends the version it loaded and saves the returned current version.
  Stale saves return HTTP 409. Type renames update endpoint constraints; referenced
  entity types and the required `Other` fallback cannot be removed accidentally.
  Ambiguous normalized type names and nonnumeric versions are rejected.
- PostgreSQL stores additional chunk fields in a new `chunk_metadata` JSONB
  column. Startup adds it with `ADD COLUMN IF NOT EXISTS`; migration errors
  prevent startup instead of silently losing rebuild metadata.

## Defining relation endpoint constraints

Type-only ontologies remain valid. To restrict a relation's source and target
types, include `relation_constraints` in ontology creation/update or JSON import:

```json
{
  "name": "Heritage catalog",
  "language": "zh",
  "entity_types": ["Artifact", "Organization", "Person", "Other"],
  "relation_types": ["held_by", "created_by", "Other"],
  "relation_constraints": {
    "held_by": {
      "source_types": ["Artifact"],
      "target_types": ["Organization"]
    },
    "created_by": {
      "source_types": ["Artifact"],
      "target_types": ["Person"]
    }
  }
}
```

Both endpoints of a configured constraint need nonempty type lists, and all
referenced types must exist. Unconstrained predicates retain type-only behavior.
The existing editor preserves these constraints on save/export; use JSON import
or the API to define them. Invalid definitions return HTTP 400.

This supports type vocabularies and relation endpoints, not a general OWL
reasoner or an entity attribute schema. Changing an ontology affects subsequent
extraction; existing accepted facts need reindexing to adopt the new rules.

## Existing data and rollout

Restart the service to load the code and rebuilt frontend. Back up `.env`, the
complete working directory/workspace and original input documents first.

Legacy graph aggregates do not contain enough information to reliably recover
directions, distinct predicates or project-specific descriptions. No destructive
automatic split or rewrite is attempted. Legacy nodes are excluded from project
graph/answer contexts; the project graph API returns `rebuild_required` and the
UI displays a rebuild notice. Legacy edges in the global graph retain unknown
direction rather than receiving an invented arrow.

For a clean rebuild, use a new `WORKING_DIR` and a distinct `WORKSPACE`, recreate
the projects and import their ontology definitions, then upload the original
documents into the corresponding projects. Keep the old storage intact until
the new graphs and answers have been checked. Merely restarting or reuploading
an already processed document does not rebuild old records.

For external storage backends, changing only `WORKING_DIR` is insufficient:
choose a new workspace/namespace for all stores as well. PostgreSQL deployments
need schema migration privileges. The current host-local metadata store remains
appropriate for a single host, not independent replicated hosts.

## Validation

All regression data is isolated in pytest temporary directories or `.cache`.
Real user projects and their input documents were not modified.

- Python: 132 relevant tests passed, including controlled concurrent project
  deletion/update during ontology creation, project isolation, relation direction,
  multiple predicates, constrained extraction, cache clearing, document deletion,
  rename/merge and PostgreSQL adapter read/write contracts.
- Bun: 5 tests passed, including actual graphology construction with parallel
  predicates, reverse directions and readable names, and ontology constraint edits.
- Production Vite build and targeted frontend ESLint passed.
- New Python tests pass Ruff. Existing unrelated repository lint/type errors
  remain; the complete TypeScript check is not clean.
- Compared with HEAD, changed backend files introduce no additional Ruff
  diagnostics and changed UI components introduce no additional ESLint diagnostics.
- Independent read-only review found no remaining concrete blockers after the
  PostgreSQL, mutation and lifecycle race fixes.

Repeat the relevant backend checks with the project Python environment:

```powershell
uv run python -m pytest tests/test_ontology_integrity.py tests/test_pg_chunk_metadata.py tests/test_pipeline_e2e.py tests/test_mineru_cloud.py tests/test_review_regressions.py tests/test_chunking.py tests/test_overlap_validation.py tests/test_token_auto_renewal.py tests/test_write_json_optimization.py tests/test_unified_lock_safety.py tests/test_rerank_chunking.py -q
```

The PostgreSQL contract test requires the existing adapter's optional `asyncpg`
and `pgvector` drivers. It does not connect to a live database. Paid model/MinerU
checks were not repeated because their provider protocols did not change.
Browser interaction, live database migration and sustained load are not covered.
