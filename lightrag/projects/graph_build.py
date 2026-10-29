"""Build explicitly confirmed project ontologies from already parsed material."""

from datetime import datetime, timezone

from fastapi import HTTPException

from lightrag.base import DocStatus
from lightrag.kg.shared_storage import (
    get_namespace_data,
    get_namespace_lock,
    get_storage_keyed_lock,
)
from lightrag.ontology import OntologyService, OntologyValidator
from lightrag.operate import merge_nodes_and_edges
from lightrag.utils import logger

from .service import ProjectManager, get_project_documents


async def build_project_graph(
    rag, project_id: str, ontology_id: str, ontology_version: str
):
    status = await get_namespace_data("pipeline_status", workspace=rag.workspace)
    lock = get_namespace_lock("pipeline_status", workspace=rag.workspace)
    async with lock:
        if status.get("busy", False):
            raise HTTPException(
                status_code=409, detail="资料正在处理或删除，请稍后再构建。"
            )
        status.update(
            {
                "busy": True,
                "job_name": "构建中文图谱",
                "job_start": datetime.now(timezone.utc).isoformat(),
                "cancellation_requested": False,
            }
        )
    try:
        return await _build_project_graph(
            rag, project_id, ontology_id, ontology_version, status, lock
        )
    finally:
        async with lock:
            status["busy"] = False
            pending = status.get("request_pending", False)
        if pending:
            try:
                await rag.apipeline_process_enqueue_documents()
            except Exception as error:  # noqa: BLE001 - Preserve the original build result.
                logger.exception(
                    "Failed to resume document parsing after graph construction: %s",
                    error,
                )


async def _build_project_graph(
    rag,
    project_id,
    ontology_id,
    ontology_version,
    pipeline_status,
    pipeline_status_lock,
):
    async with get_storage_keyed_lock(
        [project_id], namespace=f"{rag.project_metadata.workspace}:ontology"
    ):
        project = await ProjectManager(rag.project_metadata).get(project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="项目不存在。")
        ontology = await OntologyService(rag.project_metadata).get(ontology_id)
        if (
            not ontology
            or project.ontology_id != ontology_id
            or ontology.project_id != project_id
            or ontology.version != ontology_version
        ):
            raise HTTPException(
                status_code=409,
                detail="请先保存并确认当前本体；本体可能已更新，请刷新后重试。",
            )
        validation = OntologyValidator.validate(ontology)
        if not validation.is_valid:
            raise HTTPException(status_code=422, detail=validation.error_message)
        if not ontology.language.lower().startswith(("zh", "ch")) or any(
            not any("\u4e00" <= char <= "\u9fff" for char in value)
            for value in [*ontology.entity_types, *ontology.relation_types]
        ):
            raise HTTPException(
                status_code=409,
                detail="请先在本体页面生成或保存中文类型和关系（兜底类型使用‘其他’），再构建中文图谱。",
            )
        documents, _ = await get_project_documents(rag.doc_status, project_id)
        staged = [
            (doc_id, doc)
            for doc_id, doc in documents
            if doc.status == DocStatus.PREPROCESSED and doc.metadata.get("defer_graph")
        ]
        if not staged:
            raise HTTPException(
                status_code=409, detail="没有已解析且待构建的文档；旧图谱不会自动覆盖。"
            )
        config = rag._get_config_dict()
        config["addon_params"] = {
            **config["addon_params"],
            "language": "Chinese",
            "project_id": project_id,
            "ontology_id": ontology_id,
        }
        for doc_id, doc in staged:
            record = await rag.doc_status.get_by_id(doc_id)
            records = await rag.text_chunks.get_by_ids(doc.chunks_list or [])
            chunks = {
                key: value
                for key, value in zip(doc.chunks_list or [], records)
                if value
            }
            if (
                not chunks
                or len(chunks) != len(doc.chunks_list or [])
                or any(
                    chunk.get("full_doc_id") != doc_id
                    or chunk.get("project_id") != project_id
                    for chunk in chunks.values()
                )
            ):
                raise HTTPException(
                    status_code=409, detail="文档解析数据缺失或项目不匹配，请重新上传。"
                )
            try:
                await rag.doc_status.upsert(
                    {
                        doc_id: {
                            **record,
                            "metadata": {**doc.metadata, "graph_status": "building"},
                        }
                    }
                )
                results = await rag._process_extract_entities(
                    chunks, global_config=config
                )
                if results:
                    await merge_nodes_and_edges(
                        results,
                        rag.chunk_entity_relation_graph,
                        rag.entities_vdb,
                        rag.relationships_vdb,
                        config,
                        full_entities_storage=rag.full_entities,
                        full_relations_storage=rag.full_relations,
                        doc_id=doc_id,
                        pipeline_status=pipeline_status,
                        pipeline_status_lock=pipeline_status_lock,
                        llm_response_cache=rag.llm_response_cache,
                        entity_chunks_storage=rag.entity_chunks,
                        relation_chunks_storage=rag.relation_chunks,
                        text_chunks_storage=rag.text_chunks,
                        file_path=doc.file_path,
                    )
                await rag.chunks_vdb.upsert(chunks)
                await rag.doc_status.upsert(
                    {
                        doc_id: {
                            **record,
                            "status": DocStatus.PROCESSED,
                            "error_msg": None,
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                            "metadata": {
                                **doc.metadata,
                                "graph_status": "built",
                                "ontology_id": ontology_id,
                                "ontology_version": ontology_version,
                                "output_language": "Chinese",
                            },
                        }
                    }
                )
                await rag._insert_done()
            except Exception as error:
                await rag.doc_status.upsert(
                    {
                        doc_id: {
                            **record,
                            "error_msg": str(error),
                            "metadata": {**doc.metadata, "graph_status": "failed"},
                        }
                    }
                )
                await rag.doc_status.index_done_callback()
                raise HTTPException(
                    status_code=500,
                    detail="图谱构建失败，已保留解析资料，请检查模型服务并重试。",
                ) from error
        return {
            "status": "success",
            "built_documents": len(staged),
            "ontology_id": ontology_id,
            "ontology_version": ontology_version,
            "language": "Chinese",
        }
