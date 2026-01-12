"""项目管理 API 路由

提供项目的 CRUD 操作和 workspace 管理的 API 端点。
"""

from typing import List, Optional
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field

from lightrag import LightRAG
from lightrag.projects import ProjectManager
from lightrag.api.utils_api import get_combined_auth_dependency
from lightrag.utils import logger
from lightrag.constants import GRAPH_FIELD_SEP


# Request/Response Models
class CreateProjectRequest(BaseModel):
    """创建项目请求"""
    name: str = Field(..., description="项目名称")
    description: str = Field(default="", description="项目描述")
    cover_image: Optional[str] = Field(None, description="封面图片URL")
    tags: Optional[List[str]] = Field(default_factory=list, description="标签列表")


class UpdateProjectRequest(BaseModel):
    """更新项目请求"""
    name: Optional[str] = Field(None, description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    cover_image: Optional[str] = Field(None, description="封面图片URL")
    tags: Optional[List[str]] = Field(None, description="标签列表")


class ProjectStats(BaseModel):
    """项目统计"""
    document_count: int = 0
    entity_count: int = 0
    relation_count: int = 0
    last_updated: Optional[str] = None


class ProjectResponse(BaseModel):
    """项目响应"""
    project_id: str
    name: str
    description: str
    ontology_id: Optional[str]
    workspace: str
    created_at: str
    updated_at: str
    status: str
    cover_image: Optional[str] = None
    tags: List[str] = []
    stats: Optional[ProjectStats] = None


def create_project_router(rag: LightRAG, api_key: str) -> APIRouter:
    """创建项目路由

    Args:
        rag: LightRAG 实例
        api_key: API 密钥

    Returns:
        APIRouter: 项目路由实例
    """
    router = APIRouter(
        prefix="/projects",
        tags=["projects"],
    )

    # Create combined auth dependency
    combined_auth = get_combined_auth_dependency(api_key)

    async def get_project_stats(project) -> ProjectStats:
        stats = ProjectStats(last_updated=project.updated_at)
        try:
            docs_list = []
            try:
                docs_list, total_docs = await rag.doc_status.get_docs_paginated(
                    project_id=project.project_id,
                    page=1,
                    page_size=10000,
                )
                stats.document_count = total_docs
            except Exception as e:
                logger.warning(f"Failed to get document count for project {project.project_id}: {e}")

            if not docs_list:
                return stats

            project_chunk_ids = set()
            for _, doc_status in docs_list:
                if doc_status.chunks_list:
                    project_chunk_ids.update(doc_status.chunks_list)

            if not project_chunk_ids:
                return stats

            try:
                graph_storage = rag.chunk_entity_relation_graph
                all_nodes = await graph_storage.get_all_nodes()
                all_edges = await graph_storage.get_all_edges()

                def node_belongs_to_project(node: dict) -> bool:
                    source_id = node.get("source_id", "")
                    if not source_id:
                        return False
                    node_chunk_ids = set(
                        cid.strip() for cid in source_id.split(GRAPH_FIELD_SEP) if cid.strip()
                    )
                    return bool(node_chunk_ids & project_chunk_ids)

                filtered_nodes = [node for node in all_nodes if node_belongs_to_project(node)]
                filtered_node_ids = set(
                    node.get("id", node.get("entity_name", "")) for node in filtered_nodes
                )

                def edge_belongs_to_project(edge: dict) -> bool:
                    src = edge.get("source", edge.get("src_id", ""))
                    tgt = edge.get("target", edge.get("tgt_id", ""))
                    return src in filtered_node_ids and tgt in filtered_node_ids

                filtered_edges = [edge for edge in all_edges if edge_belongs_to_project(edge)]

                stats.entity_count = len(filtered_nodes)
                stats.relation_count = len(filtered_edges)
            except Exception as e:
                logger.warning(f"Failed to compute graph stats for project {project.project_id}: {e}")
        except Exception as e:
            logger.warning(f"Failed to compute stats for project {project.project_id}: {e}")

        return stats

    async def build_project_response(project) -> ProjectResponse:
        stats = await get_project_stats(project)
        return ProjectResponse(**project.to_dict(), stats=stats)

    @router.post(
        "/create",
        response_model=ProjectResponse,
        dependencies=[Depends(combined_auth)]
    )
    async def create_project(request: CreateProjectRequest):
        """创建新项目

        创建一个新的项目，自动分配唯一的 project_id 和 workspace。
        """
        try:
            kv_storage = rag.llm_response_cache
            project_manager = ProjectManager(kv_storage)

            project = await project_manager.create(
                name=request.name,
                description=request.description,
                cover_image=request.cover_image,
                tags=request.tags or [],
            )

            return await build_project_response(project)

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get(
        "/{project_id}",
        response_model=ProjectResponse,
        dependencies=[Depends(combined_auth)]
    )
    async def get_project(project_id: str):
        """获取项目

        根据 ID 获取项目信息。
        """
        try:
            kv_storage = rag.llm_response_cache
            project_manager = ProjectManager(kv_storage)

            project = await project_manager.get(project_id)
            if not project:
                raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

            return await build_project_response(project)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get(
        "/",
        response_model=List[ProjectResponse],
        dependencies=[Depends(combined_auth)]
    )
    async def list_projects():
        """列出所有项目

        获取所有项目的列表。
        """
        try:
            kv_storage = rag.llm_response_cache
            project_manager = ProjectManager(kv_storage)

            projects = await project_manager.list_all()

            return await asyncio.gather(*(build_project_response(p) for p in projects))

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.put(
        "/{project_id}",
        response_model=ProjectResponse,
        dependencies=[Depends(combined_auth)]
    )
    async def update_project(
        project_id: str,
        request: UpdateProjectRequest,
    ):
        """更新项目

        更新项目的基本信息（名称、描述）。
        """
        try:
            kv_storage = rag.llm_response_cache
            project_manager = ProjectManager(kv_storage)

            # 使用新的update方法
            update_data = {}
            if request.name is not None:
                update_data['name'] = request.name
            if request.description is not None:
                update_data['description'] = request.description
            if request.cover_image is not None:
                update_data['cover_image'] = request.cover_image
            if request.tags is not None:
                update_data['tags'] = request.tags

            project = await project_manager.update(project_id, **update_data)

            return await build_project_response(project)

        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.delete(
        "/{project_id}",
        dependencies=[Depends(combined_auth)]
    )
    async def delete_project(project_id: str):
        """删除项目

        删除指定的项目及其关联的本体。
        """
        try:
            kv_storage = rag.llm_response_cache
            project_manager = ProjectManager(kv_storage)

            # 检查项目是否存在
            project = await project_manager.get(project_id)
            if not project:
                raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

            # 删除项目（同时会删除关联的本体）
            await project_manager.delete(project_id)

            return {"message": f"Project '{project_id}' deleted successfully"}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post(
        "/{project_id}/set-ontology",
        dependencies=[Depends(combined_auth)]
    )
    async def set_project_ontology(
        project_id: str,
        ontology_id: str = Body(..., description="本体 ID"),
    ):
        """设置项目的本体

        为项目指定关联的本体 ID。
        """
        try:
            kv_storage = rag.llm_response_cache
            project_manager = ProjectManager(kv_storage)

            # 检查项目是否存在
            project = await project_manager.get(project_id)
            if not project:
                raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

            # 设置 ontology_id
            await project_manager.set_ontology_id(project_id, ontology_id)

            return {
                "message": f"Ontology '{ontology_id}' set for project '{project_id}'"
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
