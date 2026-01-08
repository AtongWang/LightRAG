"""实体丰富模块

提供实体属性丰富功能，基于本体信息使用 LLM 丰富实体的属性和描述。
"""

from .service import EntityEnrichmentService, EnrichmentResult, EnrichmentConfig

__all__ = ["EntityEnrichmentService", "EnrichmentResult", "EnrichmentConfig"]
