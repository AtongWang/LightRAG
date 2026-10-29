"""Bounded generation context from a project's server-side parsed documents."""

from pathlib import PurePosixPath

from fastapi import HTTPException

from .service import get_project_documents


async def collect_project_materials(
    rag, project_id: str, document_ids: list[str] | None
):
    omitted = 0
    if document_ids is None:
        documents, _ = await get_project_documents(rag.doc_status, project_id)
        document_ids = [doc_id for doc_id, _ in documents]
        omitted = max(0, len(document_ids) - 100)
        document_ids = document_ids[:100]
    document_ids = list(dict.fromkeys(document_ids))
    if len(document_ids) > 100:
        raise HTTPException(status_code=422, detail="最多选择 100 个文件。")
    if not document_ids:
        raise HTTPException(
            status_code=422, detail="项目尚无可用于生成的文件，请先上传并解析文件。"
        )

    records = []
    for doc_id in document_ids:
        status = await rag.doc_status.get_by_id(doc_id)
        if not status or (status.get("metadata") or {}).get("project_id") != project_id:
            raise HTTPException(
                status_code=404, detail="所选文件不属于当前项目或已被删除。"
            )
        records.append((doc_id, status))

    documents, skipped = [], []
    sampled = False
    budget = 30000 // len(records)
    for doc_id, status in records:
        name = PurePosixPath(status.get("file_path", doc_id).replace("\\", "/")).name[
            :160
        ]
        record = await rag.full_docs.get_by_id(doc_id)
        content = (record or {}).get("content", "")
        if not content and status.get("chunks_list"):
            ids = status["chunks_list"]
            selected = sorted({0, len(ids) // 2, len(ids) - 1})
            chunks = await rag.text_chunks.get_by_ids(
                [ids[index] for index in selected]
            )
            content = "\n".join(chunk.get("content", "") for chunk in chunks if chunk)
            sampled |= len(ids) > len(selected)
        if not isinstance(content, str) or not content.strip():
            skipped.append({"id": doc_id, "file_name": name})
            continue
        if len(content) > budget:
            size = max(1, budget // 3 - 8)
            middle = len(content) // 2
            content = "\n[节选]\n".join(
                (content[:size], content[middle : middle + size], content[-size:])
            )
            sampled = True
        documents.append({"id": doc_id, "file_name": name, "excerpt": content})
    if not documents:
        raise HTTPException(
            status_code=422,
            detail="所选文件暂无可用解析正文，请等待解析完成或重试文件处理。",
        )
    return documents, {
        "used_files": len(documents),
        "skipped_files": len(skipped),
        "omitted_files": omitted,
        "sampled": sampled,
    }
