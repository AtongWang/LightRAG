# Ontology-Driven 多模态 KG-RAG：架构设计 v2.0

> **更新说明**：基于 RAGAnything 独立库、Neo4j 存储、手动 Enrich 的需求调整

## 核心设计原则

1. **复用 LightRAG 存储架构**：本体存储集成到 Neo4j
2. **直接调用 RAGAnything**：无需重复实现解析逻辑，作为外部依赖
3. **本体驱动抽取**：动态注入 entity_types、relation_types、attributes schema
4. **可审计性**：记录所有实验参数、版本、diff

---

## 1. 系统架构

### 1.1 总体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           前端层 (WebUI)                       │
│  项目管理  │  本体编辑  │  文档上传  │  图谱浏览  │  Enrich 操作  │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ HTTP API
┌──────────────────────────▼──────────────────────────────────────────────┐
│                        API 层 (FastAPI)                          │
│  /projects/*  │  /ontology/*  │  /documents/*  │  /graph/*       │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────────┐
│                    业务逻辑层 (Services)                            │
│  ProjectManager  │  OntologyService  │  EntityEnricher  │  ParserService │
└────┬─────────────────┬─────────────────┬─────────────────┬──────────┘
     │                 │                 │                 │
┌────▼─────────────────▼─────────────────▼─────────────────▼──────────┐
│                    存储层 (Storage)                             │
│  Neo4jStorage (图谱+本体)  │  KVStorage (缓存)  │  VectorStorage  │
└────────────────────────────┬───────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────────┐
│                    外部依赖                                     │
│  RAGAnything (多模态解析)  │  MinerU (Docker)  │  LLM Provider    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心模块定义

#### 1.2.1 项目管理模块 (`lightrag/projects/`)

**职责**：
- 项目生命周期管理（创建、列表、删除）
- 项目与 workspace 映射
- 项目与 ontology_id 绑定

**核心类**：
```python
# lightrag/projects/__init__.py
class ProjectManager:
    """项目管理器"""
    async def create_project(name: str, description: str) -> Project
    async def get_project(project_id: str) -> Project
    async def list_projects() -> List[Project]
    async def delete_project(project_id: str)
    async def switch_workspace(project_id: str)  # 动态切换 workspace

@dataclass
class Project:
    project_id: str          # UUID 或短 hash
    name: str
    description: str
    ontology_id: str         # 绑定的本体 ID
    workspace: str           # 对应的 workspace 名称
    created_at: str
    updated_at: str
    status: 'active' | 'archived' | 'deleted'
```

**存储设计（KV Storage）**：
- Key 格式：`project_{project_id}`
- Value：JSON 序列化的 Project 对象

```python
# 示例
await kv_storage.upsert({
    "project_proj_abc123": {
        "project_id": "proj_abc123",
        "name": "项目名称",
        "description": "项目描述",
        "ontology_id": "onto_xyz456",
        "workspace": "workspace_proj_abc123",
        "created_at": "2025-01-07T10:00:00Z",
        "updated_at": "2025-01-07T10:00:00Z",
        "status": "active"
    }
})
```

#### 1.2.2 本体服务模块 (`lightrag/ontology/`)

**职责**：
- 本体 CRUD 操作
- 本体版本管理
- 本体校验
- Prompt 变量注入

**核心类**：
```python
# lightrag/ontology/__init__.py
class OntologyService:
    """本体服务（基于 Neo4j 存储）"""
    async def create(self, spec: OntologySpec) -> OntologySpec
    async def update(self, ontology_id: str, spec: OntologySpec) -> OntologySpec
    async def get(self, ontology_id: str) -> OntologySpec
    async def list_by_project(self, project_id: str) -> List[OntologySpec]
    async def validate(self, spec: OntologySpec) -> ValidationResult

    # Prompt 注入
    async def inject_into_prompt(
        self,
        ontology_id: str,
        prompt_template: str
    ) -> dict[str, str]
        """返回可注入到 prompt 的变量字典"""

@dataclass
class OntologySpec:
    ontology_id: str
    project_id: str
    version: str
    language: str
    entity_types: List[str]
    relation_types: List[str]
    entity_attributes: Dict[str, Dict[str, Any]]
    relation_attributes: Dict[str, Dict[str, Any]]
    normalization_rules: Optional[Dict[str, Any]]
```

**存储设计**：
- 使用 Neo4j 存储本体节点
- Label: `Ontology`
- Properties:
  ```cypher
  (:Ontology {
    ontology_id: "onto_xxx",
    project_id: "proj_xxx",
    version: "1.0.0",
    language: "zh-cn",
    entity_types: ["人物", "机构", ...],
    relation_types: ["隶属", "提出", ...],
    entity_attributes: {JSON 对象},
    relation_attributes: {JSON 对象},
    normalization_rules: {JSON 对象},
    created_at: "2025-01-07T10:00:00Z",
    updated_at: "2025-01-07T10:00:00Z"
  })
  ```

**Neo4j 查询示例**：
```cypher
// 创建本体
CREATE (o:Ontology {
  ontology_id: $ontology_id,
  project_id: $project_id,
  ...
})

// 获取项目的当前本体
MATCH (p:Project {project_id: $project_id})<-[:BELONGS_TO]-(o:Ontology)
WHERE o.status = 'active'
RETURN o

// 查询本体版本历史
MATCH (o:Ontology {ontology_id: $ontology_id})
RETURN o.version, o.created_at
ORDER BY o.created_at DESC
```

#### 1.2.3 解析服务模块 (`lightrag/parsers/`)

**职责**：
- 统一解析接口
- 调用 RAGAnything 库进行多模态解析
- 输出统一的 ParsedDocument 结构

**核心类**：
```python
# lightrag/parsers/__init__.py
class ParserService:
    """解析服务（基于 RAGAnything）"""
    def __init__(self, raganything_config: RAGAnythingConfig):
        self.rag = RAGAnything(config=raganything_config, ...)

    async def parse(
        self,
        file_path: str,
        parse_method: str = "auto"  # "auto" | "mineru" | "docling"
    ) -> ParsedDocument
        """调用 RAGAnything 解析文档"""

@dataclass
class ParsedDocument:
    project_id: str
    source: Dict[str, Any]
    markdown: str
    assets: Dict[str, List[Asset]]
    source_map: Dict[str, Any]
    metadata: Dict[str, Any]

@dataclass
class Asset:
    asset_id: str
    path: str
    page: Optional[int]
    bbox: Optional[List[float]]
    caption: Optional[str]
    md_ref: Optional[str]
```

**RAGAnything 集成方式**：
```python
# lightrag/parsers/raganything_adapter.py
from raganything import RAGAnything, RAGAnythingConfig

class RAGAnythingAdapter:
    """RAGAnything 适配器"""

    def __init__(self, config: RAGAnythingConfig):
        self.config = config
        self.rag = None  # 延迟初始化

    async def parse(self, file_path: str) -> ParsedDocument:
        # 初始化 RAGAnything
        if self.rag is None:
            self.rag = RAGAnything(
                config=self.config,
                llm_model_func=self._llm_func,
                vision_model_func=self._vision_func,
                embedding_func=self._embedding_func,
            )

        # 调用 RAGAnything 解析
        await self.rag.process_document_complete(
            file_path=file_path,
            output_dir=f"/tmp/raganything_{file_path_hash}",
            parse_method=self.config.mineru_parse_method
        )

        # 读取解析结果
        result_path = Path(file_path).parent / f"{Path(file_path).stem}_parsed.json"
        with open(result_path) as f:
            raganything_result = json.load(f)

        # 转换为统一的 ParsedDocument
        return self._convert_to_parsed_document(raganything_result)

    def _convert_to_parsed_document(self, result: dict) -> ParsedDocument:
        """转换 RAGAnything 输出为 ParsedDocument"""
        return ParsedDocument(
            markdown=result.get("markdown", ""),
            assets=self._parse_assets(result.get("assets", [])),
            source_map=result.get("source_map", {}),
            metadata=result.get("metadata", {}),
            # ...
        )
```

#### 1.2.4 实体 Enrich 服务 (`lightrag/enrich/`)

**职责**：
- 基于本体生成实体新属性
- 手动触发 enrich 操作
- 记录 enrich 前后 diff

**核心类**：
```python
# lightrag/enrich/__init__.py
class EntityEnricher:
    """实体 Enrich 服务"""
    def __init__(
        self,
        graph_storage: BaseGraphStorage,
        llm_func: callable,
        ontology_service: OntologyService
    ):
        self.graph = graph_storage
        self.llm_func = llm_func
        self.ontology = ontology_service

    async def enrich(
        self,
        project_id: str,
        entity_name: str,
        fields_to_generate: Optional[List[str]] = None
    ) -> EnrichResult
        """Enrich 指定实体"""

@dataclass
class EnrichResult:
    status: 'success' | 'failed'
    entity_name: str
    updated_attributes: Dict[str, Any]
    diff: Dict[str, Any]
    evidence: List[Dict[str, Any]]
    error_message: Optional[str]
```

---

## 2. 关系格式升级（5字段 → 6字段）

### 2.1 格式对比

**当前格式（5字段）**：
```
relation{tuple_delimiter}source_entity{tuple_delimiter}target_entity{tuple_delimiter}keywords{tuple_delimiter}description
```

**目标格式（6字段）**：
```
relation{tuple_delimiter}source_entity{tuple_delimiter}target_entity{tuple_delimiter}relation_type{tuple_delimiter}keywords{tuple_delimiter}description
```

### 2.2 代码改动点

| 文件 | 改动点 | 说明 |
|------|---------|------|
| `lightrag/prompt.py:34` | System Prompt 关系格式说明 | 添加 `relation_type` 字段 |
| `lightrag/prompt.py:94` | Continue Prompt 关系格式说明 | 更新字段数从 5→6 |
| `lightrag/prompt.py:103-183` | Examples 更新 | 所有示例使用 6 字段格式 |
| `lightrag/operate.py:458` | 关系字段数校验 | `len==5` → `len==6` |
| `lightrag/operate.py:500-520` | 字段解析逻辑 | 提取 `relation_type` 字段 |
| `lightrag/kg/neo4j_impl.py` | 边属性存储 | 确保 `relation_type` 写入 properties |

### 2.3 Prompt 模板更新

**System Prompt 更新** (`lightrag/prompt.py:28-34`)：
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

**User Prompt 注入更新** (`lightrag/operate.py:2806-2811`)：
```python
context_base = dict(
    tuple_delimiter=PROMPTS["DEFAULT_TUPLE_DELIMITER"],
    completion_delimiter=PROMPTS["DEFAULT_COMPLETION_DELIMITER"],
    entity_types=",".join(entity_types),
    relation_types=",".join(relation_types),  # 新增
    entity_schema=json.dumps(entity_attributes),  # 新增
    relation_schema=json.dumps(relation_attributes),  # 新增
    examples=examples,
    language=language,
)
```

---

## 3. 本体驱动抽取流程

### 3.1 完整流程

```
1. 用户创建项目 → 绑定 workspace
   ↓
2. 用户创建/编辑本体 → 存储到 Neo4j
   ↓
3. 用户上传文档 → 指定 project_id 和 ontology_id
   ↓
4. 后台 Pipeline：
   a) 文档解析（RAGAnything）→ ParsedDocument
   b) Chunking（LightRAG）→ TextChunkSchema
   c) 本体加载（OntologyService）→ OntologySpec
   d) Prompt 注入（OntologyService）→ 注入变量
   e) LLM 抽取（LightRAG）→ 三元组（含 relation_type）
   f) 图谱写入（Neo4j）→ 节点+边+relation_type
   g) 向量写入（VectorStorage）→ embeddings
```

### 3.2 Prompt 注入详细设计

**注入变量映射**：
```python
# OntologyService.inject_into_prompt() 返回的变量
context_vars = {
    # 原有变量
    "tuple_delimiter": "<|#|>",
    "completion_delimiter": "<|COMPLETE|>",
    "entity_types": "人物,机构,地点,论文,数据集,方法,模型,任务,指标,设备,图像,表格,公式,Other",
    "language": "zh-cn",
    "examples": "...",  # 包含示例的完整文本

    # 新增变量
    "relation_types": "隶属,提出,使用,评测,对比,包含,引用,生成,位于,描述,Other",
    "entity_schema": json.dumps({
        "人物": {
            "affiliations": {"type": "string[]", "required": false, "desc": "人物所属机构"},
            "roles": {"type": "string[]", "required": false, "desc": "人物角色"},
            "orcid": {"type": "string", "required": false, "desc": "ORCID"}
        },
        "论文": {
            "title": {"type": "string", "required": false, "desc": "论文标题"},
            "year": {"type": "int", "required": false, "desc": "发表年份"},
            "venue": {"type": "string", "required": false, "desc": "发表会议/期刊"},
            "doi": {"type": "string", "required": false, "desc": "DOI"}
        },
        # ...
    }),
    "relation_schema": json.dumps({
        "提出": {
            "evidence_level": {"type": "string", "required": false, "desc": "证据强度"}
        },
        "评测": {
            "metric": {"type": "string", "required": false, "desc": "指标名称"},
            "value": {"type": "string", "required": false, "desc": "指标值"}
        },
        # ...
    })
}

# Prompt 模板中的占位符
"""
{entity_types}           → "人物,机构,地点,..."
{relation_types}         → "隶属,提出,使用,..."
{entity_schema}          → JSON 字符串（实体属性 schema）
{relation_schema}         → JSON 字符串（关系属性 schema）
"""
```

### 3.3 属性抽取 Prompt 扩展

在 System Prompt 中添加属性抽取说明：

```python
"""
7.  **Entity Attributes Extraction**:
    *   For each extracted entity, extract additional attributes according to the entity attribute schema: `{entity_schema}`.
    *   Only extract attributes that are explicitly mentioned in the input text. Do not infer or assume values.
    *   Follow the specified type constraints: `string`, `string[]`, `int`, `number[4]`, etc.
    *   If no attributes are found for an entity, output an empty object `{}`.
    *   Output format: Append attribute object as a JSON string after the entity description, separated by `||`.
        Example: `entity{tuple_delimiter}Person Name{tuple_delimiter}person{tuple_delimiter}Description||{{"affiliations": ["Organization A"], "orcid": "1234-5678-9012"}}`
"""

8.  **Relation Attributes Extraction**:
    *   For each extracted relationship, extract additional attributes according to the relation attribute schema: `{relation_schema}`.
    *   Only extract attributes that are explicitly mentioned in the input text.
    *   Output format: Append attribute object as a JSON string after the relation description, separated by `||`.
        Example: `relation{tuple_delimiter}Person{tuple_delimiter}Organization{tuple_delimiter}隶属{tuple_delimiter}works for,employee||{{"evidence_level": "明确"}}`
"""
```

---

## 4. API 设计

### 4.1 项目管理 API

```python
# 创建项目
POST /api/projects
Request: {
    "name": "多模态知识图谱项目",
    "description": "论文数据集的 KG-RAG 研究"
}
Response: {
    "status": "success",
    "data": {
        "project_id": "proj_abc123",
        "name": "多模态知识图谱项目",
        "description": "论文数据集的 KG-RAG 研究",
        "ontology_id": null,
        "workspace": "workspace_proj_abc123",
        "created_at": "2025-01-07T10:00:00Z",
        "status": "active"
    }
}

# 项目列表
GET /api/projects
Response: {
    "status": "success",
    "data": [...]
}

# 切换项目（更新 workspace）
POST /api/projects/{project_id}/switch
Response: {
    "status": "success",
    "message": "已切换到项目：多模态知识图谱项目",
    "workspace": "workspace_proj_abc123"
}
```

### 4.2 本体管理 API

```python
# 创建/更新本体
POST /api/projects/{project_id}/ontology
Request: {
    "version": "1.0.0",
    "language": "zh-cn",
    "entity_types": ["人物", "机构", "地点", "论文", ...],
    "relation_types": ["隶属", "提出", "使用", ...],
    "entity_attributes": {...},
    "relation_attributes": {...},
    "normalization_rules": {...}
}
Response: {
    "status": "success",
    "data": {
        "ontology_id": "onto_xyz456",
        "project_id": "proj_abc123",
        "version": "1.0.0",
        ...
    }
}

# 获取本体
GET /api/projects/{project_id}/ontology
Response: {
    "status": "success",
    "data": {
        "ontology_id": "onto_xyz456",
        "project_id": "proj_abc123",
        ...
    }
}
```

### 4.3 文档处理 API（扩展）

```python
# 上传文档（扩展现有 API）
POST /api/documents/upload
Request: FormData {
    "file": <binary>,
    "project_id": "proj_abc123",
    "parse_method": "auto"  # "auto" | "mineru" | "docling"
}
Response: {
    "status": "success",
    "track_id": "track_20250107_100000",
    "message": "文档处理已开始"
}

# 查询处理进度（增强现有 API）
GET /api/documents/track/{track_id}
Response: {
    "track_id": "track_20250107_100000",
    "status": "processing",
    "stage": "parsing",  # "parsing" | "chunking" | "extracting" | "enriching" | "completed"
    "stage_detail": {
        "parsed": 1,
        "total_chunks": 50,
        "extracted_entities": 120,
        "extracted_relations": 85
    },
    "documents": [...],
    "progress": 45.5
}
```

### 4.4 Enrich API

```python
# Enrich 实体
POST /api/graph/entity/enrich
Request: {
    "project_id": "proj_abc123",
    "entity_name": "BERT-base",
    "fields_to_generate": ["year", "venue", "authors"]
}
Response: {
    "status": "success",
    "data": {
        "entity_name": "BERT-base",
        "updated_attributes": {
            "year": 2018,
            "venue": "NAACL",
            "authors": ["Devlin et al."]
        },
        "diff": {
            "added": {
                "year": 2018,
                "venue": "NAACL",
                "authors": ["Devlin et al."]
            }
        },
        "evidence": [
            {
                "chunk_id": "chunk_xxx",
                "source_text": "BERT was published in NAACL 2018...",
                "confidence": 0.95
            }
        ]
    }
}
```

---

## 5. 存储设计（KV Storage + Neo4j）

### 5.1 数据模型

```
# 节点类型
(:Project)          - 项目节点（KV Storage）
(:Entity)           - 实体节点（Neo4j）
(:Document)          - 文档节点（KV Storage，可选）

# 关系类型
(:Project)-[:HAS_ONTOLOGY]->(:Ontology)              - 项目拥有本体（KV Storage）
(:Entity)-[:DEFINED_IN]->(:Ontology)              - 实体在本体中定义（可选）
```

### 5.2 Neo4j Schema

```cypher
// 创建索引
CREATE INDEX project_project_id IF NOT EXISTS FOR (p:Project) ON (p.project_id);
CREATE INDEX ontology_ontology_id IF NOT EXISTS FOR (o:Ontology) ON (o.ontology_id);
CREATE INDEX ontology_project_id IF NOT EXISTS FOR (o:Ontology) ON (o.project_id);
CREATE INDEX entity_name IF NOT EXISTS FOR (e:Entity) ON (e.id);  // 现有

// 创建约束（唯一性）
CREATE CONSTRAINT project_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.project_id IS UNIQUE;
CREATE CONSTRAINT ontology_unique IF NOT EXISTS FOR (o:Ontology) REQUIRE o.ontology_id IS UNIQUE;

// 创建项目
CREATE (p:Project {
    project_id: $project_id,
    name: $name,
    description: $description,
    ontology_id: NULL,
    workspace: $workspace,
    created_at: datetime(),
    updated_at: datetime(),
    status: 'active'
})

// 创建本体并关联到项目
MATCH (p:Project {project_id: $project_id})
CREATE (o:Ontology {
    ontology_id: $ontology_id,
    project_id: $project_id,
    version: $version,
    language: $language,
    entity_types: $entity_types,
    relation_types: $relation_types,
    entity_attributes: $entity_attributes,
    relation_attributes: $relation_attributes,
    normalization_rules: $normalization_rules,
    created_at: datetime(),
    updated_at: datetime(),
    status: 'active'
})
CREATE (p)-[:HAS_ONTOLOGY]->(o)
CREATE (o)-[:BELONGS_TO]->(p)

// 查询项目的当前本体
MATCH (p:Project {project_id: $project_id})<-[:BELONGS_TO]-(o:Ontology)
WHERE o.status = 'active'
RETURN o

// 本体版本查询
MATCH (o:Ontology {project_id: $project_id})
RETURN o.ontology_id, o.version, o.created_at
ORDER BY o.created_at DESC
```

### 5.3 本体版本管理策略

1. **版本号格式**：`major.minor.patch` (例如 `1.0.0`)
2. **版本规则**：
   - 创建新本体时，版本为 `1.0.0`
   - 修改本体时，自动递增 patch：`1.0.1`
   - 重大变更（entity_types 改变）递增 minor：`1.1.0`
   - 破坏性变更递增 major：`2.0.0`

3. **版本关联**：
   - 每个 Document 记录使用的 `ontology_id` 和 `version`
   - 每个 Enrich 操作记录使用的 `ontology_id` 和 `version`
   - 便于追溯和对比实验

---

## 6. 实验可重复性设计

### 6.1 元数据记录

**Document 元数据**（存储在 `DocProcessingStatus.metadata`）：
```json
{
    "project_id": "proj_abc123",
    "ontology_id": "onto_xyz456",
    "ontology_version": "1.0.0",
    "parse_method": "mineru",
    "parser_config": {
        "mineru_parse_method": "auto",
        "enable_image_processing": true,
        "enable_table_processing": true,
        "enable_equation_processing": true
    },
    "extraction_config": {
        "entity_types": ["人物", "机构", ...],
        "relation_types": ["隶属", "提出", ...],
        "llm_model": "gpt-4o-mini",
        "prompt_template_version": "v2.0",
        "chunk_size": 1200,
        "chunk_overlap": 100
    },
    "processing_stats": {
        "chunks_count": 50,
        "entities_extracted": 120,
        "relations_extracted": 85,
        "parsing_time_ms": 15200,
        "extraction_time_ms": 45300,
        "total_time_ms": 60500
    }
}
```

**Enrich 元数据**（存储在 Entity properties）：
```json
{
    "entity_id": "entity_bert_base",
    "entity_name": "BERT-base",
    "enrich_history": [
        {
            "enrich_id": "enrich_xxx",
            "ontology_id": "onto_xyz456",
            "ontology_version": "1.0.0",
            "fields_generated": ["year", "venue", "authors"],
            "llm_model": "gpt-4o-mini",
            "enriched_at": "2025-01-07T10:30:00Z",
            "diff": {
                "added": {"year": 2018, "venue": "NAACL"},
                "modified": {},
                "removed": {}
            },
            "evidence_chunks": ["chunk_001", "chunk_015"]
        }
    ]
}
```

### 6.2 配置可追溯性

**配置指纹**：
```python
from lightrag.utils import compute_mdhash_id

def compute_config_hash(config: dict) -> str:
    """计算配置指纹"""
    config_str = json.dumps(config, sort_keys=True)
    return compute_mdhash_id(config_str)

# 使用示例
config_hash = compute_config_hash({
    "ontology_id": "onto_xyz456",
    "ontology_version": "1.0.0",
    "entity_types": ["人物", "机构", ...],
    "relation_types": ["隶属", "提出", ...],
    "llm_model": "gpt-4o-mini",
    "chunk_size": 1200
})
# 结果: "config_hash_abc123def456"
```

---

## 7. 安全性和错误处理

### 7.1 输入验证

**本体验证**：
```python
class OntologyValidator:
    @staticmethod
    def validate_entity_types(entity_types: List[str]) -> ValidationResult:
        """验证实体类型列表"""
        if not entity_types:
            return ValidationResult(False, "entity_types 不能为空")
        if "Other" not in entity_types:
            return ValidationResult(False, "entity_types 必须包含 'Other'")
        return ValidationResult(True)

    @staticmethod
    def validate_relation_types(relation_types: List[str]) -> ValidationResult:
        """验证关系类型列表"""
        if not relation_types:
            return ValidationResult(False, "relation_types 不能为空")
        if "Other" not in relation_types:
            return ValidationResult(False, "relation_types 必须包含 'Other'")
        return ValidationResult(True)

    @staticmethod
    def validate_attributes_schema(schema: Dict) -> ValidationResult:
        """验证属性 schema"""
        for entity_type, attrs in schema.items():
            for attr_name, attr_def in attrs.items():
                if "type" not in attr_def:
                    return ValidationResult(False, f"{entity_type}.{attr_name} 缺少 type 定义")
                if "required" not in attr_def:
                    return ValidationResult(False, f"{entity_type}.{attr_name} 缺少 required 定义")
        return ValidationResult(True)
```

### 7.2 错误处理

**解析器错误处理**：
```python
class ParserService:
    async def parse(self, file_path: str) -> ParsedDocument:
        try:
            result = await self._parse_internal(file_path)
            return result
        except RAGAnythingTimeoutError as e:
            logger.error(f"RAGAnything 超时: {e}")
            raise ParserException("解析超时，请稍后重试")
        except RAGAnythingParseError as e:
            logger.error(f"RAGAnything 解析失败: {e}")
            raise ParserException(f"解析失败: {str(e)}")
        except Exception as e:
            logger.error(f"未知解析错误: {e}")
            raise ParserException("解析过程中发生未知错误")

        # Fallback 到 Docling
        if self.config.enable_fallback:
            logger.info("尝试使用 Docling 作为 fallback 解析器")
            return await self._parse_with_docling(file_path)
```

---

## 8. 性能优化

### 8.1 本体缓存

```python
class OntologyService:
    def __init__(self, graph_storage: BaseGraphStorage):
        self.graph = graph_storage
        self._cache: Dict[str, OntologySpec] = {}
        self._cache_ttl: int = 3600  # 1 小时

    async def get(self, ontology_id: str) -> OntologySpec:
        # 检查缓存
        if ontology_id in self._cache:
            return self._cache[ontology_id]

        # 从 Neo4j 加载
        node = await self.graph.get_node(ontology_id)
        spec = self._node_to_spec(node)

        # 写入缓存
        self._cache[ontology_id] = spec
        return spec

    async def update(self, ontology_id: str, spec: OntologySpec):
        # 更新 Neo4j
        await self.graph.upsert_node(ontology_id, self._spec_to_node(spec))

        # 清除缓存
        self._cache.pop(ontology_id, None)
```

### 8.2 批量操作优化

```python
class EntityEnricher:
    async def enrich_batch(
        self,
        project_id: str,
        entity_names: List[str],
        fields_to_generate: Optional[List[str]] = None
    ) -> List[EnrichResult]:
        """批量 enrich 实体"""
        # 并发处理
        tasks = [
            self.enrich(project_id, entity_name, fields_to_generate)
            for entity_name in entity_names
        ]
        return await asyncio.gather(*tasks, return_exceptions=True)
```

---

## 9. 测试策略

### 9.1 单元测试

```python
# tests/test_ontology_service.py
class TestOntologyService:
    async def test_create_ontology(self, neo4j_storage):
        service = OntologyService(neo4j_storage)
        spec = OntologySpec(
            ontology_id="test_001",
            project_id="test_proj",
            version="1.0.0",
            entity_types=["人物", "机构"],
            relation_types=["隶属", "提出"],
            ...
        )
        result = await service.create(spec)
        assert result.ontology_id == "test_001"

    async def test_validate_entity_types(self):
        validator = OntologyValidator()
        result = validator.validate_entity_types(["人物", "机构"])
        assert result.is_valid
        result = validator.validate_entity_types([])
        assert not result.is_valid

# tests/test_relation_format.py
class TestRelationFormat:
    def test_parse_six_field_relation(self):
        record = "relation<|#|>Alice<|#|>Bob<|#|>friend<|#|>colleague<|#|>They work together"
        fields = record.split(PROMPTS["DEFAULT_TUPLE_DELIMITER"])
        assert len(fields) == 6
        assert fields[3] == "friend"  # relation_type

    def test_parse_five_field_relation_compatibility(self):
        record = "relation<|#|>Alice<|#|>Bob<|#|>colleague<|#|>They work together"
        fields = record.split(PROMPTS["DEFAULT_TUPLE_DELIMITER"])
        assert len(fields) == 5
        # 应该自动补齐 relation_type="Other"
```

### 9.2 集成测试

```python
# tests/integration/test_e2e_pipeline.py
class TestEndToEndPipeline:
    async def test_upload_and_extract(self, rag_instance):
        # 1. 创建项目和本体
        project = await project_manager.create_project("测试项目")
        ontology = await ontology_service.create(test_ontology_spec)

        # 2. 上传文档
        with open("test.pdf", "rb") as f:
            upload_result = await upload_document(f, project.project_id)
            track_id = upload_result.track_id

        # 3. 等待处理完成
        status = await wait_for_processing(track_id)

        # 4. 验证抽取结果
        assert status["status"] == "completed"
        assert status["entities_extracted"] > 0
        assert status["relations_extracted"] > 0

        # 5. 验证 relation_type 字段
        relations = await get_relations_by_project(project.project_id)
        for rel in relations:
            assert "relation_type" in rel["properties"]
            assert rel["properties"]["relation_type"] in ontology.relation_types
```

---

## 10. 部署和配置

### 10.1 环境变量

```bash
# Neo4j 配置
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_MAX_CONNECTION_POOL_SIZE=100
NEO4J_CONNECTION_TIMEOUT=30.0

# RAGAnything 配置
RAGANYTHING_MINERU_PARSE_METHOD=auto
RAGANYTHING_MINERU_ENDPOINT=http://127.0.0.1:30000
RAGANYTHING_ENABLE_IMAGE_PROCESSING=true
RAGANYTHING_ENABLE_TABLE_PROCESSING=true
RAGANYTHING_ENABLE_EQUATION_PROCESSING=true
RAGANYTHING_ENABLE_FALLBACK=true  # Fallback 到 Docling
RAGANYTHING_TIMEOUT=300  # 秒

# LightRAG 配置
LIGHTRAG_GRAPH_STORAGE=Neo4JStorage
LIGHTRAG_KV_STORAGE=JsonKVStorage  # 或者 RedisKVStorage
LIGHTRAG_VECTOR_STORAGE=NanoVectorDBStorage  # 或者 MilvusVectorDBStorage
WORKSPACE=base  # 默认 workspace
```

### 10.2 Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  neo4j:
    image: neo4j:5.15
    environment:
      - NEO4J_AUTH=neo4j/password
      - NEO4J_PLUGINS=["apoc"]
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j_data:/data

  mineru:
    image: mineru/mineru:latest
    ports:
      - "30000:30000"
    volumes:
      - ./mineru_output:/output

  lightrag:
    build: .
    environment:
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USERNAME=neo4j
      - NEO4J_PASSWORD=password
      - RAGANYTHING_MINERU_ENDPOINT=http://mineru:30000
    ports:
      - "9621:9621"
    volumes:
      - ./lightrag_storage:/app/storage
    depends_on:
      - neo4j
      - mineru

volumes:
  neo4j_data:
  mineru_output:
  lightrag_storage:
```

---

## 总结

本架构设计的核心优势：

1. **完全基于 LightRAG**：利用现有的存储、抽取、API 架构
2. **Neo4j 统一存储**：图谱、项目、本体统一管理
3. **RAGAnything 解耦**：作为外部依赖，便于更新和维护
4. **本体驱动**：动态注入 entity_types、relation_types、attributes schema
5. **可审计性**：记录所有实验参数、版本、diff
6. **模块化设计**：各服务独立，便于测试和维护
