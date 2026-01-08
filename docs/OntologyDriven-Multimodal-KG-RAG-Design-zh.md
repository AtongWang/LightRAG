# 初步思路

我现在有一个开发思路 你需要根据我的思路结合这个代码库的情况 在此基础上思考如何开发 制定一个开发思路和架构设计模式

1.我希望能够借助lightrag的相关代码 在此基础上：1）可以方便的调整实体、关系的一些预先设置；2）基于中文prompt去提取chunks内的三元组，同时我对实体和关系的预先设置可以动态的接入进去;3)我的研究涉及多模态知识图谱，需要把rag-anything的代码也接入进来。

我的主要处理思路是：1）我需要指定知识图谱的本体 如涉及的实体关系以及他们需要哪些属性 2）文档传输进来后，pdf我会部署mineru服务 他可以自动的将相应文档 转化为markdown 包含图片等内容,其他格式你参考raganything的模式都看能否直接借用 3）知识图谱生成之后，我需要具备一种能力 我能够选择指定实体 让大模型进行二次编辑 如生成新的属性等（这个看能否现基于LightRag 不行就自己写）

最后涉及前端 主要就是包含文档上传、处理过程的情况，上传后 对于指定图谱我可以展示知识图谱内的相应内容等 然后还有一个KG-RAG的问答界面 （这个地方主要就是考虑API的设立，既要基于已有的Lightrag的api，也需要自己修改的代码设定API）

# Ontology-Driven 多模态 KG-RAG：基于 LightRAG + RAG-Anything + MinerU 的架构设计（草案）

> 目标：在现有 LightRAG 代码基础上，增加「每个图谱项目一份本体（Ontology）」「中文 Prompt 抽取三元组并动态注入本体」「多模态（MinerU + RAG-Anything）解析与图谱构建」「实体二次编辑/属性增广」「前端：上传/进度/图谱展示/问答」能力。

## 1. 现有代码库能力落点（你将复用的核心）

- **三元组抽取（文本 chunk → 实体/关系）**：`extract_entities()` 位于 `lightrag/operate.py`。
  - Prompt 模板位于 `lightrag/prompt.py`。
  - 抽取会从 `global_config` 读取 `entity_types`、`language` 等（天然支持动态注入）。
- **图谱与实体编辑**：API 已有实体/关系创建、编辑、合并能力（`lightrag/api/routers/graph_routes.py`）。
- **文档入队/后台处理/track_id 进度**：API 已有成熟机制（`lightrag/api/routers/document_routes.py`）。
- **WebUI**：已有文档上传、状态查询、图谱展示与问答相关 API 封装（`lightrag_webui/src/api/lightrag.ts`）。

你要做的是：在不推翻这些机制的前提下，增加“本体驱动 + 多模态解析 + enrich 工作流”的一层。

---

## 2. 总体架构（推荐：插件化 Pipeline + 本体驱动 Prompt）

### 2.1 核心模块

1) **Project（图谱项目）**
- 一个项目对应一个 `workspace`（推荐）并绑定一个 `ontology_id`。
  - 选择 `workspace` 的好处：无需为每项目创建独立 working_dir；同时可以复用 LightRAG 现有的“命名空间/隔离”能力。
  - 对外部存储（例如 Neo4j、Postgres、Redis、Milvus 等）仓库已支持使用 `WORKSPACE` 或存储专用 `*_WORKSPACE` 变量进行隔离。

2) **Storage（存储层）**
- 图谱存储：采用 Neo4j（`Neo4JStorage`）。
- 其余存储（KV、向量、doc_status）可先保持默认（本地文件/内存持久化），后续再按规模切换到 Redis/Postgres/Milvus/Qdrant 等。

2) **Ontology（本体）服务**
- 负责：本体 CRUD、版本管理、校验、供抽取和二次编辑动态注入。

3) **Document Parsing（解析）服务**
- PDF：调用你本地 Docker 部署的 MinerU → 返回 Markdown + 资源文件 + 源映射。
- 其他格式：尽量复用 RAG-Anything 的处理器策略。
- 输出统一为 `ParsedDocument`（见 3.2）。

4) **Extraction（抽取）服务**
- 在 LightRAG 的 chunking 与缓存机制上，把本体注入到 Prompt：
  - `entity_types`
  - `relation_types`
  - 属性 schema（实体属性/关系属性）
  - 约束（输出格式、允许的 relation_type、属性类型）

5) **KG Post-Editing（实体二次编辑/增广）服务**
- 从图谱选定实体 → 拉取上下文（邻接边 + 相关 chunks + 本体规则）→ LLM 生成新属性（严格 JSON）→ 写回图谱。

### 2.2 推荐设计模式

- **Strategy/Provider 模式**：
  - `ParserProvider`：MinerU / RAG-Anything / fallback
  - `ExtractorProvider`：纯文本抽取 / 多模态抽取（后续增强）
  - `OntologyProvider`：KV 存储实现（未来可换 DB）
- **Pipeline Orchestrator**：
  - 复用现有“后台任务 + track_id”机制。
  - 只在每个阶段记录状态（parsed/indexed/extracted/enriched）。

---

## 3. 数据模型（建议先定死，避免后期返工）

### 3.1 OntologySpec（每项目一份）

建议 JSON/YAML（存储到 LightRAG 的 KV storage 或项目配置目录），最小字段：

- `ontology_id`: string（UUID 或短 hash）
- `project_id`: string
- `version`: string（如 `1.0.0` 或日期）
- `language`: `zh-cn`
- `entity_types`: string[]
- `relation_types`: string[]
- `entity_attributes`: dict（按 entity_type 分组，每组列出属性名/类型/是否必填/说明/生成规则）
- `relation_attributes`: dict（按 relation_type 分组）
- `normalization_rules`: 可选（别名/同名归一/黑名单等）

配套示例见：`docs/ontology_spec.example.json`。

### 3.2 ParsedDocument（解析统一输出）

```json
{
  "project_id": "proj_x",
  "ontology_id": "onto_x",
  "source": {
    "file_path": "inputs/xxx.pdf",
    "file_sha256": "...",
    "mime": "application/pdf"
  },
  "markdown": "...",
  "assets": {
    "images": [
      {
        "asset_id": "img_001",
        "path": ".../images/img_001.jpg",
        "page": 3,
        "bbox": [x1,y1,x2,y2],
        "caption": "...",
        "md_ref": "![](... )"
      }
    ],
    "tables": [ ... ],
    "equations": [ ... ]
  },
  "source_map": {
    "md_line_to_page": {"120": 3}
  },
  "metadata": {
    "title": "...",
    "created_at": "..."
  }
}
```

关键点：你要求“需要映射”，因此 `assets[*].page/bbox` 与 `source_map` 必须保留（MinerU 若提供）。

---

## 4. 关系抽取格式升级：加入 relation_type（从 5 段变 6 段）

LightRAG 当前关系输出是：

- `relation{D}source{D}target{D}keywords{D}description`

你确认要加入 `relation_type`，建议升级为：

- `relation{D}source{D}target{D}relation_type{D}keywords{D}description`

其中：
- `relation_type` 必须来自本体 `relation_types` 列表；不在列表内一律输出 `Other`。
- `keywords` 仍允许逗号分隔多个关键词（不允许用 delimiter）。

### 4.1 需要修改的代码点（精确落点）

- Prompt：`lightrag/prompt.py`
  - 更新 system prompt 的 Relationship Output Format（从 5 fields → 6 fields）
  - 更新 continue prompt 的格式说明
  - 更新 examples（确保模型稳定按 6 段输出）
- 解析器：`lightrag/operate.py`
  - `_handle_single_relationship_extraction()`：字段数校验从 `len==5` 改为 `len==6`
  - 新增 `relation_type` 字段写入 `relationship_data`
  - 下游 merge/upsert：确保关系存储允许存 `relation_type`（一般以 properties dict 存储即可）
- 兼容策略（建议）：
  - 提供“兼容解析”模式：若仍收到 5 段输出，则将 `relation_type="Other"` 补齐。

---

## 5. 处理流程（端到端）

### 5.1 文档上传与处理

1. 前端选择项目（project）→ 绑定 `ontology_id`。
2. 上传文件（API 复用 `/documents/upload`，但扩展参数见 6）。
3. 后台 pipeline：
   - parse（MinerU / RAG-Anything）→ 得到 ParsedDocument
   - markdown → chunking
   - 抽取：本体驱动中文 prompt → 三元组（含 relation_type）
   - 写入：KG/向量库/KV cache（复用 LightRAG）
4. 通过 `track_id` 查询每阶段进度与日志。

### 5.2 图谱二次编辑（AI enrich）

- 输入：`entity_name + ontology_id + fields_to_generate(可选)`
- 上下文：
  - 实体当前属性/描述
  - 邻接关系（边的 relation_type/description）
  - 关联 chunks（从 source_id 或向量检索）
- 产出：严格 JSON（只生成本体允许字段）
- 写回：复用 `/graph/entity/edit` 或直接调用 rag 的 entity 更新方法。

---

## 6. API 设计（在现有 API 上“增量式扩展”）

### 6.1 新增：Project 与 Ontology

- `POST /projects`：创建项目（返回 `project_id`，可指定/默认 workspace/working_dir）
- `GET /projects`：项目列表
- `POST /projects/{project_id}/ontology`：创建/更新本体（返回 `ontology_id` + `version`）
- `GET /projects/{project_id}/ontology`：获取当前本体

> 说明：你要求“每个图谱项目一份”，因此 ontology 路由最好挂到 project 下。

### 6.2 扩展：documents

- `POST /documents/upload`：增加可选参数
  - `project_id`
  - `ontology_id`（可从 project 默认继承）
  - `parse_backend`: `mineru|raganything|auto`
  - `mineru_endpoint`: 可选（默认读取环境变量）

### 6.3 新增：enrich

- `POST /graph/entity/enrich`
  - body: `{ project_id, ontology_id, entity_name, fields_to_generate?: [] }`
  - returns: `{status, data: updated_entity, evidence?: references }`

### 6.4 Query

- 复用现有 `/query` 与 `/query/stream`。
- 建议后续扩展：在 QueryRequest 加 `project_id/ontology_id` 以便做项目隔离与回答风格控制。

---

## 7. 前端（WebUI）落地映射

你想要的页面能力，建议尽量复用现有 WebUI 结构，只做最小增量：

1) 文档上传页
- 增加“项目选择/本体选择”下拉
- 上传后展示 track_id 及分阶段进度

2) 图谱浏览页
- 复用现有 label 搜索/图谱拉取
- 点击实体：展示属性 + 关联来源（页码/图片）
- 增加按钮：AI enrich（调用 `/graph/entity/enrich`）

3) KG-RAG 问答页
- 复用现有 query UI
- 增加“当前项目”标识（后续用于 query 参数）

---

## 8. 配置与部署（MinerU 本地 Docker）

建议将 MinerU 服务当成外部依赖，LightRAG 只做 HTTP 调用：

- 环境变量建议：
  - `MINERU_BASE_URL`
  - `MINERU_TIMEOUT_S`
  - `MINERU_OUTPUT_DIR`（可选）

- 解析调用建议设计：
  - 输入：`file_path` 或 `file_bytes`
  - 输出：`markdown + assets(manifest) + mapping(page/bbox)`

### 8.1 项目隔离：workspace

你确认“每个图谱项目一份”，并选择用 `workspace` 做隔离：

- 每次创建/切换项目时，设置 `WORKSPACE=<project_id>`（或项目短名）。
- 对部分外部存储，仓库还支持存储专用 workspace 变量覆盖公共 `WORKSPACE`，例如 Neo4j 用 `NEO4J_WORKSPACE`。

建议策略：
- **统一策略（最简单）**：只用 `WORKSPACE`，让所有存储跟随项目隔离。
- **Neo4j 单独隔离**：若你需要 Neo4j 与其它存储不同步隔离，则使用 `NEO4J_WORKSPACE` 覆盖。

### 8.2 图谱存储：Neo4j（Neo4JStorage）

仓库已内置 Neo4j 图存储实现 `Neo4JStorage`（通过 label 实现逻辑隔离）。你只需要配置启用即可，不必从零实现。

- 配置项：
  - 将 LightRAG 的 `graph_storage` 设置为 `Neo4JStorage`（API Server 环境变量通常是 `LIGHTRAG_GRAPH_STORAGE=Neo4JStorage`）。
  - 设置 Neo4j 连接：`NEO4J_URI`、`NEO4J_USERNAME`、`NEO4J_PASSWORD`。
  - （可选）设置 `NEO4J_WORKSPACE`（否则默认跟随 `WORKSPACE`）。

- 备注：
  - 由于 Neo4j 通过 label 做隔离，**workspace 命名应稳定且可追溯**（建议使用 project_id）。
  - 你后续的“本体版本/Prompt 版本/解析版本”等实验元数据，仍建议写入 doc metadata 与项目配置，以便跨 workspace 对比实验。

---

## 9. 建议的开发顺序（低风险→高价值）

1) Project + OntologySpec（CRUD + 校验 + 每项目绑定）
2) 关系 6 段格式（prompt + parser + 兼容 5 段）
3) MinerU 解析适配器（PDF→ParsedDocument，保留映射）
4) 抽取 prompt 动态注入本体（relation_types + attributes schema）
5) 实体 enrich（按本体生成属性）
6) WebUI 增量对接（项目/本体选择 + enrich 操作）

---

## 10. 你这套研究范式的关键“可重复实验点”

- `OntologySpec.version` + `prompt template version` + `LLM model` + `MinerU version` + `chunking config` 必须写入 doc metadata。
- 每次 pipeline 运行保存：
  - 抽取原始输出（便于误差分析）
  - 解析映射（页码/图片）
  - enrich 前后 diff

这样你的多模态知识图谱研究更可审计、可复现实验。
