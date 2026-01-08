# 本体驱动多模态 KG-RAG - 新增 API 端点清单

## ✅ 所有新增 API 已成功注册！

服务器启动后访问：**http://localhost:9621/docs**

---

## 📋 新增 API 端点总览

### 1️⃣ 本体管理 API (`/ontology`)

| 方法 | 端点 | 描述 |
|------|------|------|
| **POST** | `/ontology/create` | 创建新本体 |
| **GET** | `/ontology/{ontology_id}` | 获取本体详情 |
| **PUT** | `/ontology/{ontology_id}` | 更新本体 |
| **DELETE** | `/ontology/{ontology_id}` | 删除本体 |
| **GET** | `/ontology/project/{project_id}` | 获取项目的本体 |
| **GET** | `/ontology/{ontology_id}/validate` | 验证本体的完整性 |

#### 请求示例

**创建本体：**
```bash
curl -X POST "http://localhost:9621/ontology/create" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj_abc123",
    "name": "技术本体",
    "description": "技术领域知识图谱本体",
    "language": "zh",
    "entity_types": ["公司", "产品", "技术", "Other"],
    "relation_types": ["开发", "拥有", "竞争", "Other"],
    "entity_attributes": {
      "公司": {
        "名称": {"type": "string", "description": "公司名称"},
        "行业": {"type": "string", "description": "所属行业"}
      }
    }
  }'
```

---

### 2️⃣ 项目管理 API (`/projects`)

| 方法 | 端点 | 描述 |
|------|------|------|
| **POST** | `/projects/create` | 创建新项目 |
| **GET** | `/projects/{project_id}` | 获取项目详情 |
| **GET** | `/projects/` | 列出所有项目 |
| **PUT** | `/projects/{project_id}` | 更新项目信息 |
| **DELETE** | `/projects/{project_id}` | 删除项目 |
| **POST** | `/projects/{project_id}/set-ontology` | 为项目设置本体 |

#### 请求示例

**创建项目：**
```bash
curl -X POST "http://localhost:9621/projects/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "技术文档库",
    "description": "技术文档知识图谱项目"
  }'
```

**设置项目本体：**
```bash
curl -X POST "http://localhost:9621/projects/proj_abc123/set-ontology" \
  -H "Content-Type: application/json" \
  -d '"onto_xyz789"'
```

---

### 3️⃣ 实体丰富 API (`/enrichment`)

| 方法 | 端点 | 描述 |
|------|------|------|
| **POST** | `/enrichment/entity` | 丰富单个实体（同步） |
| **POST** | `/enrichment/entities` | 批量丰富实体（同步） |
| **POST** | `/enrichment/entity/background` | 后台丰富单个实体 |
| **POST** | `/enrichment/entities/background` | 后台批量丰富实体 |

#### 请求示例

**丰富单个实体：**
```bash
curl -X POST "http://localhost:9621/enrichment/entity" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_name": "苹果公司",
    "ontology_id": "onto_xyz789"
  }'
```

**批量丰富实体：**
```bash
curl -X POST "http://localhost:9621/enrichment/entities" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_names": ["苹果公司", "三星", "华为"],
    "ontology_id": "onto_xyz789"
  }'
```

---

## 🔍 验证 API 端点

### 方法 1: 通过 Swagger UI（推荐）

1. 启动服务器：
   ```bash
   lightrag-server
   ```

2. 打开浏览器访问：
   ```
   http://localhost:9621/docs
   ```

3. 查找新的标签：
   - **ontology** - 本体管理
   - **projects** - 项目管理
   - **enrichment** - 实体丰富

### 方法 2: 通过命令行测试

```bash
# 测试服务器是否运行
curl http://localhost:9621/health

# 测试创建项目
curl -X POST "http://localhost:9621/projects/create" \
  -H "Content-Type: application/json" \
  -d '{"name": "测试项目", "description": "测试"}'

# 测试列出项目
curl http://localhost:9621/projects/
```

### 方法 3: 检查 OpenAPI 规范

```bash
# 获取完整 API 规范
curl http://localhost:9621/openapi.json | jq '.paths | keys'
```

---

## 📊 API 端点统计

| 分类 | 端点数量 | 说明 |
|------|---------|------|
| **本体管理** | 6 个 | CRUD + 验证 |
| **项目管理** | 6 个 | CRUD + 关联本体 |
| **实体丰富** | 4 个 | 单个/批量 + 同步/异步 |
| **新增总计** | **16 个** | 全部已注册 ✅ |

---

## 🔗 完整 API 列表（包含原有功能）

### 原有端点（保持不变）
- `/documents` - 文档管理
- `/query` - 查询接口
- `/graph` - 图谱操作
- `/api/ollama` - Ollama 兼容接口

### 新增端点（本次开发）
- `/ontology` - 本体管理 ✨
- `/projects` - 项目管理 ✨
- `/enrichment` - 实体丰富 ✨

---

## ✅ 验证清单

- [x] 本体管理 API 已注册
- [x] 项目管理 API 已注册
- [x] 实体丰富 API 已注册
- [x] 所有路由使用统一认证
- [x] Swagger UI 文档生成
- [x] OpenAPI 规范包含新端点

---

## 🎯 快速测试命令

```bash
# 1. 启动服务器（需要配置 .env）
lightrag-server

# 2. 在另一个终端测试 API
# 创建项目
curl -X POST "http://localhost:9621/projects/create" \
  -H "Content-Type: application/json" \
  -d '{"name": "测试", "description": "测试"}'

# 3. 访问 Swagger UI 查看所有 API
# http://localhost:9621/docs
```

---

## 📝 响应格式示例

### 项目创建响应
```json
{
  "project_id": "proj_abc123",
  "name": "技术文档库",
  "description": "技术文档知识图谱项目",
  "ontology_id": null,
  "workspace": "workspace_proj_abc123",
  "created_at": "2024-01-08T12:00:00",
  "updated_at": "2024-01-08T12:00:00",
  "status": "active"
}
```

### 本体创建响应
```json
{
  "ontology_id": "onto_xyz789",
  "project_id": "proj_abc123",
  "version": "1.0",
  "language": "zh",
  "name": "技术本体",
  "description": "技术领域本体",
  "entity_types": ["公司", "产品", "技术", "Other"],
  "relation_types": ["开发", "拥有", "竞争", "Other"],
  "entity_attributes": {},
  "relation_attributes": {},
  "normalization_rules": null,
  "created_at": "2024-01-08T12:00:00",
  "updated_at": "2024-01-08T12:00:00"
}
```

### 实体丰富响应
```json
{
  "entity_name": "苹果公司",
  "status": "completed",
  "original_data": {...},
  "enriched_data": {
    "description": "苹果公司是一家总部位于美国的跨国科技公司...",
    "attributes": {
      "行业": "科技",
      "总部": "美国加利福尼亚州库比蒂诺"
    }
  },
  "error_message": null,
  "processing_time": 2.5
}
```

---

## 🎉 所有 API 已就绪！

**16 个新增 API 端点全部注册成功！**

访问 http://localhost:9621/docs 查看 Swagger UI 文档。
