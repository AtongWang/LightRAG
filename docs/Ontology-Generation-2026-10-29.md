# Ontology draft validation and LLM generation

## Usage

Open the project's ontology editor and select **LLM 生成本体**. Select uploaded
project files; additional instructions are optional. Text-only generation also
remains supported. The existing configured LLM generates
entity types, relation types and source/target constraints. Review the JSON,
select **采用草稿**, adjust types if needed, then select **保存**.

Generation is available before a project has an ontology. Adopting a proposal
replaces the current unsaved working copy but does not change stored metadata.
Existing ontology IDs and loaded versions are preserved; new drafts are created
only when saved. Discarding a new unsaved draft makes no delete request.

The **验证** button now submits the current working copy instead of checking
the saved definition. Editing or switching projects hides old validation results.
Saving errors retain the editor and working copy so they can be corrected.

## Interfaces and safeguards

- `POST /ontology/validate`: a definition with `project_id`, name, description,
  language, type arrays, optional relation constraints and version. Returns
  `is_valid`, `error_message` and `warnings` without persisting changes.
- `POST /ontology/generate`: `project_id`, optional `document_ids` (up to 100),
  optional `requirements` (up to 12000 characters) and `language` (`zh` or `en`).
  Select at least one file or provide instructions. Returns a definition and
  `material_summary`, not a saved ontology.
- Selected document IDs are verified against project ownership before reading
  server-side parsed bodies. Unselected and other-project files are excluded.
  Missing bodies fall back to representative stored chunks; unavailable files
  are skipped and reported. Generation fails if no selected file has usable text.
- Long source bodies are sampled at the beginning, middle and end, with a shared
  30000-character body budget. The UI reports sampling and skipped file counts.
- Model output is parsed, schema checked and run through OntologyValidator.
  The request fixes project identity and language. Invalid output/provider errors
  return HTTP 502 without exposing provider error contents or replacing metadata.
- The shared `meme-lab` API client's save call now returns the server definition,
  matching the actual ontology store's contract and preserving returned versions.

## Project information

The existing settings page is now reachable through the project's **设置** tab.
Name, description, cover and tags can be edited and saved; updates use the server's
returned record so the header and project list reflect the saved values.

Select **根据文件生成简介** beside the description. The configured LLM reads
existing parsed project files and returns a preview. **采用简介** fills the editable
description field; **保存更改** persists it. No project metadata is overwritten by
generation alone. Editing and adoption are disabled during save to avoid losing
concurrent input; the settings page stays mounted during the request.

`POST /projects/{project_id}/generate-description` accepts an optional
`document_ids` list. With no selection it samples up to the first 100 project
files; omitted, skipped and sampled material is reported. No usable files returns
HTTP 422 before any model call. Project IDs and storage workspaces stay unchanged
when basic information is edited.

## Verification

- Relevant Python suite: 143 passed, including 7 draft/generation cases and 4
  file-assisted generation/project editing cases.
- Bun: 8 passed, including actual Axios request/response contracts and adoption
  of generated definitions with correct identity/version handling.
- Production Vite build passed; new Python tests and frontend modules pass their
  targeted Ruff/ESLint checks. Repository-wide TypeScript/lint findings remain.
- Real configured DeepSeek model: generated 6 entity types, 5 relation types and
  5 constraints. The isolated HTTP flow validated the draft, rejected an invalid
  working copy, created the reviewed definition and updated its version to
  `1.0.1`. Report: ignored `.cache/ontology-generation-live.json`.
- A second real model check used two synthetic parsed files for both ontology and
  project-description generation, verified no automatic persistence and saved the
  reviewed project name/description. Report: `.cache/project-materials-live.json`.

Real-provider checks used synthetic material and isolated stores under `.cache`.
No user projects, uploaded documents or credentials were modified by the checks.
No dependencies were added. Browser interaction and sustained generation load
were not tested. Generated domain choices still require human review; schema
validation checks structure, not historical or domain accuracy. Existing graphs
are not automatically rebuilt when a generated ontology is saved.
