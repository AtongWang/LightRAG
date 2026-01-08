# 本体驱动多模态 KG-RAG - 简单使用指南

## ✅ 验证通过！

所有基础功能已验证通过，代码可以正常运行。

---

## 🚀 快速开始（3 步）

### 1. 验证安装（不需要 LLM）

```bash
# 运行基础测试
python3 test_basic_functionality.py
```

预期输出：
```
通过: 4/4
✓ 所有测试通过！
```

### 2. 配置 LLM（可选，用于完整功能）

```bash
# 复制环境变量模板
cp env.example .env

# 编辑 .env，最少配置：
```

在 `.env` 中添加：
```bash
LLM_BINDING=openai
LLM_MODEL=gpt-4o-mini
LLM_BINDING_API_KEY=sk-your-openai-key

EMBEDDING_BINDING=openai
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIM=3072
```

### 3. 启动 API 服务器

```bash
# 启动服务器
lightrag-server

# 或者
uvicorn lightrag.api.lightrag_server:app --host 0.0.0.0 --port 9621 --reload
```

访问：**http://localhost:9621/docs**

---

## 📝 Python API 使用示例

### 基础使用（不需要本体）

```python
from lightrag import LightRAG

# 初始化
rag = LightRAG(
    working_dir="./rag_storage",
)
await rag.initialize_storages()

# 插入文档
await rag.ainsert("苹果公司开发了 iPhone 产品")

# 查询
result = await rag.aquery("苹果公司开发了什么？")
print(result)
```

### 使用本体驱动（推荐）

```python
from lightrag import LightRAG
from lightrag.ontology import OntologyService, OntologySpec
from lightrag.projects import ProjectManager
from datetime import datetime

# 初始化
rag = LightRAG(
    working_dir="./rag_storage",
    addon_params={
        "ontology_id": "tech_ontology",  # 指定本体
        "language": "Chinese"
    }
)
await rag.initialize_storages()

# 1. 创建项目
project_manager = ProjectManager(rag.llm_response_cache)
project = await project_manager.create(
    name="技术文档库",
    description="技术知识图谱"
)

# 2. 创建本体
ontology_service = OntologyService(rag.llm_response_cache)
ontology = OntologySpec(
    ontology_id="tech_ontology",
    project_id=project.project_id,
    version="1.0",
    language="zh",
    entity_types=["公司", "产品", "技术", "Other"],
    relation_types=["开发", "拥有", "竞争", "Other"],
    entity_attributes={},
    relation_attributes={},
    created_at=datetime.utcnow().isoformat(),
    updated_at=datetime.utcnow().isoformat(),
)
ontology = await ontology_service.create(ontology)

# 3. 关联本体到项目
await project_manager.set_ontology_id(project.project_id, ontology.ontology_id)

# 4. 插入文档（会自动使用本体指导提取）
await rag.ainsert("苹果公司开发了 iPhone，与三星竞争")

# 5. 查询
result = await rag.aquery("有哪些公司？")
print(result)

# 6. 实体丰富
enrich_result = await rag.aenrich_entity(
    entity_name="苹果公司",
    ontology_id="tech_ontology"
)
print(f"丰富状态: {enrich_result['status']}")

# 清理
await rag.finalize_storages()
```

---

## 🌐 API 端点（启动服务器后）

### 项目管理
- `POST /projects/create` - 创建项目
- `GET /projects/` - 列出所有项目
- `GET /projects/{project_id}` - 获取项目信息
- `DELETE /projects/{project_id}` - 删除项目

### 本体管理
- `POST /ontology/create` - 创建本体
- `GET /ontology/{ontology_id}` - 获取本体
- `PUT /ontology/{ontology_id}` - 更新本体
- `DELETE /ontology/{ontology_id}` - 删除本体
- `GET /ontology/project/{project_id}` - 获取项目的本体
- `GET /ontology/{ontology_id}/validate` - 验证本体

### 实体丰富
- `POST /enrichment/entity` - 丰富单个实体
- `POST /enrichment/entities` - 批量丰富实体
- `POST /enrichment/entity/background` - 后台丰富
- `POST /enrichment/entities/background` - 后台批量丰富

### 文档管理（原有功能）
- `POST /documents/upload` - 上传文档
- `GET /documents/` - 列出文档
- `DELETE /documents/{doc_id}` - 删除文档

---

## 📊 验证清单

### ✅ 已完成
- [x] 代码编译通过
- [x] 基础功能测试通过（4/4）
- [x] 项目管理功能正常
- [x] 本体管理功能正常
- [x] 多模态解析器工作正常
- [x] Prompt 注入功能正常
- [x] 关系格式升级（6 字段）
- [x] API 路由注册成功

### 🎯 下一步推荐
1. **配置 LLM** - 完整功能需要配置 OpenAI 或其他 LLM
2. **测试 API** - 启动服务器后测试新端点
3. **创建本体** - 为你的领域定义本体规范
4. **插入文档** - 使用本体指导的知识提取
5. **实体丰富** - 丰富提取的实体属性

---

## 🔧 常见问题

### Q: 如何跳过 LLM 配置？
A: 运行 `python3 test_basic_functionality.py` 只验证基础功能，不需要 LLM

### Q: API 服务器启动失败？
A: 确保配置了 `LLM_BINDING` 和 `LLM_BINDING_API_KEY`

### Q: 本体验证失败？
A: 确保 `entity_types` 和 `relation_types` 都包含 `"Other"` 类型

### Q: 如何查看日志？
A: 设置 `LOG_LEVEL=DEBUG lightrag-server`

---

## 📚 更多文档

- **架构设计**: `docs/Ontology-Driven-Architecture-v2.md`
- **开发计划**: `docs/Development-Plan.md`
- **快速验证**: `QUICKSTART.md`
- **开发总结**: `DEVELOPMENT_SUMMARY.md`
- **验证脚本**: `test_basic_functionality.py`

---

## 🎉 开始使用

```bash
# 1. 验证功能
python3 test_basic_functionality.py

# 2. 配置 LLM（可选）
cp env.example .env
# 编辑 .env 添加 API Key

# 3. 启动服务器
lightrag-server

# 4. 访问 API 文档
# http://localhost:9621/docs
```

**祝使用愉快！** 🚀
