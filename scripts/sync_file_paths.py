#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from typing import Dict, Any

ROOT = Path(__file__).resolve().parents[1]
RAG_STORAGE = ROOT / "rag_storage"

DOC_STATUS = RAG_STORAGE / "kv_store_doc_status.json"
FULL_DOCS = RAG_STORAGE / "kv_store_full_docs.json"
TEXT_CHUNKS = RAG_STORAGE / "kv_store_text_chunks.json"
VDB_CHUNKS = RAG_STORAGE / "vdb_chunks.json"
VDB_ENTITIES = RAG_STORAGE / "vdb_entities.json"
VDB_RELATIONS = RAG_STORAGE / "vdb_relationships.json"


def load_json(path: Path) -> Any:
    if not path.exists():
        return None
    return json.loads(path.read_text())


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2))


def basename(path_str: str | None) -> str:
    if not path_str:
        return ""
    return Path(path_str).name


def build_maps(doc_status: Dict[str, Any]) -> tuple[Dict[str, str], Dict[str, str]]:
    doc_id_to_name: Dict[str, str] = {}
    alias_to_name: Dict[str, str] = {}

    for doc_id, doc in doc_status.items():
        meta = doc.get("metadata") or {}
        original_name = meta.get("original_filename") or ""
        if not original_name:
            original_name = basename(doc.get("file_path"))
        if not original_name:
            continue
        doc_id_to_name[doc_id] = original_name

        # Aliases that may appear in other stores
        val = doc.get("file_path")
        if val:
            alias_to_name[val] = original_name
        for key in ("file_path", "file_name", "source_file"):
            val = meta.get(key)
            if val:
                alias_to_name[val] = original_name

    return doc_id_to_name, alias_to_name


def update_doc_status(doc_status: Dict[str, Any], doc_id_to_name: Dict[str, str]) -> int:
    changed = 0
    for doc_id, doc in doc_status.items():
        desired = doc_id_to_name.get(doc_id)
        if desired and doc.get("file_path") != desired:
            doc["file_path"] = desired
            changed += 1
        meta = doc.get("metadata")
        if desired and isinstance(meta, dict) and meta.get("file_path") != desired:
            meta["file_path"] = desired
            changed += 1
    return changed


def update_full_docs(full_docs: Dict[str, Any], doc_id_to_name: Dict[str, str]) -> int:
    changed = 0
    for doc_id, doc in full_docs.items():
        desired = doc_id_to_name.get(doc_id)
        if desired and doc.get("file_path") != desired:
            doc["file_path"] = desired
            changed += 1
        meta = doc.get("metadata")
        if desired and isinstance(meta, dict) and meta.get("file_path") != desired:
            meta["file_path"] = desired
            changed += 1
    return changed


def update_text_chunks(text_chunks: Dict[str, Any], doc_id_to_name: Dict[str, str], alias_to_name: Dict[str, str]) -> int:
    changed = 0
    for _, chunk in text_chunks.items():
        desired = doc_id_to_name.get(chunk.get("full_doc_id"))
        if not desired:
            desired = alias_to_name.get(chunk.get("file_path", ""))
        if desired and chunk.get("file_path") != desired:
            chunk["file_path"] = desired
            changed += 1
    return changed


def update_vdb_items(vdb: Dict[str, Any], doc_id_to_name: Dict[str, str], alias_to_name: Dict[str, str]) -> int:
    changed = 0
    data = vdb.get("data", [])
    for item in data:
        if not isinstance(item, dict):
            continue
        desired = doc_id_to_name.get(item.get("full_doc_id"))
        if not desired:
            desired = alias_to_name.get(item.get("file_path", ""))
        if desired and item.get("file_path") != desired:
            item["file_path"] = desired
            changed += 1
    return changed


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync file_path with original_filename in rag_storage.")
    parser.add_argument("--apply", action="store_true", help="Write changes to disk.")
    args = parser.parse_args()

    doc_status = load_json(DOC_STATUS)
    if not isinstance(doc_status, dict):
        raise SystemExit("kv_store_doc_status.json missing or invalid")

    doc_id_to_name, alias_to_name = build_maps(doc_status)

    changes = {}

    changes["doc_status"] = update_doc_status(doc_status, doc_id_to_name)

    full_docs = load_json(FULL_DOCS)
    if isinstance(full_docs, dict):
        changes["full_docs"] = update_full_docs(full_docs, doc_id_to_name)
    else:
        full_docs = None

    text_chunks = load_json(TEXT_CHUNKS)
    if isinstance(text_chunks, dict):
        changes["text_chunks"] = update_text_chunks(text_chunks, doc_id_to_name, alias_to_name)
    else:
        text_chunks = None

    vdb_chunks = load_json(VDB_CHUNKS)
    if isinstance(vdb_chunks, dict):
        changes["vdb_chunks"] = update_vdb_items(vdb_chunks, doc_id_to_name, alias_to_name)
    else:
        vdb_chunks = None

    vdb_entities = load_json(VDB_ENTITIES)
    if isinstance(vdb_entities, dict):
        changes["vdb_entities"] = update_vdb_items(vdb_entities, doc_id_to_name, alias_to_name)
    else:
        vdb_entities = None

    vdb_relations = load_json(VDB_RELATIONS)
    if isinstance(vdb_relations, dict):
        changes["vdb_relations"] = update_vdb_items(vdb_relations, doc_id_to_name, alias_to_name)
    else:
        vdb_relations = None

    print("Planned updates:")
    for k, v in changes.items():
        print(f"  {k}: {v}")

    if not args.apply:
        print("Dry run only. Re-run with --apply to write changes.")
        return

    write_json(DOC_STATUS, doc_status)
    if full_docs is not None:
        write_json(FULL_DOCS, full_docs)
    if text_chunks is not None:
        write_json(TEXT_CHUNKS, text_chunks)
    if vdb_chunks is not None:
        write_json(VDB_CHUNKS, vdb_chunks)
    if vdb_entities is not None:
        write_json(VDB_ENTITIES, vdb_entities)
    if vdb_relations is not None:
        write_json(VDB_RELATIONS, vdb_relations)

    print("Done.")


if __name__ == "__main__":
    main()
