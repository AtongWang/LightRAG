# Ontology draft validation and LLM generation

Use existing project metadata, configured LLM and OntologyValidator. Add POST
`/ontology/validate` for unsaved definitions and POST `/ontology/generate` for a
project's domain description/material excerpt. Generation returns a validated
draft and never changes stored definitions. Keep existing stored validation API.

The editor validates its working copy. A reusable generation dialog displays the
definition and constraints before adoption; saving remains explicit. New projects
can adopt a draft without first creating a default ontology. Existing drafts keep
their loaded ontology ID/version, so optimistic conflict checks remain effective.
Fix the actual shared API client's update return contract used by the store.

- [x] Write failing backend tests for draft vs saved validation, generation,
  malformed model output, missing project and unchanged persisted metadata.
- [x] Implement endpoints using shared validation and configured model.
- [x] Add API contract tests; connect editor validation and generation preview,
  adoption and create/update save paths with existing components.
- [x] Test offline regressions, frontend build/lint, real model smoke check when
  feasible; review and record limitations. No user projects are test fixtures.
