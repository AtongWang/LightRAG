"""实体丰富 API 路由

提供实体属性丰富功能的 API 端点。
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from lightrag import LightRAG
from lightrag.api.utils_api import get_combined_auth_dependency


# Request/Response Models
class EnrichEntityRequest(BaseModel):
    """丰富单个实体请求"""
    entity_name: str = Field(..., description="实体名称")
    ontology_id: Optional[str] = Field(None, description="本体 ID（可选）")
    attribute_name: Optional[str] = Field(None, description="要丰富的属性名称（可选，不指定则丰富所有属性）")
    prompt: Optional[str] = Field(None, description="自定义提示词（可选）")
    model: Optional[str] = Field("llm", description="模型类型：llm 或 vllm（默认llm）")
    image_url: Optional[str] = Field(None, description="图片URL（用于VLLM模型）")


class EnrichEntitiesRequest(BaseModel):
    """批量丰富实体请求"""
    entity_names: List[str] = Field(..., description="实体名称列表")
    ontology_id: Optional[str] = Field(None, description="本体 ID（可选）")


class EnrichmentStatusResponse(BaseModel):
    """丰富状态响应"""
    task_id: str = Field(..., description="任务 ID")
    status: str = Field(..., description="状态 (pending/processing/completed/failed)")
    message: str = Field(..., description="状态消息")


def create_enrichment_router(rag: LightRAG, api_key: str) -> APIRouter:
    """创建实体丰富路由

    Args:
        rag: LightRAG 实例
        api_key: API 密钥

    Returns:
        APIRouter: 实体丰富路由实例
    """
    router = APIRouter(
        prefix="/enrichment",
        tags=["enrichment"],
    )

    # Create combined auth dependency
    combined_auth = get_combined_auth_dependency(api_key)

    @router.post(
        "/entity",
        dependencies=[Depends(combined_auth)]
    )
    async def enrich_entity(request: EnrichEntityRequest):
        """丰富单个实体

        使用 LLM/VLLM 基于本体信息丰富单个实体的属性和描述。
        这是一个同步操作，会立即返回结果。

        支持的参数：
        - entity_name: 实体名称（必需）
        - ontology_id: 本体ID（可选）
        - attribute_name: 要丰富的属性名称（可选）
        - prompt: 自定义提示词（可选）
        - model: 模型类型，llm或vllm（默认llm）
        - image_url: 图片URL（用于VLLM）
        """
        try:
            # 根据模型类型选择方法
            if request.model == "vllm" and request.image_url:
                # 使用VLLM方法
                result = await rag.aenrich_entity_with_vllm(
                    entity_name=request.entity_name,
                    ontology_id=request.ontology_id,
                    attribute_name=request.attribute_name,
                    prompt=request.prompt,
                    image_url=request.image_url
                )
            else:
                # 使用标准LLM方法
                # 构建kwargs传递额外参数
                kwargs = {
                    "entity_name": request.entity_name,
                    "ontology_id": request.ontology_id
                }

                # 添加可选参数
                if request.attribute_name:
                    kwargs["attribute_name"] = request.attribute_name
                if request.prompt:
                    kwargs["prompt"] = request.prompt

                result = await rag.aenrich_entity(**kwargs)

            return result

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post(
        "/entities",
        dependencies=[Depends(combined_auth)]
    )
    async def enrich_entities(request: EnrichEntitiesRequest):
        """批量丰富实体

        使用 LLM 基于本体信息批量丰富实体的属性和描述。
        这是一个同步操作，会立即返回结果。
        """
        try:
            result = await rag.aenrich_entities(
                entity_names=request.entity_names,
                ontology_id=request.ontology_id
            )

            return result

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post(
        "/entity/background",
        response_model=EnrichmentStatusResponse,
        dependencies=[Depends(combined_auth)]
    )
    async def enrich_entity_background(
        request: EnrichEntityRequest,
        background_tasks: BackgroundTasks,
    ):
        """后台丰富单个实体

        在后台异步丰富单个实体。立即返回任务 ID，可以通过状态端点查询进度。
        """
        import uuid
        from lightrag.utils import generate_track_id

        # 生成任务 ID
        task_id = generate_track_id("enrich")

        # 定义后台任务
        async def background_enrich():
            try:
                await rag.aenrich_entity(
                    entity_name=request.entity_name,
                    ontology_id=request.ontology_id
                )
            except Exception as e:
                from lightrag.utils import logger
                logger.error(f"Background enrichment failed for entity '{request.entity_name}': {e}")

        # 添加到后台任务
        background_tasks.add_task(background_enrich)

        return EnrichmentStatusResponse(
            task_id=task_id,
            status="pending",
            message=f"Enrichment task queued for entity '{request.entity_name}'"
        )

    @router.post(
        "/entities/background",
        response_model=EnrichmentStatusResponse,
        dependencies=[Depends(combined_auth)]
    )
    async def enrich_entities_background(
        request: EnrichEntitiesRequest,
        background_tasks: BackgroundTasks,
    ):
        """后台批量丰富实体

        在后台异步批量丰富实体。立即返回任务 ID，可以通过状态端点查询进度。
        """
        from lightrag.utils import generate_track_id

        # 生成任务 ID
        task_id = generate_track_id("enrich_batch")

        # 定义后台任务
        async def background_enrich_batch():
            try:
                await rag.aenrich_entities(
                    entity_names=request.entity_names,
                    ontology_id=request.ontology_id
                )
            except Exception as e:
                from lightrag.utils import logger
                logger.error(f"Background batch enrichment failed: {e}")

        # 添加到后台任务
        background_tasks.add_task(background_enrich_batch)

        return EnrichmentStatusResponse(
            task_id=task_id,
            status="pending",
            message=f"Batch enrichment task queued for {len(request.entity_names)} entities"
        )

    return router
