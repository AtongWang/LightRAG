# Ontology-Driven 多模态 KG-RAG：开发计划

> **开发原则**：后端优先、同步文档、可审计、可测试

---

## 开发阶段概览

| 阶段 | 内容 | 预计工时 | 优先级 |
|------|------|----------|--------|
| 阶段 1 | 本体服务和 KV 存储 | 2-3 天 | P0 |
| 阶段 2 | 关系格式升级（5→6字段） | 2-3 天 | P0 |
| 阶段 3 | 本体驱动 Prompt 注入 | 3-4 天 | P0 |
| 阶段 4 | RAGAnything 解析器集成 | 3-4 天 | P1 |
| 阶段 5 | 实体 Enrich 服务 | 2-3 天 | P1 |
| 阶段 6 | API 集成和端到端测试 | 3-4 天 | P1 |

**总预计工时**：15-21 天（单人开发）

---

## 阶段 1：本体服务和 KV 存储

### 目标
实现本体的 CRUD 操作和版本管理，使用 KV Storage 存储（无需修改 Neo4j）

### 存储策略
- **本体数据**：存储在 KV Storage 中
  - Key 格式：`onto_{project_id}`（当前版本）
  - Key 格式：`onto_{project_id}_v{version}`（历史版本）
  - Value：JSON 序列化的 OntologySpec
- **项目数据**：存储在 KV Storage 中
  - Key 格式：`project_{project_id}`
  - Value：JSON 序列化的 Project
- **图谱数据**：继续使用 Neo4j（Entity 节点和边）

### 优势
1. 无需修改 Neo4j 接口（保持 LightRAG 核心代码不变）
2. 查询简单：`kv_storage.get_by_id("onto_proj_xxx")`
3. 版本管理简单：KV 天然支持 JSON 序列化
4. 性能好：本体是小数据，KV 查询比 Cypher 快
5. 符合现有架构：复用 `BaseKVStorage` 抽象

### 任务清单

#### 1.1 数据模型定义（0.5 天）

**文件**：`lightrag/ontology/models.py`

**代码**：
```python
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
from datetime import datetime

@dataclass
class OntologySpec:
    """本体规格"""
    ontology_id: str
    project_id: str
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
```

#### 1.2 本体验证器（0.5 天）

**文件**：`lightrag/ontology/validator.py`

**代码**：
```python
from .models import ValidationResult

class OntologyValidator:
    @staticmethod
    def validate_entity_types(entity_types: List[str]) -> ValidationResult:
        if not entity_types:
            return ValidationResult(False, "entity_types 不能为空")
        if "Other" not in entity_types:
            return ValidationResult(False, "entity_types 必须包含 'Other'")
        for et in entity_types:
            if not et or not et.strip():
                return ValidationResult(False, f"无效的 entity_type: '{et}'")
        return ValidationResult(True)

    @staticmethod
    def validate_relation_types(relation_types: List[str]) -> ValidationResult:
        if not relation_types:
            return ValidationResult(False, "relation_types 不能为空")
        if "Other" not in relation_types:
            return ValidationResult(False, "relation_types 必须包含 'Other'")
        for rt in relation_types:
            if not rt or not rt.strip():
                return ValidationResult(False, f"无效的 relation_type: '{rt}'")
        return ValidationResult(True)

    @staticmethod
    def validate_attributes_schema(schema: Dict) -> ValidationResult:
        valid_types = {"string", "string[]", "int", "float", "number[4]", "bool"}
        for entity_type, attrs in schema.items():
            for attr_name, attr_def in attrs.items():
                if "type" not in attr_def:
                    return ValidationResult(False, f"{entity_type}.{attr_name} 缺少 type 定义")
                if attr_def["type"] not in valid_types:
                    return ValidationResult(False, f"{entity_type}.{attr_name} 无效的 type: {attr_def['type']}")
                if "required" not in attr_def:
                    return ValidationResult(False, f"{entity_type}.{attr_name} 缺少 required 定义")
                if "desc" not in attr_def:
                    return ValidationResult(False, f"{entity_type}.{attr_name} 缺少 desc 定义")
        return ValidationResult(True)

    @staticmethod
    def validate(spec: 'OntologySpec') -> ValidationResult:
        result = OntologyValidator.validate_entity_types(spec.entity_types)
        if not result.is_valid:
            return result

        result = OntologyValidator.validate_relation_types(spec.relation_types)
        if not result.is_valid:
            return result

        result = OntologyValidator.validate_attributes_schema(spec.entity_attributes)
        if not result.is_valid:
            return result

        result = OntologyValidator.validate_attributes_schema(spec.relation_attributes)
        if not result.is_valid:
            return result

        return ValidationResult(True)
```

#### 1.3 OntologyService 实现（1 天）

**文件**：`lightrag/ontology/__init__.py`

**代码**：
```python
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

from ..utils import logger, compute_mdhash_id
from ..base import BaseKVStorage
from .models import OntologySpec, ValidationResult
from .validator import OntologyValidator
from .prompts import OntologyPromptInjector


class OntologyService:
    """本体服务（基于 KV Storage 存储）"""

    def __init__(self, kv_storage: BaseKVStorage):
        self.kv = kv_storage
        self._cache: Dict[str, OntologySpec] = {}
        self._cache_ttl: int = 3600  # 1 小时
        self.prompt_injector = OntologyPromptInjector()

    async def create(self, spec: OntologySpec) -> OntologySpec:
        """创建本体"""
        # 验证
        result = OntologyValidator.validate(spec)
        if not result.is_valid:
            raise ValueError(f"本体验证失败: {result.error_message}")

        # 检查是否已存在
        existing = await self._get_by_project(spec.project_id)
        if existing is not None:
            raise ValueError(f"项目 {spec.project_id} 已有本体，请使用 update")

        # 存储：key="onto_{project_id}", value=JSON
        current_key = f"onto_{spec.project_id}"
        await self.kv.upsert({
            current_key: {
                "spec": asdict(spec),
                "created_at": datetime.utcnow().isoformat()
            }
        })

        logger.info(f"创建本体: {spec.ontology_id}, project: {spec.project_id}")
        return spec

    async def update(self, project_id: str, spec: OntologySpec) -> OntologySpec:
        """更新本体"""
        # 验证
        result = OntologyValidator.validate(spec)
        if not result.is_valid:
            raise ValueError(f"本体验证失败: {result.error_message}")

        # 获取当前本体
        current = await self._get_by_project(project_id)
        if current is None:
            raise ValueError(f"项目 {project_id} 没有本体，请先创建")

        # 自动递增版本号（patch）
        old_version = current.version
        spec.version = self._increment_version(old_version, 'patch')
        spec.updated_at = datetime.utcnow().isoformat()

        # 保存当前版本（覆盖）
        current_key = f"onto_{project_id}"
        await self.kv.upsert({
            current_key: {
                "spec": asdict(spec),
                "created_at": current.get("created_at", spec.created_at)
            }
        })

        # 保存历史版本（新 key）
        history_key = f"onto_{project_id}_v{spec.version}"
        await self.kv.upsert({
            history_key: {
                "spec": asdict(current),
                "archived_at": datetime.utcnow().isoformat()
            }
        })

        # 清除缓存
        self._cache.pop(project_id, None)

        logger.info(f"更新本体: 项目={project_id}, 版本: {old_version} → {spec.version}")
        return spec

    async def get_by_project(self, project_id: str) -> OntologySpec:
        """获取项目的当前本体"""
        # 检查缓存
        if project_id in self._cache:
            return self._cache[project_id]

        # 从 KV 加载
        key = f"onto_{project_id}"
        data = await self.kv.get_by_id(key)

        if data is None:
            return None

        spec_dict = data.get("spec", {})
        spec = OntologySpec(**spec_dict)

        # 写入缓存
        self._cache[project_id] = spec
        return spec

    async def get(self, ontology_id: str) -> OntologySpec:
        """获取本体（通过 ontology_id）"""
        # 遍历缓存
        for cached_spec in self._cache.values():
            if cached_spec.ontology_id == ontology_id:
                return cached_spec

        # 需要遍历所有 onto_* key（性能较差，建议使用 project_id 查询）
        logger.warning(f"通过 ontology_id 查询性能较差，建议使用 get_by_project")
        raise NotImplementedError(
            "建议使用 get_by_project(project_id) 代替 get(ontology_id)"
        )

    async def list_history(self, project_id: str) -> List[OntologySpec]:
        """列出项目的所有本体版本"""
        # 获取所有版本（需要 KV 支持 filter_keys）
        # 暂时实现：返回当前版本
        current = await self.get_by_project(project_id)
        return [current] if current else []

    async def delete(self, project_id: str):
        """删除项目本体"""
        key = f"onto_{project_id}"
        await self.kv.delete([key])

        # 清除缓存
        self._cache.pop(project_id, None)

        logger.info(f"删除本体: 项目={project_id}")

    async def inject_into_prompt(
        self,
        project_id: str,
        prompt_template: str = None
    ) -> Dict[str, str]:
        """注入本体到 prompt 变量"""
        spec = await self.get_by_project(project_id)
        if spec is None:
            raise ValueError(f"项目 {project_id} 没有本体")

        return self.prompt_injector.inject(spec)

    def _get_by_project(self, project_id: str) -> Optional[OntologySpec]:
        """内部方法：获取项目本体"""
        # 同步读取（缓存中）
        if project_id in self._cache:
            return self._cache[project_id]

        # TODO：异步读取
        # 这里需要使用 sync 读取或改为异步
        return None

    def _increment_version(self, version: str, increment_type: str = 'patch') -> str:
        """递增版本号"""
        parts = version.split(".")
        major = int(parts[0])
        minor = int(parts[1]) if len(parts) > 1 else 0
        patch = int(parts[2]) if len(parts) > 2 else 0

        if increment_type == 'patch':
            patch += 1
        elif increment_type == 'minor':
            minor += 1
            patch = 0
        elif increment_type == 'major':
            major += 1
            minor = 0
            patch = 0

        return f"{major}.{minor}.{patch}"
```

#### 1.4 项目管理服务（0.5 天）

**文件**：`lightrag/projects/__init__.py`

**代码**：
```python
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
import json

from ..utils import logger
from ..base import BaseKVStorage
from .models import Project


class ProjectManager:
    """项目管理器（基于 KV Storage）"""

    def __init__(self, kv_storage: BaseKVStorage):
        self.kv = kv_storage
        self._cache: Dict[str, Project] = {}

    async def create(self, name: str, description: str = "") -> Project:
        """创建项目"""
        import uuid
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
            status='active'
        )

        # 存储：key="project_{project_id}"
        await self.kv.upsert({
            f"project_{project_id}": asdict(project)
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

        project = Project(**data)
        self._cache[project_id] = project
        return project

    async def list_all(self) -> List[Project]:
        """列出所有项目"""
        # TODO：需要 KV 支持 filter_keys 或 list_keys
        # 暂时返回空列表
        return []

    async def delete(self, project_id: str):
        """删除项目"""
        key = f"project_{project_id}"
        await self.kv.delete([key])

        # 清除缓存
        self._cache.pop(project_id, None)

        # 同时删除本体
        from lightrag.ontology import OntologyService
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
            f"project_{project_id}": asdict(project)
        })

        # 更新缓存
        self._cache[project_id] = project
        logger.info(f"更新项目 {project_id} 的 ontology_id: {ontology_id}")
```

#### 1.5 数据模型补充（0.5 天）

**文件**：`lightrag/projects/models.py`

**代码**：
```python
from dataclasses import dataclass, asdict
from typing import Optional


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
```

#### 1.6 测试（0.5 天）

**文件**：`tests/test_ontology_service.py`

**代码**：
```python
import pytest
from lightrag.ontology import OntologyService, OntologySpec
from lightrag.projects import ProjectManager
from lightrag.base import BaseKVStorage

@pytest.fixture
async def kv_storage():
    # 使用 JsonKVStorage（测试环境）
    from lightrag.kg import JsonKVStorage
    return JsonKVStorage(...)

@pytest.fixture
async def ontology_service(kv_storage):
    return OntologyService(kv_storage)

@pytest.fixture
async def project_manager(kv_storage):
    return ProjectManager(kv_storage)

@pytest.mark.asyncio
async def test_create_ontology(ontology_service):
    spec = OntologySpec(
        ontology_id="test_001",
        project_id="test_proj",
        version="1.0.0",
        language="zh-cn",
        entity_types=["人物", "机构", "Other"],
        relation_types=["隶属", "提出", "Other"],
        entity_attributes={},
        relation_attributes={}
    )

    result = await ontology_service.create(spec)
    assert result.ontology_id == "test_001"
    assert result.version == "1.0.0"

@pytest.mark.asyncio
async def test_get_ontology(ontology_service):
    # 先创建
    spec = OntologySpec(...)
    await ontology_service.create(spec)

    # 获取
    result = await ontology_service.get_by_project("test_proj")
    assert result is not None
    assert result.entity_types == ["人物", "机构", "Other"]

@pytest.mark.asyncio
async def test_update_ontology_version(ontology_service):
    # 创建本体
    spec = OntologySpec(
        ontology_id="test_002",
        project_id="test_proj2",
        version="1.0.0",
        ...
    )
    await ontology_service.create(spec)

    # 更新
    updated_spec = spec
    updated_spec.entity_types = ["人物", "机构", "地点", "Other"]
    result = await ontology_service.update("test_proj2", updated_spec)
    assert result.version == "1.0.1"  # patch 递增

@pytest.mark.asyncio
async def test_create_project(project_manager):
    project = await project_manager.create(
        name="测试项目",
        description="测试描述"
    )

    assert project.project_id.startswith("proj_")
    assert project.name == "测试项目"
    assert project.workspace.startswith("workspace_")
```

### 完成标准
- [ ] OntologySpec 数据模型定义完成
- [ ] OntologyValidator 验证逻辑完成
- [ ] OntologyService CRUD 操作完成（基于 KV Storage）
- [ ] ProjectManager CRUD 操作完成（基于 KV Storage）
- [ ] Project 数据模型定义完成
- [ ] 单元测试覆盖率 > 80%
- [ ] 文档更新

---

## 阶段 2：关系格式升级（5→6字段）

### 目标
升级关系输出格式，支持 `relation_type` 字段

### 任务清单

#### 2.1 更新 Prompt 模板（0.5 天）

**文件**：`lightrag/prompt.py`

**改动点 1**：System Prompt 关系格式说明（第 28-34 行）

```python
# 修改前
**Output Format - Relationships:** Output a total of 5 fields for each relationship, delimited by `{tuple_delimiter}`, on a single line. The first field *must* be the literal string `relation`.
    *   Format: `relation{tuple_delimiter}source_entity{tuple_delimiter}target_entity{tuple_delimiter}relationship_keywords{tuple_delimiter}relationship_description`

# 修改后
**Relationship Details:** For each binary relationship, extract the following fields:
    *   `source_entity`: The name of the source entity. Ensure **consistent naming** with entity extraction. Capitalize the first letter of each significant word (title case) if the name is case-insensitive.
    *   `target_entity`: The name of the target entity. Ensure **consistent naming** with entity extraction. Capitalize the first letter of each significant word (title case) if the name is case-insensitive.
    *   `relation_type`: The type of this relationship. Must be one of the following: `{relation_types}`. If none of the provided types apply, use `Other`.
    *   `relationship_keywords`: One or more high-level keywords summarizing the overarching nature, concepts, or themes of the relationship. Multiple keywords within this field must be separated by a comma `,`. **DO NOT use `{tuple_delimiter}` for separating multiple keywords within this field.**
    *   `relationship_description`: A concise explanation of the nature of the relationship between the source and target entities, providing a clear rationale for their connection.

**Output Format - Relationships:** Output a total of 6 fields for each relationship, delimited by `{tuple_delimiter}`, on a single line. The first field *must* be the literal string `relation`.
    *   Format: `relation{tuple_delimiter}source_entity{tuple_delimiter}target_entity{tuple_delimiter}relation_type{tuple_delimiter}relationship_keywords{tuple_delimiter}relationship_description`
```

**改动点 2**：Continue Prompt 关系格式说明（第 94 行）

```python
# 修改前
4.  **Output Format - Relationships:** Output a total of 5 fields for each relationship, delimited by `{tuple_delimiter}`, on a single line. The first field *must* be the literal string `relation`.

# 修改后
4.  **Output Format - Relationships:** Output a total of 6 fields for each relationship, delimited by `{tuple_delimiter}`, on a single line. The first field *must* be the literal string `relation`.
```

**改动点 3**：Examples 更新（第 103-183 行）

所有关系示例从 5 字段改为 6 字段：

```python
# 修改前示例
relation{tuple_delimiter}Alex{tuple_delimiter}Taylor{tuple_delimiter}power dynamics, observation{tuple_delimiter}Alex observes Taylor's authoritarian behavior and notes changes in Taylor's attitude toward the device.

# 修改后示例
relation{tuple_delimiter}Alex{tuple_delimiter}Taylor{tuple_delimiter}conflict{tuple_delimiter}power dynamics, observation{tuple_delimiter}Alex observes Taylor's authoritarian behavior and notes changes in Taylor's attitude toward the device.
```

**完整示例更新**：
需要更新 `entity_extraction_examples` 中的所有 3 个示例，每个示例中的所有关系都改为 6 字段格式。

#### 2.2 更新关系解析逻辑（1 天）

**文件**：`lightrag/operate.py`

**改动点 1**：字段数校验（第 458 行）

```python
# 修改前
if (
    len(record_attributes) != 5 or "relation" not in record_attributes[0]
):
    if len(record_attributes) > 1 and "relation" in record_attributes[0]:
        logger.warning(...)
    return None

# 修改后
if len(record_attributes) < 5 or len(record_attributes) > 7 or "relation" not in record_attributes[0]:
    if len(record_attributes) > 1 and "relation" in record_attributes[0]:
        logger.warning(
            f"{chunk_key}: LLM output format error; found {len(record_attributes)}/6 fields on RELATION `{record_attributes[1]}`~`{record_attributes[2] if len(record_attributes) > 2 else 'N/A'}`"
        )
        logger.debug(record_attributes)
    return None

# 兼容模式：处理 5 字段输出（自动补齐 relation_type="Other"）
if len(record_attributes) == 5:
    record_attributes.insert(3, "Other")
    logger.debug(f"{chunk_key}: Auto-inserting relation_type='Other' for 5-field relation")
```

**改动点 2**：字段解析逻辑（第 468-520 行）

```python
# 修改前
source = sanitize_and_normalize_extracted_text(
    record_attributes[1], remove_inner_quotes=True
)
target = sanitize_and_normalize_extracted_text(
    record_attributes[2], remove_inner_quotes=True
)
# ... validation ...

edge_keywords = sanitize_and_normalize_extracted_text(
    record_attributes[3], remove_inner_quotes=True
)
edge_keywords = edge_keywords.replace("，", ",")
edge_description = sanitize_and_normalize_extracted_text(record_attributes[4])

# 修改后
source = sanitize_and_normalize_extracted_text(
    record_attributes[1], remove_inner_quotes=True
)
target = sanitize_and_normalize_extracted_text(
    record_attributes[2], remove_inner_quotes=True
)
# ... validation ...

relation_type = sanitize_and_normalize_extracted_text(
    record_attributes[3], remove_inner_quotes=True
)
edge_keywords = sanitize_and_normalize_extracted_text(
    record_attributes[4], remove_inner_quotes=True
)
edge_keywords = edge_keywords.replace("，", ",")
edge_description = sanitize_and_normalize_extracted_text(record_attributes[5])
```

**改动点 3**：relationship_data 构建（第 520 行之后）

```python
# 修改前
relationship_data = {
    "source_id": source,
    "target_id": target,
    "description": edge_description,
    "keywords": edge_keywords,
    "weight": 1.0,
}

# 修改后
relationship_data = {
    "source_id": source,
    "target_id": target,
    "description": edge_description,
    "keywords": edge_keywords,
    "weight": 1.0,
    "relation_type": relation_type,  # 新增
}
```

#### 2.3 Neo4j 边属性存储验证（0.5 天）

**文件**：`lightrag/kg/neo4j_impl.py`

**验证点**：确保 `relation_type` 字段被正确存储

```python
# 在 upsert_edge 方法中添加日志（调试用）
async def upsert_edge(
    self, source_node_id: str, target_node_id: str, edge_data: dict[str, str]
) -> None:
    # ... 现有代码 ...

    # 添加日志：验证 relation_type 字段
    if "relation_type" in edge_data:
        logger.debug(f"Storing relation_type: {edge_data['relation_type']}")
    else:
        logger.warning("relation_type not found in edge_data, will be stored as default")

    # ... 现有代码 ...
```

#### 2.4 测试（0.5 天）

**文件**：`tests/test_relation_format.py`

**代码**：
```python
import pytest
from lightrag.prompt import PROMPTS
from lightrag.operate import _handle_single_relationship_extraction

@pytest.mark.asyncio
async def test_parse_six_field_relation():
    """测试解析 6 字段关系"""
    record = "relation<|#|>Alice<|#|>Bob<|#|>friend<|#|>colleague<|#|>They work together"
    fields = record.split(PROMPTS["DEFAULT_TUPLE_DELIMITER"])

    assert len(fields) == 6
    assert fields[0] == "relation"
    assert fields[1] == "Alice"
    assert fields[2] == "Bob"
    assert fields[3] == "friend"  # relation_type
    assert fields[4] == "colleague"  # keywords
    assert fields[5] == "They work together"  # description

@pytest.mark.asyncio
async def test_parse_five_field_relation_compatibility():
    """测试 5 字段兼容模式"""
    record = "relation<|#|>Alice<|#|>Bob<|#|>colleague<|#|>They work together"
    fields = record.split(PROMPTS["DEFAULT_TUPLE_DELIMITER"])

    assert len(fields) == 5
    # 应该自动补齐 relation_type="Other"

@pytest.mark.asyncio
async def test_extract_relation_data():
    """测试关系数据提取"""
    record = "relation<|#|>Alice<|#|>Bob<|#|>friend<|#|>colleague<|#|>They work together"
    chunk_key = "test_chunk"
    timestamp = 1234567890

    result = await _handle_single_relationship_extraction(
        [record.split(PROMPTS["DEFAULT_TUPLE_DELIMITER"])],
        chunk_key,
        timestamp
    )

    assert result is not None
    assert result["source_id"] == "Alice"
    assert result["target_id"] == "Bob"
    assert result["relation_type"] == "friend"
    assert result["keywords"] == "colleague"
    assert result["description"] == "They work together"
```

### 完成标准
- [ ] System Prompt 关系格式更新完成（6 字段说明）
- [ ] Continue Prompt 关系格式更新完成
- [ ] Examples 全部更新为 6 字段格式
- [ ] 关系解析逻辑支持 6 字段
- [ ] 5 字段兼容模式实现完成
- [ ] `relation_type` 字段正确存储到 Neo4j
- [ ] 单元测试覆盖率 > 90%
- [ ] 文档更新

---

## 阶段 3：本体驱动 Prompt 注入

### 目标
在抽取时动态注入本体的 `entity_types`、`relation_types`、`attributes schema`

### 任务清单

#### 3.1 Prompt 注入器实现（1 天）

**文件**：`lightrag/ontology/prompts.py`

**代码**：
```python
from typing import Dict, Any
from .models import OntologySpec

class OntologyPromptInjector:
    """本体驱动 Prompt 注入器"""

    def inject(self, spec: OntologySpec) -> Dict[str, str]:
        """注入本体到 Prompt 变量"""
        return {
            # 原有变量
            "entity_types": ",".join(spec.entity_types),
            "language": spec.language,

            # 新增变量
            "relation_types": ",".join(spec.relation_types),
            "entity_schema": self._format_entity_schema(spec.entity_attributes),
            "relation_schema": self._format_relation_schema(spec.relation_attributes),
            "normalization_rules": self._format_normalization_rules(spec.normalization_rules),
        }

    def _format_entity_schema(self, attrs: Dict[str, Dict[str, Any]]) -> str:
        """格式化实体属性 schema 为 Prompt"""
        if not attrs:
            return "{}"

        schema_parts = []
        for entity_type, attr_defs in attrs.items():
            attr_parts = []
            for attr_name, attr_def in attr_defs.items():
                type_str = attr_def.get("type", "string")
                required_str = "required" if attr_def.get("required") else "optional"
                desc_str = attr_def.get("desc", "")
                attr_parts.append(f"    - {attr_name}: {type_str} ({required_str}) - {desc_str}")

            schema_parts.append(f"{entity_type}:\n" + "\n".join(attr_parts))

        return "\n\n".join(schema_parts)

    def _format_relation_schema(self, attrs: Dict[str, Dict[str, Any]]) -> str:
        """格式化关系属性 schema 为 Prompt"""
        if not attrs:
            return "{}"

        schema_parts = []
        for relation_type, attr_defs in attrs.items():
            attr_parts = []
            for attr_name, attr_def in attr_defs.items():
                type_str = attr_def.get("type", "string")
                required_str = "required" if attr_def.get("required") else "optional"
                desc_str = attr_def.get("desc", "")
                attr_parts.append(f"    - {attr_name}: {type_str} ({required_str}) - {desc_str}")

            schema_parts.append(f"{relation_type}:\n" + "\n".join(attr_parts))

        return "\n\n".join(schema_parts)

    def _format_normalization_rules(self, rules: Dict[str, Any]) -> str:
        """格式化归一化规则"""
        if not rules:
            return "无特殊归一化规则"

        rules_parts = []
        if "alias" in rules:
            alias_parts = []
            for canonical, aliases in rules["alias"].items():
                alias_str = ",".join(aliases)
                alias_parts.append(f"    {canonical} → {alias_str}")
            rules_parts.append("别名归一化:\n" + "\n".join(alias_parts))

        if "blacklist_entities" in rules:
            blacklist_str = ",".join(rules["blacklist_entities"])
            rules_parts.append(f"黑名单实体: {blacklist_str}")

        return "\n\n".join(rules_parts) if rules_parts else "无特殊归一化规则"
```

#### 3.2 System Prompt 扩展（0.5 天）

**文件**：`lightrag/prompt.py`

**新增内容**：在现有 System Prompt 后添加属性抽取说明

```python
# 在第 56 行之后添加

9.  **Entity Attributes Extraction:**
    *   For each extracted entity, extract additional attributes according to the following entity attribute schema:
        ```
        {entity_schema}
        ```
    *   Only extract attributes that are explicitly mentioned in the input text. Do not infer or assume values.
    *   Follow the specified type constraints (e.g., `string`, `string[]`, `int`, `number[4]`).
    *   For array types like `string[]`, extract multiple values separated by commas.
    *   If no attributes are found for an entity, output `{{}}`.
    *   Output format: Append a JSON object with attributes after the entity description, separated by `||`.
        Example: `entity{tuple_delimiter}Person Name{tuple_delimiter}person{tuple_delimiter}Description||{{"affiliations": ["Organization A"], "orcid": "1234-5678-9012"}}`

10. **Relation Attributes Extraction:**
    *   For each extracted relationship, extract additional attributes according to the following relation attribute schema:
        ```
        {relation_schema}
        ```
    *   Only extract attributes that are explicitly mentioned in the input text.
    *   Output format: Append a JSON object with attributes after the relation description, separated by `||`.
        Example: `relation{tuple_delimiter}Person{tuple_delimiter}Organization{tuple_delimiter}隶属{tuple_delimiter}works for,employee||{{"evidence_level": "明确"}}`

11. **Normalization Rules:**
    *   Apply the following normalization rules to entity names:
        ```
        {normalization_rules}
        ```
```

#### 3.3 User Prompt 注入修改（0.5 天）

**文件**：`lightrag/operate.py`

**改动点**：在 `extract_entities()` 函数中注入本体变量（第 2788-2811 行）

```python
async def extract_entities(chunks, global_config, ...):
    # ... 现有代码 ...

    # 新增：从 global_config 读取 ontology_id
    ontology_id = global_config["addon_params"].get("ontology_id")

    # 加载本体
    ontology = None
    if ontology_id:
        from lightrag.ontology import OntologyService
        # 注意：这里需要获取 ontology_service 实例
        # 可以通过 global_config 传递或者作为参数传入
        ontology_service = global_config.get("ontology_service")
        if ontology_service:
            ontology = await ontology_service.get(ontology_id)
            logger.info(f"使用本体: {ontology_id}, 版本: {ontology.version}")

    # 注入本体变量
    if ontology:
        from lightrag.ontology import OntologyPromptInjector
        injector = OntologyPromptInjector()
        ontology_vars = injector.inject(ontology)

        entity_types = ontology.entity_types
        relation_types = ontology.relation_types
    else:
        # 使用默认值
        entity_types = global_config["addon_params"].get("entity_types", DEFAULT_ENTITY_TYPES)
        relation_types = global_config["addon_params"].get("relation_types", DEFAULT_RELATION_TYPES)
        ontology_vars = {}

    # 示例格式化
    examples = "\n".join(PROMPTS["entity_extraction_examples"])

    example_context_base = dict(
        tuple_delimiter=PROMPTS["DEFAULT_TUPLE_DELIMITER"],
        completion_delimiter=PROMPTS["DEFAULT_COMPLETION_DELIMITER"],
        entity_types=",".join(entity_types),
        relation_types=",".join(relation_types) if ontology else "",  # 新增
        language=language,
    )
    examples = examples.format(**example_context_base)

    # 构建完整的 Prompt 上下文
    context_base = dict(
        tuple_delimiter=PROMPTS["DEFAULT_TUPLE_DELIMITER"],
        completion_delimiter=PROMPTS["DEFAULT_COMPLETION_DELIMITER"],
        entity_types=",".join(entity_types),
        relation_types=",".join(relation_types),  # 新增
        entity_schema=ontology_vars.get("entity_schema", ""),  # 新增
        relation_schema=ontology_vars.get("relation_schema", ""),  # 新增
        normalization_rules=ontology_vars.get("normalization_rules", ""),  # 新增
        examples=examples,
        language=language,
    )
```

#### 3.4 属性解析逻辑（1 天）

**文件**：`lightrag/operate.py`

**改动点**：修改 `_process_extraction_result()` 或相关函数，支持属性解析

```python
def _parse_entity_with_attributes(
    record_attributes: list[str],
    tuple_delimiter: str
) -> dict:
    """解析实体和属性"""
    # 分离描述和属性
    if "||" in record_attributes[3]:
        description_part, attrs_part = record_attributes[3].split("||", 1)
        description = sanitize_and_normalize_extracted_text(description_part)
        try:
            attributes = json.loads(attrs_part.strip())
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse entity attributes: {attrs_part}")
            attributes = {}
    else:
        description = sanitize_and_normalize_extracted_text(record_attributes[3])
        attributes = {}

    return {
        "entity_name": record_attributes[1],
        "entity_type": record_attributes[2],
        "description": description,
        "attributes": attributes,  # 新增
    }

def _parse_relation_with_attributes(
    record_attributes: list[str],
    tuple_delimiter: str
) -> dict:
    """解析关系和属性"""
    # 分离描述和属性
    if "||" in record_attributes[5]:
        description_part, attrs_part = record_attributes[5].split("||", 1)
        description = sanitize_and_normalize_extracted_text(description_part)
        try:
            attributes = json.loads(attrs_part.strip())
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse relation attributes: {attrs_part}")
            attributes = {}
    else:
        description = sanitize_and_normalize_extracted_text(record_attributes[5])
        attributes = {}

    return {
        "source_id": record_attributes[1],
        "target_id": record_attributes[2],
        "relation_type": record_attributes[3],  # 已有
        "keywords": record_attributes[4],  # 已有
        "description": description,
        "attributes": attributes,  # 新增
    }
```

#### 3.5 测试（1 天）

**文件**：`tests/test_ontology_injection.py`

**代码**：
```python
import pytest
from lightrag.ontology import OntologyService, OntologySpec, OntologyPromptInjector
from lightrag.prompt import PROMPTS

@pytest.mark.asyncio
async def test_prompt_injection(ontology_service, test_ontology_spec):
    """测试 Prompt 注入"""
    # 创建本体
    await ontology_service.create(test_ontology_spec)

    # 注入 Prompt 变量
    injector = OntologyPromptInjector()
    vars = injector.inject(test_ontology_spec)

    assert "entity_types" in vars
    assert "relation_types" in vars
    assert "entity_schema" in vars
    assert "relation_schema" in vars
    assert "normalization_rules" in vars

    assert "人物" in vars["entity_types"]
    assert "隶属" in vars["relation_types"]
    assert "人物" in vars["entity_schema"]
    assert "隶属" in vars["relation_schema"]

@pytest.mark.asyncio
async def test_entity_schema_formatting():
    """测试属性 schema 格式化"""
    spec = OntologySpec(
        ontology_id="test",
        project_id="test",
        version="1.0.0",
        language="zh-cn",
        entity_types=["人物", "机构"],
        relation_types=[],
        entity_attributes={
            "人物": {
                "affiliations": {"type": "string[]", "required": False, "desc": "所属机构"},
                "orcid": {"type": "string", "required": False, "desc": "ORCID"}
            }
        },
        relation_attributes={}
    )

    injector = OntologyPromptInjector()
    vars = injector.inject(spec)

    assert "人物:" in vars["entity_schema"]
    assert "affiliations: string[] (optional)" in vars["entity_schema"]
    assert "orcid: string (optional)" in vars["entity_schema"]

@pytest.mark.asyncio
async def test_integration_with_extraction():
    """测试与 extract_entities 集成"""
    # 需要完整的 LightRAG 实例
    # 这部分测试应该在集成测试中完成
    pass
```

### 完成标准
- [ ] OntologyPromptInjector 实现完成
- [ ] System Prompt 属性抽取说明添加完成
- [ ] User Prompt 本体变量注入完成
- [ ] 实体/关系属性解析逻辑完成
- [ ] 单元测试覆盖率 > 85%
- [ ] 文档更新

---

## 阶段 4：RAGAnything 解析器集成

### 目标
集成 RAGAnything 库，实现多模态文档解析

### 任务清单

#### 4.1 RAGAnything 适配器（1 天）

**文件**：`lightrag/parsers/raganything_adapter.py`

**代码**：
```python
import asyncio
import json
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass

from ..utils import logger

try:
    from raganything import RAGAnything, RAGAnythingConfig
except ImportError:
    RAGAnything = None
    RAGAnythingConfig = None
    logger.warning("RAGAnything not installed, multimodal parsing disabled")

from .base import BaseParser
from .models import ParsedDocument, Asset


@dataclass
class RAGAnythingAdapterConfig:
    """RAGAnything 适配器配置"""
    mineru_parse_method: str = "auto"
    enable_image_processing: bool = True
    enable_table_processing: bool = True
    enable_equation_processing: bool = True
    enable_fallback: bool = True
    timeout: int = 300  # 秒


class RAGAnythingAdapter(BaseParser):
    """RAGAnything 解析器适配器"""

    def __init__(self, config: RAGAnythingAdapterConfig):
        if RAGAnything is None:
            raise ImportError("RAGAnything 未安装，无法使用此解析器")

        self.config = config
        self.rag = None  # 延迟初始化

    async def parse(self, file_path: str) -> ParsedDocument:
        """解析文档"""
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        logger.info(f"开始解析文档: {file_path} (使用 RAGAnything)")

        # 初始化 RAGAnything
        if self.rag is None:
            await self._initialize_rag()

        # 调用 RAGAnything 解析
        output_dir = file_path.parent / f"{file_path.stem}_parsed"
        try:
            await self._parse_with_timeout(file_path, output_dir)
        except asyncio.TimeoutError:
            logger.error(f"解析超时: {file_path}")
            if self.config.enable_fallback:
                logger.info("尝试使用 Docling 作为 fallback")
                return await self._parse_with_docling(file_path)
            raise

        # 读取解析结果
        result_file = output_dir / f"{file_path.stem}_parsed.json"
        if not result_file.exists():
            raise FileNotFoundError(f"解析结果文件不存在: {result_file}")

        with open(result_file, "r", encoding="utf-8") as f:
            raganything_result = json.load(f)

        # 转换为统一的 ParsedDocument
        parsed_doc = self._convert_to_parsed_document(raganything_result)

        logger.info(f"解析完成: {file_path}, 资源数量: {len(parsed_doc.assets.get('images', []))}")
        return parsed_doc

    async def _initialize_rag(self):
        """延迟初始化 RAGAnything"""
        logger.info("初始化 RAGAnything")

        # 创建 RAGAnything 配置
        rag_config = RAGAnythingConfig(
            working_dir="./raganything_storage",
            mineru_parse_method=self.config.mineru_parse_method,
            enable_image_processing=self.config.enable_image_processing,
            enable_table_processing=self.config.enable_table_processing,
            enable_equation_processing=self.config.enable_equation_processing,
        )

        # 注意：这里需要 LLM、Embedding、Vision 函数
        # 这些应该从 global_config 中获取
        # 暂时占位
        def llm_func(prompt, system_prompt=None, history_messages=[], **kwargs):
            # 从 global_config 获取 llm_model_func
            return ...

        def vision_func(prompt, system_prompt=None, history_messages=[], image_data=None, **kwargs):
            # 从 global_config 获取 vision_model_func
            return ...

        def embedding_func(texts):
            # 从 global_config 获取 embedding_func
            return ...

        # 初始化 RAGAnything
        self.rag = RAGAnything(
            config=rag_config,
            llm_model_func=llm_func,
            vision_model_func=vision_func,
            embedding_func=embedding_func,
        )

        logger.info("RAGAnything 初始化完成")

    async def _parse_with_timeout(self, file_path: str, output_dir: Path):
        """带超时的解析"""
        try:
            await asyncio.wait_for(
                self.rag.process_document_complete(
                    file_path=str(file_path),
                    output_dir=str(output_dir),
                    parse_method=self.config.mineru_parse_method
                ),
                timeout=self.config.timeout
            )
        except asyncio.TimeoutError:
            raise

    async def _parse_with_docling(self, file_path: str) -> ParsedDocument:
        """使用 Docling 作为 fallback"""
        try:
            from lightrag.parsers.docling_adapter import DoclingAdapter
            docling = DoclingAdapter()
            return await docling.parse(file_path)
        except ImportError:
            raise ImportError("Docling 未安装，无法使用 fallback")

    def _convert_to_parsed_document(self, result: Dict[str, Any]) -> ParsedDocument:
        """转换 RAGAnything 输出为 ParsedDocument"""
        return ParsedDocument(
            project_id=result.get("project_id", ""),
            source={
                "file_path": result.get("file_path", ""),
                "file_sha256": result.get("file_sha256", ""),
                "mime": result.get("mime", ""),
            },
            markdown=result.get("markdown", ""),
            assets=self._parse_assets(result.get("assets", {})),
            source_map=result.get("source_map", {}),
            metadata=result.get("metadata", {}),
        )

    def _parse_assets(self, assets_dict: Dict[str, Any]) -> Dict[str, list]:
        """解析资源"""
        assets = {}

        if "images" in assets_dict:
            assets["images"] = [
                Asset(
                    asset_id=img.get("asset_id", ""),
                    path=img.get("path", ""),
                    page=img.get("page"),
                    bbox=img.get("bbox"),
                    caption=img.get("caption"),
                    md_ref=img.get("md_ref"),
                )
                for img in assets_dict["images"]
            ]

        if "tables" in assets_dict:
            assets["tables"] = [
                Asset(
                    asset_id=tbl.get("asset_id", ""),
                    path=tbl.get("path", ""),
                    page=tbl.get("page"),
                    bbox=tbl.get("bbox"),
                    caption=tbl.get("caption"),
                    md_ref=tbl.get("md_ref"),
                )
                for tbl in assets_dict["tables"]
            ]

        if "equations" in assets_dict:
            assets["equations"] = [
                Asset(
                    asset_id=eq.get("asset_id", ""),
                    path=eq.get("path", ""),
                    page=eq.get("page"),
                    bbox=eq.get("bbox"),
                    caption=eq.get("caption"),
                    md_ref=eq.get("md_ref"),
                )
                for eq in assets_dict["equations"]
            ]

        return assets
```

#### 4.2 解析器服务（0.5 天）

**文件**：`lightrag/parsers/__init__.py`

**代码**：
```python
from typing import Optional
from .base import BaseParser
from .raganything_adapter import RAGAnythingAdapter, RAGAnythingAdapterConfig
from .models import ParsedDocument


class ParserService:
    """解析服务"""

    def __init__(self, parser_config: Optional[dict] = None):
        self.parser_config = parser_config or {}
        self._parser: Optional[BaseParser] = None

    def _get_parser(self, parse_method: str = "auto") -> BaseParser:
        """获取解析器（策略模式）"""
        if parse_method == "raganything":
            if self._parser is None:
                config = RAGAnythingAdapterConfig(**self.parser_config.get("raganything", {}))
                self._parser = RAGAnythingAdapter(config)
            return self._parser
        elif parse_method == "docling":
            from .docling_adapter import DoclingAdapter
            return DoclingAdapter()
        elif parse_method == "auto":
            # 自动选择：优先 RAGAnything
            try:
                return self._get_parser("raganything")
            except ImportError:
                logger.info("RAGAnything 不可用，使用 Docling")
                return self._get_parser("docling")
        else:
            raise ValueError(f"不支持的解析方法: {parse_method}")

    async def parse(
        self,
        file_path: str,
        parse_method: str = "auto"
    ) -> ParsedDocument:
        """解析文档"""
        parser = self._get_parser(parse_method)
        return await parser.parse(file_path)
```

#### 4.3 基础解析器接口（0.5 天）

**文件**：`lightrag/parsers/base.py`

**代码**：
```python
from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseParser(ABC):
    """解析器基类"""

    @abstractmethod
    async def parse(self, file_path: str) -> Dict[str, Any]:
        """解析文档

        Args:
            file_path: 文档路径

        Returns:
            解析结果字典

        Raises:
            FileNotFoundError: 文件不存在
            ParserException: 解析失败
        """
        pass
```

#### 4.4 数据模型（0.5 天）

**文件**：`lightrag/parsers/models.py`

**代码**：
```python
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional


@dataclass
class Asset:
    """资源（图片、表格、公式）"""
    asset_id: str
    path: str
    page: Optional[int] = None
    bbox: Optional[List[float]] = None  # [x1, y1, x2, y2]
    caption: Optional[str] = None
    md_ref: Optional[str] = None  # Markdown 引用，如 `![](path)`


@dataclass
class ParsedDocument:
    """解析后的文档"""
    project_id: str
    source: Dict[str, Any] = field(default_factory=dict)
    markdown: str = ""
    assets: Dict[str, List[Asset]] = field(default_factory=dict)
    source_map: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
```

#### 4.5 集成到 LightRAG（1 天）

**文件**：`lightrag/lightrag.py`

**改动点**：在 `insert()` 方法中集成解析器

```python
async def insert(self, string_or_strings, ...):
    # ... 现有代码 ...

    # 新增：解析阶段
    parse_method = self.global_config.get("addon_params", {}).get("parse_method", "auto")
    parser_config = self.global_config.get("parser_config", {})

    from lightrag.parsers import ParserService
    parser_service = ParserService(parser_config)

    parsed_documents = []
    for doc in string_or_strings:
        if isinstance(doc, str):
            # 单个文档
            parsed = await parser_service.parse(doc, parse_method)
            parsed_documents.append(parsed)
        else:
            # 文档列表（处理文件上传）
            for file_info in doc:
                parsed = await parser_service.parse(file_info["path"], parse_method)
                parsed_documents.append(parsed)

    # 使用解析后的 markdown 进行 chunking
    for parsed_doc in parsed_documents:
        # 处理 markdown（复用现有逻辑）
        await self._insert_markdown(
            parsed_doc.markdown,
            parsed_doc.source.get("file_path", ""),
            **kwargs
        )
```

#### 4.6 测试（1 天）

**文件**：`tests/test_parser_service.py`

**代码**：
```python
import pytest
from lightrag.parsers import ParserService

@pytest.mark.asyncio
async def test_parse_with_raganything():
    """测试 RAGAnything 解析"""
    config = {
        "raganything": {
            "mineru_parse_method": "auto",
            "timeout": 300
        }
    }
    service = ParserService(config)

    # 假设有一个测试 PDF 文件
    result = await service.parse("tests/fixtures/sample.pdf", parse_method="raganything")

    assert result.markdown is not None
    assert len(result.markdown) > 0
    assert "images" in result.assets
    assert "source_map" in result.source_map

@pytest.mark.asyncio
async def test_parse_fallback_to_docling():
    """测试 fallback 到 Docling"""
    # 需要 RAGAnything 不可用的环境
    pass
```

### 完成标准
- [ ] RAGAnythingAdapter 实现完成
- [ ] ParserService 策略模式实现完成
- [ ] BaseParser 接口定义完成
- [ ] ParsedDocument 数据模型完成
- [ ] 集成到 LightRAG.insert() 完成
- [ ] 单元测试覆盖率 > 70%
- [ ] 文档更新

---

## 阶段 5：实体 Enrich 服务

### 目标
实现基于本体的实体属性增广功能

### 任务清单

#### 5.1 Enrich Prompt 模板（0.5 天）

**文件**：`lightrag/enrich/prompts.py`

**代码**：
```python
ENTITY_ENRICH_SYSTEM_PROMPT = """---Role---
You are a Knowledge Graph Specialist responsible for generating new attributes for entities based on ontology and context.

---Instructions---
1.  **Context Analysis**:
    *   Analyze the provided entity context, including:
        - Current entity attributes and description
        - Neighboring relationships (relation_type, target entity, description)
        - Related document chunks
    *   Identify patterns, gaps, or opportunities for attribute generation.

2.  **Attribute Generation**:
    *   Generate new attributes according to the following entity attribute schema:
        ```
        {entity_schema}
        ```
    *   Only generate attributes that are **explicitly supported** by the context.
    *   Do NOT infer or assume values that are not clearly stated in the context.
    *   Follow the specified type constraints (e.g., `string`, `string[]`, `int`, `number[4]`).
    *   If the context does not support generating any new attributes, return an empty object `{{}}`.

3.  **Output Format**:
    *   Output a valid JSON object containing the generated attributes.
    *   Do NOT include any markdown code fences (```json`).
    *   Output ONLY the JSON object, nothing else.

---Examples---
{examples}

---Context---
Entity: {entity_name}
Current Attributes: {current_attributes}
Description: {entity_description}

Neighboring Relationships:
{relationships}

Related Chunks:
{chunks}

---Output---
Output:
"""

ENTITY_ENRICH_EXAMPLES = """
Example 1:

---Context---
Entity: "BERT-base"
Current Attributes: {{"entity_type": "模型"}
Description: "BERT is a pre-trained transformer model for NLP tasks"

Neighboring Relationships:
- [relation_type="提出", target_entity="Devlin et al.", description="BERT was proposed by Devlin et al."]
- [relation_type="使用", target_entity="GLUE", description="BERT is used for GLUE benchmark"]

Related Chunks:
- Chunk 1: "BERT was published at NAACL 2018..."
- Chunk 2: "The model achieved state-of-the-art results on GLUE..."

---Output---
{
    "year": 2018,
    "venue": "NAACL",
    "tasks": ["classification", "NER", "QA"]
}

Example 2:

---Context---
Entity: "University of California"
Current Attributes: {{"entity_type": "机构"}}
Description: "A public research university in California"

Neighboring Relationships:
- [relation_type="位于", target_entity="California", description="The university is located in California"]

Related Chunks:
- Chunk 1: "The University of California, Berkeley was founded in 1868..."

---Output---
{
    "founded": 1868,
    "type": "public_research_university",
    "campuses": ["Berkeley", "Los Angeles", "San Diego"]
}
"""
```

#### 5.2 EntityEnricher 实现（1.5 天）

**文件**：`lightrag/enrich/__init__.py`

**代码**：
```python
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from ..utils import logger
from ..base import BaseGraphStorage
from .models import EnrichResult
from .prompts import ENTITY_ENRICH_SYSTEM_PROMPT, ENTITY_ENRICH_EXAMPLES


@dataclass
class EnrichResult:
    """Enrich 结果"""
    status: 'success' | 'failed'
    entity_name: str
    updated_attributes: Dict[str, Any]
    diff: Dict[str, Any]
    evidence: List[Dict[str, Any]]
    error_message: Optional[str] = None


class EntityEnricher:
    """实体 Enrich 服务"""

    def __init__(
        self,
        graph_storage: BaseGraphStorage,
        llm_func: callable,
        ontology_service: Any
    ):
        self.graph = graph_storage
        self.llm_func = llm_func
        self.ontology = ontology_service

    async def enrich(
        self,
        project_id: str,
        entity_name: str,
        fields_to_generate: Optional[List[str]] = None
    ) -> EnrichResult:
        """Enrich 指定实体"""
        try:
            # 1. 获取实体当前属性
            entity = await self.graph.get_node(entity_name)
            if entity is None:
                return EnrichResult(
                    status="failed",
                    entity_name=entity_name,
                    updated_attributes={},
                    diff={},
                    evidence=[],
                    error_message=f"实体 {entity_name} 不存在"
                )

            current_attrs = entity.get("properties", {})

            # 2. 收集上下文
            context = await self._collect_context(entity_name)
            relationships = context.get("relationships", [])
            chunks = context.get("chunks", [])

            # 3. 获取本体
            project_ontology = await self.ontology.get_by_project(project_id)
            if project_ontology is None:
                return EnrichResult(
                    status="failed",
                    entity_name=entity_name,
                    updated_attributes={},
                    diff={},
                    evidence=[],
                    error_message=f"项目 {project_id} 没有配置本体"
                )

            # 4. 生成 Prompt
            prompt = self._build_enrich_prompt(
                entity_name=entity_name,
                current_attrs=current_attrs,
                entity_description=current_attrs.get("description", ""),
                relationships=relationships,
                chunks=chunks,
                ontology=project_ontology,
                fields_to_generate=fields_to_generate
            )

            # 5. 调用 LLM
            system_prompt = ENTITY_ENRICH_SYSTEM_PROMPT
            result = await self.llm_func(prompt, system_prompt=system_prompt)

            # 6. 解析 JSON
            try:
                new_attrs = self._parse_json_result(result)
            except json.JSONDecodeError as e:
                logger.error(f"Enrich JSON 解析失败: {e}")
                logger.error(f"LLM 输出: {result}")
                return EnrichResult(
                    status="failed",
                    entity_name=entity_name,
                    updated_attributes={},
                    diff={},
                    evidence=[],
                    error_message=f"LLM 输出格式错误: {str(e)}"
                )

            # 7. 校验属性类型
            validated_attrs = self._validate_attributes(
                new_attrs,
                project_ontology.entity_attributes,
                entity_name=current_attrs.get("entity_type", "")
            )

            # 8. 计算差分
            diff = self._compute_diff(current_attrs, validated_attrs)

            # 9. 写回图谱
            merged_attrs = {**current_attrs, **validated_attrs}
            await self.graph.upsert_node(entity_name, merged_attrs)

            logger.info(f"Enrich 完成: {entity_name}, 新增属性: {list(validated_attrs.keys())}")

            # 10. 保存 enrich 历史（可选）
            # 可以在节点属性中添加 enrich_history 字段

            return EnrichResult(
                status="success",
                entity_name=entity_name,
                updated_attributes=validated_attrs,
                diff=diff,
                evidence=[{
                    "chunk_id": c.get("id", ""),
                    "source_text": c.get("content", "")[:100] + "...",
                    "confidence": 0.95  # 暂时固定，可后续优化
                } for c in chunks],
                error_message=None
            )

        except Exception as e:
            logger.error(f"Enrich 失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return EnrichResult(
                status="failed",
                entity_name=entity_name,
                updated_attributes={},
                diff={},
                evidence=[],
                error_message=str(e)
            )

    async def _collect_context(self, entity_name: str) -> Dict[str, Any]:
        """收集实体上下文"""
        # 获取邻接边
        edges = await self.graph.get_node_edges(entity_name)
        if not edges:
            return {"relationships": [], "chunks": []}

        relationships = []
        for src, tgt in edges:
            edge = await self.graph.get_edge(src, tgt)
            if edge:
                relationships.append({
                    "source": src,
                    "target": tgt,
                    "relation_type": edge.get("relation_type", "Other"),
                    "description": edge.get("description", "")
                })

        # 获取关联 chunks（简化版：从边的 source_id 获取）
        # 实际实现可能需要更复杂的逻辑
        # 这里暂时空实现
        chunks = []

        return {
            "relationships": relationships,
            "chunks": chunks
        }

    def _build_enrich_prompt(
        self,
        entity_name: str,
        current_attrs: Dict[str, Any],
        entity_description: str,
        relationships: List[Dict[str, Any]],
        chunks: List[Dict[str, Any]],
        ontology: Any,
        fields_to_generate: Optional[List[str]]
    ) -> str:
        """构建 Enrich Prompt"""
        # 格式化关系
        rel_strs = []
        for rel in relationships:
            rel_strs.append(
                f"- [relation_type=\"{rel['relation_type']}\", target_entity=\"{rel['target']}\", description=\"{rel['description']}\"]"
            )
        relationships_text = "\n".join(rel_strs) if rel_strs else "无邻接关系"

        # 格式化 chunks
        chunk_strs = []
        for i, chunk in enumerate(chunks, 1):
            chunk_strs.append(f"- Chunk {i}: {chunk.get('content', '')[:200]}...")
        chunks_text = "\n".join(chunk_strs) if chunk_strs else "无关联文档"

        # 格式化 entity schema（只包含指定字段）
        entity_schema = ontology.entity_attributes
        if fields_to_generate:
            entity_type = current_attrs.get("entity_type", "")
            if entity_type in entity_schema:
                filtered_schema = {k: v for k, v in entity_schema[entity_type].items() if k in fields_to_generate}
                entity_schema = {entity_type: filtered_schema}

        # 格式化 schema
        from lightrag.ontology.prompts import OntologyPromptInjector
        injector = OntologyPromptInjector()
        schema_text = injector._format_entity_schema(entity_schema)

        # 生成 Prompt
        prompt = f"""
{ENTITY_ENRICH_SYSTEM_PROMPT.format(
    entity_schema=schema_text,
    examples=ENTITY_ENRICH_EXAMPLES
)}
---

Context---
Entity: {entity_name}
Current Attributes: {json.dumps(current_attrs, ensure_ascii=False)}
Description: {entity_description}

Neighboring Relationships:
{relationships_text}

Related Chunks:
{chunks_text}

---Output---
"""
        return prompt.strip()

    def _parse_json_result(self, result: str) -> Dict[str, Any]:
        """解析 LLM JSON 输出"""
        # 移除可能的 markdown 代码标记
        result = result.strip()
        if result.startswith("```json"):
            result = result[7:]
        if result.startswith("```"):
            result = result[3:]
        if result.endswith("```"):
            result = result[:-3]

        result = result.strip()

        # 解析 JSON
        return json.loads(result)

    def _validate_attributes(
        self,
        attrs: Dict[str, Any],
        entity_schema: Dict[str, Dict[str, Any]],
        entity_type: str
    ) -> Dict[str, Any]:
        """校验属性类型"""
        if entity_type not in entity_schema:
            logger.warning(f"实体类型 {entity_type} 不在 schema 中，跳过校验")
            return attrs

        schema = entity_schema[entity_type]
        validated = {}

        for attr_name, attr_value in attrs.items():
            if attr_name not in schema:
                logger.warning(f"属性 {attr_name} 不在 schema 中，跳过")
                continue

            attr_def = schema[attr_name]
            expected_type = attr_def.get("type")

            # 类型校验
            validated_value = self._validate_type(attr_value, expected_type)
            if validated_value is not None:
                validated[attr_name] = validated_value

        return validated

    def _validate_type(self, value: Any, expected_type: str) -> Any:
        """校验单个值的类型"""
        try:
            if expected_type == "string":
                return str(value) if value is not None else None
            elif expected_type == "string[]":
                if isinstance(value, list):
                    return [str(v) for v in value]
                elif isinstance(value, str):
                    return [value]
                return []
            elif expected_type == "int":
                return int(value)
            elif expected_type == "float":
                return float(value)
            elif expected_type == "bool":
                return bool(value)
            elif expected_type == "number[4]":
                # bbox 坐标
                if isinstance(value, list) and len(value) == 4:
                    return [float(v) for v in value]
                return None
            else:
                return value
        except (ValueError, TypeError):
            logger.warning(f"类型校验失败: 期望 {expected_type}, 实际 {type(value)}")
            return None

    def _compute_diff(self, old: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
        """计算属性差分"""
        added = {k: v for k, v in new.items() if k not in old}
        modified = {k: {"old": old[k], "new": v} for k, v in new.items() if k in old and old[k] != v}
        removed = {k: old[k] for k in old.keys() if k not in new}

        return {
            "added": added,
            "modified": modified,
            "removed": removed
        }
```

#### 5.3 API 路由（0.5 天）

**文件**：`lightrag/api/routers/graph_routes.py`（添加）

**代码**：
```python
from pydantic import BaseModel, Field

class EntityEnrichRequest(BaseModel):
    project_id: str = Field(..., description="项目 ID")
    entity_name: str = Field(..., description="实体名称")
    fields_to_generate: Optional[List[str]] = Field(None, description="要生成的属性列表（可选）")

class EntityEnrichResponse(BaseModel):
    status: str
    entity_name: str
    updated_attributes: Dict[str, Any]
    diff: Dict[str, Any]
    evidence: List[Dict[str, Any]]
    error_message: Optional[str]

# 在 create_graph_routes 函数中添加
@router.post("/graph/entity/enrich", dependencies=[Depends(combined_auth)])
async def enrich_entity(request: EntityEnrichRequest):
    """
    Enrich 实体属性

    Args:
        project_id: 项目 ID
        entity_name: 实体名称
        fields_to_generate: 要生成的属性列表（可选）

    Returns:
        Enrich 结果
    """
    try:
        # 获取 EntityEnricher
        from lightrag.enrich import EntityEnricher
        from lightrag.ontology import OntologyService

        enricher = EntityEnricher(
            graph_storage=rag.chunk_entity_relation_graph,
            llm_func=rag.llm_model_func,
            ontology_service=OntologyService(rag.chunk_entity_relation_graph)
        )

        # 执行 enrich
        result = await enricher.enrich(
            project_id=request.project_id,
            entity_name=request.entity_name,
            fields_to_generate=request.fields_to_generate
        )

        return result

    except Exception as e:
        logger.error(f"Error enriching entity: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error enriching entity: {str(e)}"
        )
```

#### 5.4 测试（0.5 天）

**文件**：`tests/test_entity_enricher.py`

**代码**：
```python
import pytest
from lightrag.enrich import EntityEnricher
from lightrag.ontology import OntologyService, OntologySpec

@pytest.mark.asyncio
async def test_enrich_entity(graph_storage, llm_func):
    """测试实体 Enrich"""
    # 创建本体
    ontology_service = OntologyService(graph_storage)
    spec = OntologySpec(
        ontology_id="test_enrich",
        project_id="test_proj",
        version="1.0.0",
        entity_types=["模型"],
        relation_types=[],
        entity_attributes={
            "模型": {
                "year": {"type": "int", "required": False, "desc": "发表年份"},
                "venue": {"type": "string", "required": False, "desc": "发表会议/期刊"}
            }
        },
        relation_attributes={}
    )
    await ontology_service.create(spec)

    # 创建 enricher
    enricher = EntityEnricher(
        graph_storage=graph_storage,
        llm_func=llm_func,
        ontology_service=ontology_service
    )

    # Enrich
    result = await enricher.enrich(
        project_id="test_proj",
        entity_name="BERT-base",
        fields_to_generate=["year", "venue"]
    )

    assert result.status == "success"
    assert "updated_attributes" in result
    assert "diff" in result
    assert "evidence" in result

@pytest.mark.asyncio
async def test_diff_computation():
    """测试差分计算"""
    old = {"a": 1, "b": 2}
    new = {"a": 1, "b": 3, "c": 4}

    diff = EntityEnricher._compute_diff(None, old, new)

    assert "added" in diff
    assert "modified" in diff
    assert "removed" in diff
    assert diff["added"] == {"c": 4}
    assert diff["modified"] == {"b": {"old": 2, "new": 3}}
    assert diff["removed"] == {}
```

### 完成标准
- [ ] Enrich Prompt 模板实现完成
- [ ] EntityEnricher 核心逻辑完成
- [ ] API 路由添加完成
- [ ] 单元测试覆盖率 > 80%
- [ ] 文档更新

---

## 阶段 6：API 集成和端到端测试

### 目标
集成所有模块，实现端到端处理流程

### 任务清单

#### 6.1 项目管理 API（1 天）

**文件**：`lightrag/api/routers/project_routes.py`

**代码**：
```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="项目名称")
    description: str = Field("", max_length=500, description="项目描述")


class ProjectResponse(BaseModel):
    project_id: str
    name: str
    description: str
    ontology_id: Optional[str]
    workspace: str
    created_at: str
    updated_at: str
    status: str


def create_project_routes(rag, api_key: Optional[str] = None):
    """创建项目管理路由"""
    combined_auth = get_combined_auth_dependency(api_key)

    @router.post("", dependencies=[Depends(combined_auth)])
    async def create_project(request: ProjectCreateRequest) -> ProjectResponse:
        """创建项目"""
        try:
            # 生成 project_id
            project_id = f"proj_{uuid.uuid4().hex[:8]}"

            # 生成 workspace
            workspace = f"workspace_{project_id}"

            # 创建项目节点（在 Neo4j 中）
            from lightrag.projects import ProjectManager
            project_manager = ProjectManager(rag.chunk_entity_relation_graph)

            project = await project_manager.create(
                project_id=project_id,
                name=request.name,
                description=request.description,
                workspace=workspace
            )

            logger.info(f"创建项目: {project_id}")

            return ProjectResponse(
                project_id=project.project_id,
                name=project.name,
                description=project.description,
                ontology_id=project.ontology_id,
                workspace=project.workspace,
                created_at=project.created_at,
                updated_at=project.updated_at,
                status=project.status
            )

        except Exception as e:
            logger.error(f"Error creating project: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("", dependencies=[Depends(combined_auth)])
    async def list_projects() -> List[ProjectResponse]:
        """列出所有项目"""
        try:
            from lightrag.projects import ProjectManager
            project_manager = ProjectManager(rag.chunk_entity_relation_graph)

            projects = await project_manager.list_projects()

            return [
                ProjectResponse(
                    project_id=p.project_id,
                    name=p.name,
                    description=p.description,
                    ontology_id=p.ontology_id,
                    workspace=p.workspace,
                    created_at=p.created_at,
                    updated_at=p.updated_at,
                    status=p.status
                )
                for p in projects
            ]

        except Exception as e:
            logger.error(f"Error listing projects: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/{project_id}/switch", dependencies=[Depends(combined_auth)])
    async def switch_project(project_id: str):
        """切换项目（更新 workspace）"""
        try:
            from lightrag.projects import ProjectManager
            project_manager = ProjectManager(rag.chunk_entity_relation_graph)

            project = await project_manager.get(project_id)
            if project is None:
                raise HTTPException(status_code=404, detail=f"项目 {project_id} 不存在")

            # 更新全局 workspace
            # 注意：这需要修改 LightRAG 的 workspace 切换逻辑
            # 暂时返回消息
            logger.info(f"切换到项目: {project_id}, workspace: {project.workspace}")

            return {
                "status": "success",
                "message": f"已切换到项目：{project.name}",
                "workspace": project.workspace
            }

        except Exception as e:
            logger.error(f"Error switching project: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    return router
```

#### 6.2 本体管理 API（0.5 天）

**文件**：`lightrag/api/routers/ontology_routes.py`

**代码**：
```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any

router = APIRouter(prefix="/projects/{project_id}", tags=["ontology"])


class OntologyCreateRequest(BaseModel):
    version: str = Field("1.0.0", description="本体版本号")
    language: str = Field("zh-cn", description="语言")
    entity_types: List[str] = Field(..., min_items=1, description="实体类型列表")
    relation_types: List[str] = Field(..., min_items=1, description="关系类型列表")
    entity_attributes: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="实体属性")
    relation_attributes: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="关系属性")
    normalization_rules: Optional[Dict[str, Any]] = Field(None, description="归一化规则")


class OntologyResponse(BaseModel):
    ontology_id: str
    project_id: str
    version: str
    language: str
    entity_types: List[str]
    relation_types: List[str]
    entity_attributes: Dict[str, Dict[str, Any]]
    relation_attributes: Dict[str, Dict[str, Any]]
    normalization_rules: Optional[Dict[str, Any]]
    created_at: str
    updated_at: str


def create_ontology_routes(rag, api_key: Optional[str] = None):
    """创建本体管理路由"""
    combined_auth = get_combined_auth_dependency(api_key)

    @router.post("/ontology", dependencies=[Depends(combined_auth)])
    async def create_ontology(project_id: str, request: OntologyCreateRequest) -> OntologyResponse:
        """创建/更新本体"""
        try:
            from lightrag.ontology import OntologyService, OntologySpec
            import uuid

            ontology_service = OntologyService(rag.chunk_entity_relation_graph)

            # 检查是否已有本体
            existing = await ontology_service.get_by_project(project_id)

            if existing:
                # 更新现有本体
                updated_spec = existing
                updated_spec.entity_types = request.entity_types
                updated_spec.relation_types = request.relation_types
                updated_spec.entity_attributes = request.entity_attributes
                updated_spec.relation_attributes = request.relation_attributes
                updated_spec.normalization_rules = request.normalization_rules

                result = await ontology_service.update(
                    existing.ontology_id,
                    updated_spec
                )
                logger.info(f"更新本体: {existing.ontology_id}, 新版本: {result.version}")
            else:
                # 创建新本体
                spec = OntologySpec(
                    ontology_id=f"onto_{uuid.uuid4().hex[:8]}",
                    project_id=project_id,
                    version=request.version,
                    language=request.language,
                    entity_types=request.entity_types,
                    relation_types=request.relation_types,
                    entity_attributes=request.entity_attributes,
                    relation_attributes=request.relation_attributes,
                    normalization_rules=request.normalization_rules
                )
                result = await ontology_service.create(spec)
                logger.info(f"创建本体: {result.ontology_id}")

            # 更新项目的 ontology_id
            from lightrag.projects import ProjectManager
            project_manager = ProjectManager(rag.chunk_entity_relation_graph)
            await project_manager.set_ontology_id(project_id, result.ontology_id)

            return OntologyResponse(
                ontology_id=result.ontology_id,
                project_id=result.project_id,
                version=result.version,
                language=result.language,
                entity_types=result.entity_types,
                relation_types=result.relation_types,
                entity_attributes=result.entity_attributes,
                relation_attributes=result.relation_attributes,
                normalization_rules=result.normalization_rules,
                created_at=result.created_at,
                updated_at=result.updated_at
            )

        except Exception as e:
            logger.error(f"Error creating ontology: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/ontology", dependencies=[Depends(combined_auth)])
    async def get_ontology(project_id: str) -> OntologyResponse:
        """获取本体"""
        try:
            from lightrag.ontology import OntologyService

            ontology_service = OntologyService(rag.chunk_entity_relation_graph)
            spec = await ontology_service.get_by_project(project_id)

            if spec is None:
                raise HTTPException(status_code=404, detail=f"项目 {project_id} 没有本体")

            return OntologyResponse(
                ontology_id=spec.ontology_id,
                project_id=spec.project_id,
                version=spec.version,
                language=spec.language,
                entity_types=spec.entity_types,
                relation_types=spec.relation_types,
                entity_attributes=spec.entity_attributes,
                relation_attributes=spec.relation_attributes,
                normalization_rules=spec.normalization_rules,
                created_at=spec.created_at,
                updated_at=spec.updated_at
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting ontology: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    return router
```

#### 6.3 文档上传 API 扩展（0.5 天）

**文件**：`lightrag/api/routers/document_routes.py`（修改）

**改动点**：扩展上传接口支持 `project_id` 和 `parse_method`

```python
# 在现有的 upload 函数中添加参数
@router.post("/upload", dependencies=[Depends(combined_auth)])
async def upload_document(
    file: UploadFile,
    project_id: str = Form(None),  # 新增
    parse_method: str = Form("auto"),  # 新增
    background_tasks: BackgroundTasks = None,
) -> DocActionResponse:
    """
    上传文档

    Args:
        file: 文档文件
        project_id: 项目 ID（可选）
        parse_method: 解析方法（"auto" | "raganything" | "docling"）

    Returns:
        上传结果
    """
    try:
        # 保存文件
        file_path = await _save_uploaded_file(file)

        # 更新 metadata
        metadata = {
            "project_id": project_id,
            "parse_method": parse_method,
            "uploaded_at": datetime.utcnow().isoformat()
        }

        # 处理文档（复用现有逻辑）
        # 注意：这里需要将 project_id 和 parse_method 传递给处理 pipeline
        # 可能需要修改 insert() 函数签名

        track_id = await rag.ainsert(
            file_path,
            metadata=metadata
        )

        return DocActionResponse(
            status="success",
            message="文档处理已开始",
            track_id=track_id
        )

    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

#### 6.4 端到端集成测试（1 天）

**文件**：`tests/integration/test_e2e.py`

**代码**：
```python
import pytest
from lightrag import LightRAG
from lightrag.projects import ProjectManager
from lightrag.ontology import OntologyService, OntologySpec

@pytest.mark.asyncio
@pytest.mark.integration
async def test_e2e_pipeline():
    """端到端测试"""
    # 1. 创建项目
    project_manager = ProjectManager(graph_storage)
    project = await project_manager.create(
        name="测试项目",
        description="端到端测试"
    )

    # 2. 创建本体
    ontology_service = OntologyService(graph_storage)
    spec = OntologySpec(
        ontology_id="test_e2e",
        project_id=project.project_id,
        version="1.0.0",
        language="zh-cn",
        entity_types=["人物", "机构", "论文", "Other"],
        relation_types=["隶属", "提出", "引用", "Other"],
        entity_attributes={
            "论文": {
                "title": {"type": "string", "required": False, "desc": "论文标题"},
                "year": {"type": "int", "required": False, "desc": "发表年份"}
            }
        },
        relation_attributes={},
        normalization_rules={}
    )
    await ontology_service.create(spec)

    # 3. 上传文档
    doc_path = "tests/fixtures/sample.pdf"
    track_id = await rag.ainsert(
        doc_path,
        metadata={"project_id": project.project_id, "parse_method": "auto"}
    )

    # 4. 等待处理完成
    # 需要实现 wait_for_processing 函数
    await wait_for_processing(track_id)

    # 5. 验证抽取结果
    # 查询图谱
    graph = await rag.get_knowledge_graph(
        node_label="论文",
        max_depth=2
    )

    assert len(graph["nodes"]) > 0
    assert len(graph["edges"]) > 0

    # 6. Enrich 实体
    from lightrag.enrich import EntityEnricher
    enricher = EntityEnricher(
        graph_storage=rag.chunk_entity_relation_graph,
        llm_func=rag.llm_model_func,
        ontology_service=ontology_service
    )

    enrich_result = await enricher.enrich(
        project_id=project.project_id,
        entity_name="BERT",
        fields_to_generate=["year", "venue"]
    )

    assert enrich_result.status == "success"
    assert "updated_attributes" in enrich_result

    logger.info("端到端测试通过")
```

#### 6.5 文档更新（0.5 天）

**文件**：`docs/multimodal-kg-rag-guide.md`

**内容**：
```markdown
# 多模态 KG-RAG 使用指南

## 快速开始

### 1. 创建项目

```bash
curl -X POST http://localhost:9621/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的知识图谱项目",
    "description": "论文数据集研究"
  }'
```

### 2. 创建本体

```bash
curl -X POST http://localhost:9621/api/projects/proj_abc123/ontology \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.0.0",
    "language": "zh-cn",
    "entity_types": ["人物", "机构", "论文", "数据集", "Other"],
    "relation_types": ["隶属", "提出", "使用", "评测", "Other"],
    "entity_attributes": {
      "论文": {
        "title": {"type": "string", "required": false, "desc": "论文标题"},
        "year": {"type": "int", "required": false, "desc": "发表年份"}
      }
    },
    "relation_attributes": {}
  }'
```

### 3. 上传文档

```bash
curl -X POST http://localhost:9621/api/documents/upload \
  -F "file=@sample.pdf" \
  -F "project_id=proj_abc123" \
  -F "parse_method=auto"
```

### 4. Enrich 实体

```bash
curl -X POST http://localhost:9621/api/graph/entity/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj_abc123",
    "entity_name": "BERT",
    "fields_to_generate": ["year", "venue"]
  }'
```

## API 参考

[完整 API 文档链接]
```

### 完成标准
- [ ] 项目管理 API 实现完成
- [ ] 本体管理 API 实现完成
- [ ] 文档上传 API 扩展完成
- [ ] 端到端集成测试通过
- [ ] 用户文档更新完成

---

## 附录：依赖清单

### Python 依赖

```toml
# pyproject.toml 新增依赖
[project]
dependencies = [
    # ... 现有依赖
    "raganything>=0.1.0",  # 多模态解析
]
```

### 环境变量

```bash
# .env 新增变量
RAGANYTHING_MINERU_ENDPOINT=http://127.0.0.1:30000
RAGANYTHING_MINERU_PARSE_METHOD=auto
RAGANYTHING_ENABLE_IMAGE_PROCESSING=true
RAGANYTHING_ENABLE_TABLE_PROCESSING=true
RAGANYTHING_ENABLE_EQUATION_PROCESSING=true
RAGANYTHING_TIMEOUT=300
```

---

## 总结

本开发计划提供了完整的后端开发路线图，包括：

1. **阶段 1-3（P0）**：核心功能，本体服务、关系格式升级、Prompt 注入
2. **阶段 4-5（P1）**：多模态解析、Enrich 服务
3. **阶段 6（P1）**：API 集成和端到端测试

每个阶段都包含：
- 详细的任务清单
- 代码示例
- 测试方法
- 完成标准

开发过程中请同步更新文档，确保可审计性。
