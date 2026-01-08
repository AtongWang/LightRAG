"""实体丰富服务

提供基于本体的实体属性丰富功能。
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Callable
from enum import Enum

from ..utils import logger
from ..base import BaseKVStorage, BaseGraphStorage


class EnrichmentStatus(Enum):
    """丰富状态枚举"""
    PENDING = "pending"
    """待处理"""
    PROCESSING = "processing"
    """处理中"""
    COMPLETED = "completed"
    """已完成"""
    FAILED = "failed"
    """失败"""
    SKIPPED = "skipped"
    """跳过（如实体已存在丰富信息）"""


@dataclass
class EnrichmentConfig:
    """丰富配置"""
    batch_size: int = 10
    """每批处理的实体数量"""

    max_retries: int = 3
    """失败重试次数"""

    use_ontology: bool = True
    """是否使用本体指导丰富"""

    enrich_attributes: bool = True
    """是否丰富实体属性"""

    enrich_description: bool = True
    """是否丰富实体描述"""

    language: str = "English"
    """输出语言"""


@dataclass
class EnrichmentResult:
    """单个实体的丰富结果"""
    entity_name: str
    """实体名称"""

    status: EnrichmentStatus
    """丰富状态"""

    original_data: Dict[str, Any] = field(default_factory=dict)
    """原始实体数据"""

    enriched_data: Dict[str, Any] = field(default_factory=dict)
    """丰富后的数据"""

    error_message: Optional[str] = None
    """错误信息（如果失败）"""

    processing_time: float = 0.0
    """处理时间（秒）"""


@dataclass
class BatchEnrichmentResult:
    """批量丰富结果"""
    total_entities: int
    """总实体数"""

    succeeded: int
    """成功数"""

    failed: int
    """失败数"""

    skipped: int
    """跳过数"""

    results: List[EnrichmentResult] = field(default_factory=list)
    """详细结果列表"""

    total_time: float = 0.0
    """总处理时间（秒）"""


class EntityEnrichmentService:
    """实体丰富服务

    使用 LLM 基于本体信息丰富实体属性。
    """

    def __init__(
        self,
        graph_storage: BaseGraphStorage,
        kv_storage: BaseKVStorage,
        llm_model_func: Callable,
        config: EnrichmentConfig = None,
    ):
        """初始化实体丰富服务

        Args:
            graph_storage: 图存储实例
            kv_storage: KV 存储实例
            llm_model_func: LLM 模型函数
            config: 丰富配置
        """
        self.graph_storage = graph_storage
        self.kv_storage = kv_storage
        self.llm_model_func = llm_model_func
        self.config = config or EnrichmentConfig()

        # 导入 Prompt 模块
        from . import prompts
        self.prompts = prompts

    async def enrich_entity(
        self,
        entity_name: str,
        ontology_id: Optional[str] = None,
    ) -> EnrichmentResult:
        """丰富单个实体

        Args:
            entity_name: 实体名称
            ontology_id: 本体 ID（可选）

        Returns:
            EnrichmentResult: 丰富结果
        """
        import time
        start_time = time.time()

        result = EnrichmentResult(
            entity_name=entity_name,
            status=EnrichmentStatus.PENDING,
        )

        try:
            # 1. 获取实体数据
            entity_data = await self.graph_storage.get_node(entity_name)
            if not entity_data:
                result.status = EnrichmentStatus.FAILED
                result.error_message = f"Entity '{entity_name}' not found"
                return result

            result.original_data = entity_data

            # 2. 检查是否需要丰富
            # 如果实体已有完整的属性和描述，可以跳过
            if self._should_skip_enrichment(entity_data):
                result.status = EnrichmentStatus.SKIPPED
                result.enriched_data = entity_data
                logger.debug(f"Skipping enrichment for entity '{entity_name}': already enriched")
                return result

            result.status = EnrichmentStatus.PROCESSING

            # 3. 加载本体（如果启用）
            ontology = None
            if self.config.use_ontology and ontology_id:
                from ..ontology import OntologyService
                ontology_service = OntologyService(self.kv_storage)
                ontology = await ontology_service.get(ontology_id)

            # 4. 构建丰富 Prompt
            enrichment_prompt = self._build_enrichment_prompt(
                entity_data, ontology
            )

            # 5. 调用 LLM
            llm_response = await self.llm_model_func(
                enrichment_prompt,
                mode="enrichment"
            )

            # 6. 解析响应
            enriched_data = self._parse_enrichment_response(llm_response)

            # 7. 更新图存储
            await self._update_entity(entity_name, enriched_data)

            result.enriched_data = enriched_data
            result.status = EnrichmentStatus.COMPLETED

            logger.info(f"Successfully enriched entity '{entity_name}'")

        except Exception as e:
            result.status = EnrichmentStatus.FAILED
            result.error_message = str(e)
            logger.error(f"Failed to enrich entity '{entity_name}': {e}")

        finally:
            result.processing_time = time.time() - start_time

        return result

    async def enrich_entities(
        self,
        entity_names: List[str],
        ontology_id: Optional[str] = None,
    ) -> BatchEnrichmentResult:
        """批量丰富实体

        Args:
            entity_names: 实体名称列表
            ontology_id: 本体 ID（可选）

        Returns:
            BatchEnrichmentResult: 批量丰富结果
        """
        import time
        start_time = time.time()

        results = []
        succeeded = 0
        failed = 0
        skipped = 0

        # 分批处理
        for i in range(0, len(entity_names), self.config.batch_size):
            batch = entity_names[i:i + self.config.batch_size]

            logger.info(f"Processing enrichment batch {i//self.config.batch_size + 1}, size: {len(batch)}")

            # 并发处理当前批次
            batch_results = await self._process_batch(batch, ontology_id)
            results.extend(batch_results)

            # 统计
            for r in batch_results:
                if r.status == EnrichmentStatus.COMPLETED:
                    succeeded += 1
                elif r.status == EnrichmentStatus.FAILED:
                    failed += 1
                elif r.status == EnrichmentStatus.SKIPPED:
                    skipped += 1

        total_time = time.time() - start_time

        return BatchEnrichmentResult(
            total_entities=len(entity_names),
            succeeded=succeeded,
            failed=failed,
            skipped=skipped,
            results=results,
            total_time=total_time,
        )

    async def enrich_by_entity_type(
        self,
        entity_type: str,
        ontology_id: Optional[str] = None,
    ) -> BatchEnrichmentResult:
        """按实体类型丰富所有实体

        Args:
            entity_type: 实体类型
            ontology_id: 本体 ID（可选）

        Returns:
            BatchEnrichmentResult: 批量丰富结果
        """
        # 获取所有指定类型的实体
        # 注意：这需要图存储支持按类型查询
        # 暂时返回空结果
        logger.warning(f"enrich_by_entity_type not yet implemented for entity_type: {entity_type}")
        return BatchEnrichmentResult(
            total_entities=0,
            succeeded=0,
            failed=0,
            skipped=0,
        )

    async def _process_batch(
        self,
        entity_names: List[str],
        ontology_id: Optional[str],
    ) -> List[EnrichmentResult]:
        """处理一批实体

        Args:
            entity_names: 实体名称列表
            ontology_id: 本体 ID

        Returns:
            List[EnrichmentResult]: 丰富结果列表
        """
        import asyncio

        tasks = [
            self.enrich_entity(name, ontology_id)
            for name in entity_names
        ]

        return await asyncio.gather(*tasks)

    def _should_skip_enrichment(self, entity_data: Dict[str, Any]) -> bool:
        """判断是否应该跳过丰富

        Args:
            entity_data: 实体数据

        Returns:
            是否跳过
        """
        # 如果实体已经有详细的描述（超过一定长度），跳过
        description = entity_data.get("description", "")
        if description and len(description.split()) > 50:
            return True

        return False

    def _build_enrichment_prompt(
        self,
        entity_data: Dict[str, Any],
        ontology: Optional[Any],
    ) -> str:
        """构建丰富 Prompt

        Args:
            entity_data: 实体数据
            ontology: 本体对象（可选）

        Returns:
            Prompt 字符串
        """
        from ..prompt import PROMPTS

        entity_name = entity_data.get("entity_name", "Unknown")
        entity_type = entity_data.get("entity_type", "Unknown")
        description = entity_data.get("description", "")

        # 构建上下文
        context = {
            "entity_name": entity_name,
            "entity_type": entity_type,
            "description": description,
            "language": self.config.language,
        }

        # 如果有本体，添加本体信息
        if ontology:
            context["ontology_guidance"] = self._format_ontology_for_enrichment(
                ontology, entity_type
            )
        else:
            context["ontology_guidance"] = ""

        # 使用 Prompt 模板
        prompt_template = PROMPTS.get(
            "entity_enrichment_prompt",
            self.prompts.DEFAULT_ENRICHMENT_PROMPT
        )

        return prompt_template.format(**context)

    def _format_ontology_for_enrichment(
        self,
        ontology: Any,
        entity_type: str,
    ) -> str:
        """格式化本体信息用于丰富

        Args:
            ontology: 本体对象
            entity_type: 实体类型

        Returns:
            格式化的本体信息
        """
        lines = []

        # 添加实体类型说明
        if entity_type in ontology.entity_attributes:
            attrs = ontology.entity_attributes[entity_type]
            lines.append(f"Entity Type: {entity_type}")
            lines.append(f"Expected Attributes: {', '.join(attrs.keys())}")

            # 添加属性说明
            for attr_name, attr_def in attrs.items():
                if isinstance(attr_def, dict):
                    attr_type = attr_def.get("type", "string")
                    attr_desc = attr_def.get("description", "")
                    lines.append(f"  - {attr_name} ({attr_type}): {attr_desc}")

        return "\n".join(lines)

    def _parse_enrichment_response(self, response: str) -> Dict[str, Any]:
        """解析 LLM 响应

        Args:
            response: LLM 响应字符串

        Returns:
            解析后的丰富数据
        """
        # 尝试解析 JSON
        import json

        try:
            # 查找 JSON 代码块
            if "```json" in response:
                start = response.find("```json") + 7
                end = response.find("```", start)
                json_str = response[start:end].strip()
            elif "```" in response:
                start = response.find("```") + 3
                end = response.find("```", start)
                json_str = response[start:end].strip()
            else:
                json_str = response.strip()

            data = json.loads(json_str)

            # 验证必需字段
            if "description" not in data:
                data["description"] = ""

            return data

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse enrichment response as JSON: {e}")
            # 返回原始响应作为描述
            return {"description": response, "attributes": {}}

    async def _update_entity(
        self,
        entity_name: str,
        enriched_data: Dict[str, Any],
    ):
        """更新实体数据

        Args:
            entity_name: 实体名称
            enriched_data: 丰富后的数据
        """
        # 获取当前实体数据
        current_data = await self.graph_storage.get_node(entity_name)
        if not current_data:
            logger.warning(f"Entity '{entity_name}' not found during update")
            return

        # 合并数据
        updated_data = {**current_data}

        # 更新描述
        if "description" in enriched_data and enriched_data["description"]:
            # 合并描述（如果已有描述，可以追加或替换）
            existing_desc = updated_data.get("description", "")
            new_desc = enriched_data["description"]

            if existing_desc:
                # 选择更长的描述
                updated_data["description"] = new_desc if len(new_desc) > len(existing_desc) else existing_desc
            else:
                updated_data["description"] = new_desc

        # 更新属性
        if "attributes" in enriched_data:
            updated_data["attributes"] = {
                **updated_data.get("attributes", {}),
                **enriched_data["attributes"]
            }

        # 更新到图存储
        await self.graph_storage.upsert_node(entity_name, node_data=updated_data)

        logger.debug(f"Updated entity '{entity_name}' with enriched data")
