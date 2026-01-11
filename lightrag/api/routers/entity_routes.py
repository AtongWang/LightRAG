"""实体管理 API 路由

提供实体的 CRUD 操作和搜索功能的 API 端点。
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from lightrag import LightRAG
from lightrag.api.utils_api import get_combined_auth_dependency


# Request/Response Models
class EntityUpdateRequest(BaseModel):
    """更新实体请求"""
    entity_type: Optional[str] = Field(None, description="实体类型")
    description: Optional[str] = Field(None, description="实体描述")
    attributes: Optional[Dict[str, Any]] = Field(None, description="实体属性")
    source_id: Optional[str] = Field(None, description="来源ID")


class EntitySearchRequest(BaseModel):
    """搜索实体请求"""
    query: Optional[str] = Field(None, description="搜索关键词")
    entity_types: Optional[List[str]] = Field(None, description="实体类型过滤")
    limit: Optional[int] = Field(10, description="返回数量限制")
    offset: Optional[int] = Field(0, description="偏移量")


class GraphDataResponse(BaseModel):
    """图谱数据响应"""
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    stats: Dict[str, Any]


def create_entity_router(rag: LightRAG, api_key: str) -> APIRouter:
    """创建实体路由

    Args:
        rag: LightRAG 实例
        api_key: API 密钥

    Returns:
        APIRouter: 实体路由实例
    """
    router = APIRouter(
        prefix="/entities",
        tags=["entities"],
    )

    # Create combined auth dependency
    combined_auth = get_combined_auth_dependency(api_key)

    # Note: Static routes (like /search, /stats) must be defined BEFORE dynamic routes (like /{entity_id})
    # otherwise FastAPI will treat "search" and "stats" as entity_id values

    @router.get(
        "/search",
        dependencies=[Depends(combined_auth)]
    )
    async def search_entities(
        query: Optional[str] = Query(None, description="搜索关键词"),
        entity_types: Optional[List[str]] = Query(None, description="实体类型过滤"),
        limit: int = Query(10, description="返回数量限制"),
        offset: int = Query(0, description="偏移量"),
        project_id: Optional[str] = Query(None, description="项目ID（用于workspace过滤）")
    ):
        """搜索实体

        根据关键词和类型搜索实体。
        """
        try:
            graph_storage = rag.graph_storage

            # 如果指定了project_id，使用对应的workspace
            from lightrag.projects import ProjectManager
            from lightrag.kg.shared_storage import get_namespace_data

            workspace = None
            if project_id:
                # 获取项目的workspace
                kv_storage = rag.llm_response_cache
                project_manager = ProjectManager(kv_storage)
                project = await project_manager.get(project_id)
                if project:
                    workspace = project.workspace

            # 从图谱存储获取所有节点
            # 注意：不同的graph_storage实现可能有不同的方法
            try:
                # 尝试使用get_all_nodes方法
                all_nodes = await graph_storage.get_all_nodes(workspace)
            except AttributeError:
                # 如果没有get_all_nodes，使用其他方法
                all_nodes = []
                # 这需要根据具体的graph_storage实现来处理

            # 过滤节点
            filtered_nodes = []
            for node in all_nodes:
                # 类型过滤
                if entity_types and node.get("entity_type") not in entity_types:
                    continue

                # 关键词过滤
                if query:
                    entity_name = node.get("entity_name", "").lower()
                    description = node.get("description", "").lower()
                    if query.lower() not in entity_name and query.lower() not in description:
                        continue

                filtered_nodes.append(node)

            # 分页
            total = len(filtered_nodes)
            result_nodes = filtered_nodes[offset:offset + limit]

            return {
                "entities": result_nodes,
                "total": total,
                "limit": limit,
                "offset": offset
            }

        except Exception as e:
            from lightrag.utils import logger
            logger.error(f"Error searching entities: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.get(
        "/stats",
        dependencies=[Depends(combined_auth)]
    )
    async def get_entity_stats(
        project_id: Optional[str] = Query(None, description="项目ID")
    ):
        """获取实体统计信息

        返回指定项目或全局的实体统计数据。
        """
        try:
            graph_storage = rag.graph_storage

            # 如果指定了project_id，使用对应的workspace
            workspace = None
            if project_id:
                from lightrag.projects import ProjectManager
                kv_storage = rag.llm_response_cache
                project_manager = ProjectManager(kv_storage)
                project = await project_manager.get(project_id)
                if project:
                    workspace = project.workspace

            # 获取节点数量
            try:
                node_count = await graph_storage.get_node_count(workspace)
            except AttributeError:
                # 如果没有get_node_count方法，使用其他方法
                node_count = 0

            # 获取边数量
            try:
                edge_count = await graph_storage.get_edge_count(workspace)
            except AttributeError:
                edge_count = 0

            return {
                "node_count": node_count,
                "edge_count": edge_count,
                "project_id": project_id,
                "workspace": workspace
            }

        except Exception as e:
            from lightrag.utils import logger
            logger.error(f"Error getting entity stats: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # Dynamic routes with path parameters must be defined AFTER static routes
    @router.get(
        "/{entity_id}",
        dependencies=[Depends(combined_auth)]
    )
    async def get_entity(entity_id: str):
        """获取单个实体

        根据 ID 获取实体的详细信息。
        """
        try:
            # 从图谱存储中获取实体
            graph_storage = rag.graph_storage

            # 获取节点数据
            node_data = await graph_storage.get_node(entity_id)

            if node_data is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Entity '{entity_id}' not found"
                )

            return {
                "id": entity_id,
                "entity_name": node_data.get("entity_name", entity_id),
                "entity_type": node_data.get("entity_type", "unknown"),
                "description": node_data.get("description", ""),
                "attributes": node_data,
            }

        except HTTPException:
            raise
        except Exception as e:
            from lightrag.utils import logger
            logger.error(f"Error getting entity {entity_id}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.put(
        "/{entity_id}",
        dependencies=[Depends(combined_auth)]
    )
    async def update_entity(
        entity_id: str,
        request: EntityUpdateRequest,
    ):
        """更新实体

        更新实体的类型、描述或属性。
        """
        try:
            graph_storage = rag.graph_storage

            # 获取现有实体
            existing = await graph_storage.get_node(entity_id)
            if existing is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Entity '{entity_id}' not found"
                )

            # 构建更新数据
            update_data = existing.copy()

            if request.entity_type is not None:
                update_data["entity_type"] = request.entity_type
            if request.description is not None:
                update_data["description"] = request.description
            if request.attributes is not None:
                update_data.update(request.attributes)

            # 更新节点
            await graph_storage.upsert_node(
                entity_id,
                entity_type=update_data.get("entity_type", "unknown"),
                entity_name=update_data.get("entity_name", entity_id),
                description=update_data.get("description", ""),
                source_id=update_data.get("source_id", entity_id),
                **{k: v for k, v in update_data.items()
                   if k not in ["entity_type", "entity_name", "description", "source_id"]}
            )

            return {
                "message": f"Entity '{entity_id}' updated successfully",
                "entity": update_data
            }

        except HTTPException:
            raise
        except Exception as e:
            from lightrag.utils import logger
            logger.error(f"Error updating entity {entity_id}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.delete(
        "/{entity_id}",
        dependencies=[Depends(combined_auth)]
    )
    async def delete_entity(entity_id: str):
        """删除实体

        删除指定的实体及其相关的所有边。
        """
        try:
            graph_storage = rag.graph_storage

            # 检查实体是否存在
            existing = await graph_storage.get_node(entity_id)
            if existing is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Entity '{entity_id}' not found"
                )

            # 删除节点（会自动删除相关的边）
            await graph_storage.delete_node(entity_id)

            return {
                "message": f"Entity '{entity_id}' deleted successfully"
            }

        except HTTPException:
            raise
        except Exception as e:
            from lightrag.utils import logger
            logger.error(f"Error deleting entity {entity_id}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    return router
