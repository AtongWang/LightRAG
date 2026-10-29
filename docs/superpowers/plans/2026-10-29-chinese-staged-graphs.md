# Chinese-first, ontology-confirmed project graph construction

User priority: Chinese entity names, relation labels and descriptions. Local
SUMMARY_LANGUAGE was English; set it to Chinese, honor a project's Chinese
ontology in extraction, and pass the same language into graph merge summaries.
Use Chinese default/generated vocabularies and system attachment display labels.
Preserve identifiers/codes and existing English stores without destructive edits.

Project HTTP uploads should parse and durably stage text/chunks/assets, with no
entity extraction or vector/graph indexing. Nonproject/library insert behavior
remains compatible. Staged files support ontology/description generation.

Add explicit project graph build requiring the saved ontology ID and version.
Confirm those in the document page before building; serialize with ontology
changes, use staged chunks without parsing uploads again, and track build state.
Queue scans must not automatically build staged documents.

- [ ] Reproduce language/config and automatic graph building with focused tests.
- [ ] Fix Chinese language propagation, labels and ontology fallbacks/defaults.
- [ ] Stage project text/multimodal uploads; add explicit confirmed build API.
- [ ] Add build confirmation and waiting/building status UI; verify regressions.
- [ ] Test real Chinese extraction on synthetic material, review and document
  restart/rebuild requirements; do not rewrite user graphs automatically.
