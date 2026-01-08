"""项目管理模块

提供项目的 CRUD 操作和 workspace 管理，使用 KV Storage 存储。
"""

from .models import Project
from .service import ProjectManager

__all__ = ["Project", "ProjectManager"]
