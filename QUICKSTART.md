# 本体驱动多模态 KG-RAG 快速验证指南

## 1. 环境准备

### 1.1 安装依赖

```bash
# 进入项目目录
cd /home/frankw/LightRAG

# 同步依赖
uv sync
```

### 1.2 配置环境变量

创建 `.env` 文件：

```bash
cp env.example .env
```

编辑 `.env` 文件，配置 LLM 和 Embedding：

```bash
# 最小配置 - 使用 OpenAI
LLM_BINDING=openai
LLM_MODEL=gpt-4o-mini
LLM_BINDING_API_KEY=your-openai-api-key

EMBEDDING_BINDING=openai
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIM=3072

# 多模态解析（可选）
MULTIMODAL_ENABLED=false  # 如果有 RAGAnything 服务，设为 true
```

## 2. 代码验证

### 2.1 语法检查

```bash
# 检查所有新模块
python3 -m py_compile lightrag/ontology/*.py
python3 -m py_compile lightrag/projects/*.py
python3 -m py_compile lightrag/multimodal/*.py
python3 -m py_compile lightrag/enrichment/*.py
python3 -m py_compile lightrag/api/routers/ontology_routes.py
python3 -m py_compile lightrag/api/routers/project_routes.py
python3 -m py_compile lightrag/api/routers/enrichment_routes.py
```

### 2.2 运行集成测试（不需要 LLM）

```bash
# 运行基础功能测试
python3 tests/test_ontology_integration.py
```

预期输出：
```
============================================================
测试 1: 本体和项目管理
============================================================
[1.1] 初始化存储...
[1.2] 创建项目...
✓ 项目创建成功: proj_xxxxx
  名称: 测试项目
  Workspace: workspace_proj_xxxxx
[1.3] 创建本体...
✓ 本体创建成功: onto_xxxxx
  实体类型: ['人物', '组织', '产品', '技术']
  关系类型: ['拥有', '生产', '竞争', '合作]
...
```

## 3. 启动 API 服务器

### 3.1 启动服务器

```bash
# 方式 1: 使用 lightrag-server 命令
lightrag-server

# 方式 2: 使用 uvicorn
uvicorn lightrag.api.lightrag_server:app --host 0.0.0.0 --port 9621 --reload
```

### 3.2 验证服务器启动

访问：
- Swagger UI: http://localhost:9621/docs
- Health Check: http://localhost:9621/health

## 4. API 功能测试

### 4.1 测试项目管理

```bash
# 创建项目
curl -X POST "http://localhost:9621/projects/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "技术文档库",
    "description": "技术文档知识图谱项目"
  }'
```

预期响应：
```json
{
  "project_id": "proj_xxxxx",
  "name": "技术文档库",
  "description": "技术文档知识图谱项目",
  "ontology_id": null,
  "workspace": "workspace_proj_xxxxx",
  ...
}
```

### 4.2 测试本体管理

```bash
# 创建本体
curl -X POST "http://localhost:9621/ontology/create" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj_xxxxx",
    "name": "技术本体",
    "description": "技术领域本体",
    "language": "zh",
    "entity_types": ["公司", "产品", "技术"],
    "relation_types": ["开发", "拥有", "竞争"],
    "entity_attributes": {
      "公司": {
        "名称": {"type": "string", "description": "公司名称"},
        "行业": {"type": "string", "description": "所属行业"}
      }
    }
  }'
```

### 4.3 测试文档插入（使用本体）

```bash
# 上传文档（会使用本体指导提取）
curl -X POST "http://localhost:9621/documents/upload" \
  -F "file=@test.txt"
```

### 4.4 测试实体丰富

```bash
# 丰富单个实体
curl -X POST "http://localhost:9621/enrichment/entity" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_name": "Apple",
    "ontology_id": "onto_xxxxx"
  }'
```

## 5. Python API 测试

创建测试脚本 `test_api.py`：

```python
import asyncio
from lightrag import LightRAG

async def main():
    # 初始化 LightRAG
    rag = LightRAG(
        working_dir="./rag_storage",
        addon_params={
            "ontology_id": "your_ontology_id",
            "language": "Chinese"
        }
    )
    await rag.initialize_storages()

    # 插入文档（会自动使用本体）
    await rag.ainsert("苹果公司是一家科技公司，开发了 iPhone 产品")

    # 查询
    result = await rag.aquery("苹果公司开发了什么产品？")
    print(result)

    # 实体丰富
    enrich_result = await rag.aenrich_entity(
        entity_name="苹果公司",
        ontology_id="your_ontology_id"
    )
    print(f"丰富状态: {enrich_result['status']}")

    await rag.finalize_storages()

asyncio.run(main())
```

运行测试：
```bash
python3 test_api.py
```

## 6. 验证清单

### 6.1 基础功能
- [ ] 代码编译通过
- [ ] 集成测试通过
- [ ] API 服务器启动成功
- [ ] Swagger UI 可访问

### 6.2 项目管理
- [ ] 创建项目成功
- [ ] 获取项目信息成功
- [ ] 列出项目成功
- [ ] 删除项目成功

### 6.3 本体管理
- [ ] 创建本体成功
- [ ] 获取本体成功
- [ ] 更新本体成功
- [ ] 验证本体成功
- [ ] 关联本体到项目成功

### 6.4 文档处理
- [ ] 文档上传成功
- [ ] 实体提取使用本体定义
- [ ] 关系包含 relation_type 字段

### 6.5 实体丰富（需要 LLM）
- [ ] 单实体丰富成功
- [ ] 批量丰富成功
- [ ] 丰富结果更新到图存储

## 7. 常见问题

### 7.1 导入错误

```bash
ModuleNotFoundError: No module named 'lightrag.ontology'
```

**解决**: 确保在项目根目录运行，并运行 `uv sync`

### 7.2 API 服务器启动失败

```bash
AttributeError: __aenter__
```

**解决**: 确保调用 `await rag.initialize_storages()`

### 7.3 LLM 调用失败

```bash
Failed to connect to LLM service
```

**解决**: 检查 `.env` 文件中的 LLM 配置和 API Key

### 7.4 RAGAnything 连接失败

```bash
Failed to connect to RAGAnything service
```

**解决**:
1. 检查 RAGAnything 服务是否运行: `curl http://127.0.0.1:30000/health`
2. 或设置 `MULTIMODAL_ENABLED=false` 禁用多模态解析

## 8. 日志查看

查看详细日志：

```bash
# 启动时设置日志级别
LOG_LEVEL=DEBUG lightrag-server
```

日志文件位置：
- 默认: `./logs/lightrag.log`
- 可通过 `LOG_FILE_PATH` 环境变量配置
