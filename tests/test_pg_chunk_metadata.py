"""PostgreSQL adapter contract without requiring a database server."""

import json
import re
from copy import deepcopy

import pytest

pytest.importorskip("asyncpg")
pytest.importorskip("pgvector")

from lightrag.kg.postgres_impl import PGKVStorage


@pytest.mark.asyncio
async def test_chunk_upsert_and_reads_preserve_validated_extraction():
    class Database:
        row = None

        async def execute(self, sql, params):
            columns = re.search(
                r"INSERT INTO LIGHTRAG_DOC_CHUNKS\s*\((.*?)\)", sql, re.DOTALL
            ).group(1)
            assert list(params) == [column.strip() for column in columns.split(",")]
            assert len(re.findall(r"\$\d+", sql)) == len(params)
            self.row = deepcopy(params)

        async def query(self, sql, params, multirows=False):
            row = deepcopy(self.row)
            row["create_time"] = row["update_time"] = 0
            return [row] if multirows else row

    store = PGKVStorage(
        namespace="text_chunks",
        workspace="audit",
        global_config={"embedding_batch_num": 10},
        embedding_func=None,
    )
    store.db = Database()
    chunk = {
        "tokens": 1,
        "chunk_order_index": 0,
        "full_doc_id": "doc",
        "content": "catalog",
        "file_path": "a.txt",
        "project_id": "project-a",
        "is_multimodal": True,
        "extraction": {"nodes": {"scoped": []}, "edges": []},
    }
    await store.upsert({"chunk": chunk})
    assert "chunk_metadata" in store.db.row
    assert (
        json.loads(store.db.row["chunk_metadata"])["extraction"] == chunk["extraction"]
    )
    single = await store.get_by_id("chunk")
    batch = await store.get_by_ids(["chunk", "missing"])
    for record in (single, batch[0]):
        assert record["project_id"] == "project-a"
        assert record["extraction"] == chunk["extraction"]
        assert record["is_multimodal"] is True
