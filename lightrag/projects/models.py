"""项目数据模型

定义 Project 数据结构。
"""

from dataclasses import dataclass, asdict, field
from typing import Optional, Dict, Any, List


@dataclass
class Project:
    """项目数据模型"""
    project_id: str
    name: str
    description: str
    ontology_id: Optional[str]
    workspace: str
    created_at: str
    updated_at: str
    status: str  # 'active' | 'archived' | 'deleted'
    cover_image: Optional[str] = None  # 封面图片URL
    tags: List[str] = field(default_factory=list)  # 标签列表

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
