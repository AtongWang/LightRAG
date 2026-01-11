"""本体管理 API 路由

提供本体的 CRUD 操作和版本管理的 API 端点。
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from lightrag import LightRAG
from lightrag.ontology import OntologyService, OntologyValidator, OntologySpec
from lightrag.api.utils_api import get_combined_auth_dependency
from lightrag.utils import logger
from ..config import global_args


# Request/Response Models
class CreateOntologyRequest(BaseModel):
    """创建本体请求"""
    project_id: str = Field(..., description="项目 ID")
    name: str = Field(..., description="本体名称")
    description: str = Field(default="", description="本体描述")
    language: str = Field(default="zh", description="语言 (zh/en)")
    entity_types: List[str] = Field(default_factory=list, description="实体类型列表")
    relation_types: List[str] = Field(default_factory=list, description="关系类型列表")
    entity_attributes: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict, description="实体属性定义"
    )
    relation_attributes: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict, description="关系属性定义"
    )
    normalization_rules: Optional[Dict[str, Any]] = Field(
        default=None, description="规范化规则"
    )


class UpdateOntologyRequest(BaseModel):
    """更新本体请求"""
    name: Optional[str] = Field(None, description="本体名称")
    description: Optional[str] = Field(None, description="本体描述")
    entity_types: Optional[List[str]] = Field(None, description="实体类型列表")
    relation_types: Optional[List[str]] = Field(None, description="关系类型列表")
    entity_attributes: Optional[Dict[str, Dict[str, Any]]] = Field(
        None, description="实体属性定义"
    )
    relation_attributes: Optional[Dict[str, Dict[str, Any]]] = Field(
        None, description="关系属性定义"
    )
    normalization_rules: Optional[Dict[str, Any]] = Field(
        None, description="规范化规则"
    )


class OntologyResponse(BaseModel):
    """本体响应"""
    ontology_id: str
    project_id: str
    version: str
    language: str
    name: str
    description: str
    entity_types: List[str]
    relation_types: List[str]
    entity_attributes: Dict[str, Dict[str, Any]]
    relation_attributes: Dict[str, Dict[str, Any]]
    normalization_rules: Optional[Dict[str, Any]]
    created_at: str
    updated_at: str


def create_ontology_router(rag: LightRAG, api_key: str) -> APIRouter:
    """创建本体路由

    Args:
        rag: LightRAG 实例
        api_key: API 密钥

    Returns:
        APIRouter: 本体路由实例
    """
    router = APIRouter(
        prefix="/ontology",
        tags=["ontology"],
    )

    # Create combined auth dependency
    combined_auth = get_combined_auth_dependency(api_key)

    @router.post(
        "/create",
        response_model=OntologyResponse,
        dependencies=[Depends(combined_auth)]
    )
    async def create_ontology(request: CreateOntologyRequest):
        """创建新的本体

        为指定项目创建一个新的本体规范。
        """
        try:
            # 获取 KV Storage
            kv_storage = rag.llm_response_cache

            # 创建本体服务
            ontology_service = OntologyService(kv_storage)

            # 生成 ontology_id
            import uuid
            ontology_id = f"onto_{uuid.uuid4().hex[:8]}"

            # 创建 OntologySpec 对象
            from datetime import datetime
            from lightrag.ontology.models import OntologySpec

            ontology_spec = OntologySpec(
                ontology_id=ontology_id,
                project_id=request.project_id,
                name=request.name,
                description=request.description,
                version="1.0",
                language=request.language,
                entity_types=request.entity_types,
                relation_types=request.relation_types,
                entity_attributes=request.entity_attributes,
                relation_attributes=request.relation_attributes,
                normalization_rules=request.normalization_rules,
                created_at=datetime.utcnow().isoformat(),
                updated_at=datetime.utcnow().isoformat(),
            )

            # 创建本体
            ontology = await ontology_service.create(ontology_spec)

            # 更新项目的 ontology_id
            from lightrag.projects import ProjectManager
            project_manager = ProjectManager(kv_storage)
            await project_manager.set_ontology_id(request.project_id, ontology.ontology_id)

            return OntologyResponse(**ontology.to_dict())

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get(
        "/{ontology_id}",
        response_model=OntologyResponse,
        dependencies=[Depends(combined_auth)]
    )
    async def get_ontology(ontology_id: str):
        """获取本体

        根据 ID 获取本体规范。
        """
        try:
            kv_storage = rag.llm_response_cache
            ontology_service = OntologyService(kv_storage)

            ontology = await ontology_service.get(ontology_id)
            if not ontology:
                raise HTTPException(status_code=404, detail=f"Ontology '{ontology_id}' not found")

            return OntologyResponse(**ontology.to_dict())

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.put(
        "/{ontology_id}",
        response_model=OntologyResponse,
        dependencies=[Depends(combined_auth)]
    )
    async def update_ontology(
        ontology_id: str,
        request: UpdateOntologyRequest,
    ):
        """更新本体

        更新现有本体的部分字段。
        """
        try:
            kv_storage = rag.llm_response_cache
            ontology_service = OntologyService(kv_storage)

            # 获取现有本体
            ontology = await ontology_service.get(ontology_id)
            if not ontology:
                raise HTTPException(status_code=404, detail=f"Ontology '{ontology_id}' not found")

            # 更新字段
            update_data = request.model_dump(exclude_unset=True)
            logger.debug(f"Update ontology {ontology_id} with data: {update_data}")
            for field, value in update_data.items():
                if hasattr(ontology, field) and value is not None:
                    setattr(ontology, field, value)

            # 更新 updated_at 时间
            from datetime import datetime
            ontology.updated_at = datetime.utcnow().isoformat()

            # 保存更新（update 方法需要 project_id）
            updated_ontology = await ontology_service.update(ontology.project_id, ontology)

            return OntologyResponse(**updated_ontology.to_dict())

        except HTTPException:
            raise
        except Exception as e:
            import traceback
            logger.error(f"Update ontology error: {e}\n{traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.delete(
        "/{ontology_id}",
        dependencies=[Depends(combined_auth)]
    )
    async def delete_ontology(ontology_id: str):
        """删除本体

        删除指定的本体规范。
        """
        try:
            kv_storage = rag.llm_response_cache
            ontology_service = OntologyService(kv_storage)

            # 检查本体是否存在
            ontology = await ontology_service.get(ontology_id)
            if not ontology:
                raise HTTPException(status_code=404, detail=f"Ontology '{ontology_id}' not found")

            # 删除本体
            await ontology_service.delete(ontology_id)

            return {"message": f"Ontology '{ontology_id}' deleted successfully"}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get(
        "/project/{project_id}",
        response_model=OntologyResponse,
        dependencies=[Depends(combined_auth)]
    )
    async def get_ontology_by_project(project_id: str):
        """获取项目的本体

        获取指定项目的当前本体。
        """
        try:
            kv_storage = rag.llm_response_cache
            ontology_service = OntologyService(kv_storage)

            ontology = await ontology_service.get_by_project(project_id)
            if not ontology:
                raise HTTPException(
                    status_code=404,
                    detail=f"No ontology found for project '{project_id}'"
                )

            return OntologyResponse(**ontology.to_dict())

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get(
        "/{ontology_id}/validate",
        dependencies=[Depends(combined_auth)]
    )
    async def validate_ontology(ontology_id: str):
        """验证本体

        验证本体规范的完整性和一致性。
        """
        try:
            kv_storage = rag.llm_response_cache
            ontology_service = OntologyService(kv_storage)
            validator = OntologyValidator()

            # 获取本体
            ontology = await ontology_service.get(ontology_id)
            if not ontology:
                raise HTTPException(status_code=404, detail=f"Ontology '{ontology_id}' not found")

            # 验证
            result = validator.validate(ontology)

            return {
                "is_valid": result.is_valid,
                "error_message": result.error_message,
                "warnings": [],
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get(
        "/{ontology_id}/export",
        dependencies=[Depends(combined_auth)]
    )
    async def export_ontology(ontology_id: str):
        """导出本体

        导出本体规范为 JSON 格式，用于备份或迁移。
        """
        try:
            kv_storage = rag.llm_response_cache
            ontology_service = OntologyService(kv_storage)

            # 获取本体
            ontology = await ontology_service.get(ontology_id)
            if not ontology:
                raise HTTPException(status_code=404, detail=f"Ontology '{ontology_id}' not found")

            # 返回本体数据（排除一些内部字段）
            export_data = ontology.to_dict()
            return export_data

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post(
        "/import",
        response_model=OntologyResponse,
        dependencies=[Depends(combined_auth)]
    )
    async def import_ontology(request: CreateOntologyRequest):
        """导入本体

        从 JSON 数据导入本体规范，用于恢复或迁移。
        如果项目已有本体，会自动覆盖。
        会创建新的本体 ID。
        """
        try:
            kv_storage = rag.llm_response_cache
            ontology_service = OntologyService(kv_storage)

            # 生成新的 ontology_id
            import uuid
            ontology_id = f"onto_{uuid.uuid4().hex[:8]}"

            # 创建 OntologySpec 对象
            from datetime import datetime
            from lightrag.ontology.models import OntologySpec

            ontology_spec = OntologySpec(
                ontology_id=ontology_id,
                project_id=request.project_id,
                name=request.name,
                description=request.description,
                version="1.0",
                language=request.language,
                entity_types=request.entity_types,
                relation_types=request.relation_types,
                entity_attributes=request.entity_attributes,
                relation_attributes=request.relation_attributes,
                normalization_rules=request.normalization_rules,
                created_at=datetime.utcnow().isoformat(),
                updated_at=datetime.utcnow().isoformat(),
            )

            # 创建本体 (force=True to overwrite if exists)
            ontology = await ontology_service.create(ontology_spec, force=True)

            # 更新项目的 ontology_id
            from lightrag.projects import ProjectManager
            project_manager = ProjectManager(kv_storage)
            try:
                await project_manager.set_ontology_id(request.project_id, ontology.ontology_id)
            except Exception as e:
                # 项目可能不存在，这不应该阻止本体导入
                logger.warning(f"Could not update project with ontology_id: {e}")

            return OntologyResponse(**ontology.to_dict())

        except Exception as e:
            import traceback
            logger.error(f"Import ontology error: {e}\n{traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

    return router
