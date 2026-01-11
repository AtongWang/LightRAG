"""项目管理器实现

使用 KV Storage 存储项目数据，提供 CRUD 操作。
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

from ..utils import logger
from ..base import BaseKVStorage
from .models import Project


class ProjectManager:
    """项目管理器（基于 KV Storage）"""

    def __init__(self, kv_storage: BaseKVStorage):
        self.kv = kv_storage
        self._cache: Dict[str, Project] = {}

    async def create(
        self,
        name: str,
        description: str = "",
        cover_image: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Project:
        """创建项目"""
        project_id = f"proj_{uuid.uuid4().hex[:8]}"
        workspace = f"workspace_{project_id}"

        project = Project(
            project_id=project_id,
            name=name,
            description=description,
            ontology_id=None,
            workspace=workspace,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
            status='active',
            cover_image=cover_image,
            tags=tags or []
        )

        # 存储：key="project_{project_id}"
        await self.kv.upsert({
            f"project_{project_id}": project.to_dict()
        })

        logger.info(f"创建项目: {project_id}, workspace: {workspace}")
        return project

    async def get(self, project_id: str) -> Optional[Project]:
        """获取项目"""
        # 检查缓存
        if project_id in self._cache:
            return self._cache[project_id]

        # 从 KV 加载
        key = f"project_{project_id}"
        data = await self.kv.get_by_id(key)

        if data is None:
            return None

        # 过滤掉不需要的字段（如 _id, create_time 等）
        filtered_data = {k: v for k, v in data.items() if k in Project.__dataclass_fields__}

        project = Project(**filtered_data)
        self._cache[project_id] = project
        return project

    async def list_all(self) -> List[Project]:
        """列出所有项目"""
        # 直接访问 KV 存储的内部数据结构扫描所有项目
        projects = []

        # 使用 filter_keys 的反向逻辑来获取存在的项目键
        # 首先扫描存储中所有以 "project_" 开头的键
        if hasattr(self.kv, '_data') and hasattr(self.kv, '_storage_lock'):
            async with self.kv._storage_lock:
                all_keys = list(self.kv._data.keys())
        else:
            # 回退到缓存
            return list(self._cache.values())

        # 过滤出项目键
        project_keys = [k for k in all_keys if k.startswith("project_")]

        # 获取所有项目
        for key in project_keys:
            project_id = key.replace("project_", "", 1)
            project = await self.get(project_id)
            if project:
                projects.append(project)

        return projects

    async def delete(self, project_id: str):
        """删除项目"""
        key = f"project_{project_id}"
        await self.kv.delete([key])

        # 清除缓存
        self._cache.pop(project_id, None)

        # 同时删除本体
        from ..ontology import OntologyService
        ontology_service = OntologyService(self.kv)
        await ontology_service.delete(project_id)

        logger.info(f"删除项目: {project_id}")

    async def set_ontology_id(self, project_id: str, ontology_id: str):
        """设置项目的 ontology_id"""
        project = await self.get(project_id)
        if project is None:
            raise ValueError(f"项目 {project_id} 不存在")

        project.ontology_id = ontology_id
        project.updated_at = datetime.utcnow().isoformat()

        # 更新存储
        await self.kv.upsert({
            f"project_{project_id}": project.to_dict()
        })

        # 更新缓存
        self._cache[project_id] = project
        logger.info(f"更新项目 {project_id} 的 ontology_id: {ontology_id}")

    async def update(self, project_id: str, **kwargs) -> Project:
        """更新项目信息

        Args:
            project_id: 项目ID
            **kwargs: 要更新的字段（name, description等）

        Returns:
            更新后的项目对象
        """
        project = await self.get(project_id)
        if project is None:
            raise ValueError(f"项目 {project_id} 不存在")

        # 更新允许的字段
        if 'name' in kwargs and kwargs['name'] is not None:
            project.name = kwargs['name']
        if 'description' in kwargs and kwargs['description'] is not None:
            project.description = kwargs['description']
        if 'cover_image' in kwargs:
            project.cover_image = kwargs['cover_image']
        if 'tags' in kwargs and kwargs['tags'] is not None:
            project.tags = kwargs['tags']

        # 更新时间戳
        project.updated_at = datetime.utcnow().isoformat()

        # 更新存储
        await self.kv.upsert({
            f"project_{project_id}": project.to_dict()
        })

        # 更新缓存
        self._cache[project_id] = project
        logger.info(f"更新项目: {project_id}")

        return project
