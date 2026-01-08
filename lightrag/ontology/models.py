"""本体数据模型

定义 OntologySpec 数据结构和相关的验证结果。
"""

from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
from datetime import datetime


@dataclass
class OntologySpec:
    """本体规格"""
    ontology_id: str
    project_id: str
    name: str
    description: str
    version: str
    language: str
    entity_types: List[str]
    relation_types: List[str]
    entity_attributes: Dict[str, Dict[str, Any]]
    relation_attributes: Dict[str, Dict[str, Any]]
    normalization_rules: Optional[Dict[str, Any]] = None
    created_at: str = None
    updated_at: str = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow().isoformat()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ValidationResult:
    """验证结果"""
    is_valid: bool
    error_message: Optional[str] = None


@dataclass
class AttributeDefinition:
    """属性定义"""
    type: str
    required: bool
    desc: str
    # 可选字段
    enum_values: Optional[List[str]] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
