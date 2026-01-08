"""项目数据模型

定义 Project 数据结构。
"""

from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any


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

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
