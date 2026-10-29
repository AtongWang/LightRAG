# File-assisted ontology and project descriptions

Extend the pending draft-generation feature without changing stored definitions
automatically. Read server-side parsed document content only after validating
project ownership. Use a bounded, balanced sample of selected files, report
sampling and skipped files, and refuse generation without usable material.

- [x] Add failing tests for selected file contents, wrong-project IDs, unparsed
  files, bounded sampling, description drafts and durable project edits.
- [x] Reuse one project material collector in ontology and description generation.
- [x] Add paginated project file selection in ontology generation; make extra
  instructions optional when files are selected.
- [x] Expose the existing project settings route/nav; add description generation
  with preview/adoption and explicit saving. Preserve server-returned edit data.
- [x] Verify offline/backend/frontend checks, real model generation on synthetic
  uploaded content, review and update usage documentation.
