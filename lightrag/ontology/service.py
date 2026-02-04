"""本体服务实现

使用 KV Storage 存储本体数据，提供 CRUD 操作。
"""

from typing import Dict, Any, Optional
from datetime import datetime

from ..utils import logger
from ..base import BaseKVStorage
from .models import OntologySpec
from .validator import OntologyValidator
from .prompts import OntologyPromptInjector


class OntologyService:
    """本体服务（基于 KV Storage 存储）"""

    def __init__(self, kv_storage: BaseKVStorage):
        self.kv = kv_storage
        self._cache: Dict[str, OntologySpec] = {}
        self._cache_ttl: int = 3600  # 1 小时
        self.prompt_injector = OntologyPromptInjector()

    def _sanitize_spec_dict(self, spec_dict: Dict[str, Any]) -> Dict[str, Any]:
        allowed_keys = set(OntologySpec.__dataclass_fields__.keys())
        return {key: value for key, value in spec_dict.items() if key in allowed_keys}

    async def create(self, spec: OntologySpec, force: bool = False) -> OntologySpec:
        """创建本体

        Args:
            spec: 本体规格
            force: 如果为 True，则覆盖已有本体
        """
        # 验证
        result = OntologyValidator.validate(spec)
        if not result.is_valid:
            raise ValueError(f"本体验证失败: {result.error_message}")

        # 检查是否已存在
        current_key = f"onto_{spec.project_id}"
        existing_data = await self.kv.get_by_id(current_key)
        if existing_data is not None:
            if not force:
                raise ValueError(f"项目 {spec.project_id} 已有本体，请使用 update")
            # Force mode: delete existing ontology first
            existing_spec = OntologySpec(
                **self._sanitize_spec_dict(existing_data.get("spec", {}))
            )
            await self.kv.delete([current_key, f"ontology_{existing_spec.ontology_id}"])
            logger.info(f"覆盖现有本体: {existing_spec.ontology_id}")

        # 准备存储数据
        ontology_data = {"spec": spec.to_dict(), "created_at": spec.created_at}

        # 存储多个键以支持不同的查询方式
        # 1. 按项目ID查询：onto_{project_id}
        # 2. 按本体ID查询：ontology_{ontology_id}
        await self.kv.upsert(
            {
                current_key: ontology_data,
                f"ontology_{spec.ontology_id}": ontology_data,
            }
        )

        logger.info(f"创建本体: {spec.ontology_id}, project: {spec.project_id}")
        return spec

    async def update(self, project_id: str, spec: OntologySpec) -> OntologySpec:
        """更新本体"""
        # 验证
        result = OntologyValidator.validate(spec)
        if not result.is_valid:
            raise ValueError(f"本体验证失败: {result.error_message}")

        # 获取当前本体
        current_key = f"onto_{project_id}"
        current_data = await self.kv.get_by_id(current_key)
        if current_data is None:
            raise ValueError(f"项目 {project_id} 没有本体，请先创建")

        # 自动递增版本号（patch）
        old_spec = OntologySpec(
            **self._sanitize_spec_dict(current_data.get("spec", {}))
        )
        spec.version = self._increment_version(old_spec.version, "patch")
        spec.updated_at = datetime.utcnow().isoformat()

        # 保存历史版本（新 key）
        history_key = f"onto_{project_id}_v{spec.version}"
        await self.kv.upsert(
            {
                history_key: {
                    "spec": old_spec.to_dict(),
                    "archived_at": datetime.utcnow().isoformat(),
                }
            }
        )

        # 准备更新数据
        update_data = {
            "spec": spec.to_dict(),
            "created_at": current_data.get("created_at", spec.created_at),
        }

        # 保存当前版本（覆盖两个键）
        await self.kv.upsert(
            {
                current_key: update_data,
                f"ontology_{spec.ontology_id}": update_data,
            }
        )

        # 清除缓存
        self._cache.pop(project_id, None)

        logger.info(
            f"更新本体: 项目={project_id}, 版本: {old_spec.version} → {spec.version}"
        )
        return spec

    async def get_by_project(self, project_id: str) -> Optional[OntologySpec]:
        """获取项目的当前本体"""
        # 检查缓存
        if project_id in self._cache:
            return self._cache[project_id]

        # 从 KV 加载
        key = f"onto_{project_id}"
        data = await self.kv.get_by_id(key)

        if data is None:
            return None

        spec_dict = self._sanitize_spec_dict(data.get("spec", {}))
        spec = OntologySpec(**spec_dict)

        # 写入缓存
        self._cache[project_id] = spec
        return spec

    async def get(self, ontology_id: str) -> Optional[OntologySpec]:
        """根据 ontology_id 获取本体"""
        # 从 KV 加载
        key = f"ontology_{ontology_id}"
        data = await self.kv.get_by_id(key)

        if data is None:
            return None

        spec_dict = self._sanitize_spec_dict(data.get("spec", {}))
        spec = OntologySpec(**spec_dict)

        return spec

    async def delete(self, identifier: str):
        """删除本体

        Args:
            identifier: 可以是 project_id 或 ontology_id
        """
        # 先尝试按 ontology_id 获取
        ontology = await self.get(identifier)

        if ontology:
            # 找到了，按 ontology_id 删除
            project_id = ontology.project_id
            keys_to_delete = [f"onto_{project_id}", f"ontology_{ontology.ontology_id}"]
            await self.kv.delete(keys_to_delete)
            # 清除缓存
            self._cache.pop(project_id, None)
            logger.info(
                f"删除本体: ontology_id={ontology.ontology_id}, project_id={project_id}"
            )
        else:
            # 尝试按 project_id 删除
            ontology = await self.get_by_project(identifier)
            keys_to_delete = [f"onto_{identifier}"]

            if ontology:
                keys_to_delete.append(f"ontology_{ontology.ontology_id}")

            await self.kv.delete(keys_to_delete)
            # 清除缓存
            self._cache.pop(identifier, None)
            logger.info(f"删除本体: project_id={identifier}")

    async def inject_into_prompt(
        self,
        project_id: str,
    ) -> Dict[str, str]:
        """注入本体到 prompt 变量"""
        spec = await self.get_by_project(project_id)
        if spec is None:
            raise ValueError(f"项目 {project_id} 没有本体")

        return self.prompt_injector.inject(spec)

    def _increment_version(self, version: str, increment_type: str = "patch") -> str:
        """递增版本号"""
        parts = version.split(".")
        major = int(parts[0])
        minor = int(parts[1]) if len(parts) > 1 else 0
        patch = int(parts[2]) if len(parts) > 2 else 0

        if increment_type == "patch":
            patch += 1
        elif increment_type == "minor":
            minor += 1
            patch = 0
        elif increment_type == "major":
            major += 1
            minor = 0
            patch = 0

        return f"{major}.{minor}.{patch}"
