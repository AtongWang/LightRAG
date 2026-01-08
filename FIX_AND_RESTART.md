# 🔧 修复说明和重启指南

## ⚠️ 问题诊断

测试失败的原因是：**API 服务器还在运行旧代码**

## ✅ 已修复的问题

### 1. 本体创建 API
- **问题**: `ontology_service.create()` 参数不匹配
- **修复**: 改为创建 `OntologySpec` 对象后再调用 `create()`
- **文件**: `lightrag/api/routers/ontology_routes.py:105-128`

### 2. 本体更新 API
- **问题**: `update()` 方法缺少 `project_id` 参数
- **修复**: 添加 `project_id` 参数和 `updated_at` 更新
- **文件**: `lightrag/api/routers/ontology_routes.py:187-198`

---

## 🚀 重启服务器

### 步骤 1: 停止旧服务器

```bash
# 查找服务器进程
ps aux | grep lightrag-server

# 停止进程（使用上一步找到的 PID）
kill <PID>

# 或者使用 pkill
pkill -f lightrag-server
```

### 步骤 2: 重新启动服务器

```bash
# 方式 1: 使用命令
lightrag-server

# 方式 2: 使用 uvicorn（推荐开发时使用）
uvicorn lightrag.api.lightrag_server:app --host 0.0.0.0 --port 9621 --reload
```

### 步骤 3: 验证服务器已启动

```bash
# 检查健康状态
curl http://localhost:9621/health

# 应该返回类似：
# {"status": "healthy"}
```

---

## 🧪 运行测试

### 方法 1: 自动测试（推荐）

```bash
python3 test_api_endpoints.py
```

预期输出：
```
✓ 服务器运行正常
✓ 项目创建成功: proj_xxxxx
✓ 获取项目成功
✓ 本体创建成功: onto_xxxxx
✓ 获取本体成功
✓ 本体验证成功
✓ 所有 API 端点已注册
```

### 方法 2: 手动测试

```bash
# 1. 测试创建项目
curl -X POST "http://localhost:9621/projects/create" \
  -H "Content-Type: application/json" \
  -d '{"name": "测试项目", "description": "API 测试"}'

# 2. 测试创建本体（使用上面返回的 project_id）
curl -X POST "http://localhost:9621/ontology/create" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj_xxxxx",
    "name": "测试本体",
    "description": "API 测试",
    "language": "zh",
    "entity_types": ["公司", "产品", "Other"],
    "relation_types": ["开发", "拥有", "Other"]
  }'

# 3. 访问 Swagger UI
# http://localhost:9621/docs
```

---

## 🔍 故障排除

### 问题 1: 测试仍然失败

**错误**: `HTTP 500: Internal Server Error`

**解决**:
1. 确认服务器已完全停止：`ps aux | grep lightrag`
2. 确认没有其他进程占用端口 9621：`lsof -i :9621`
3. 重新启动服务器

### 问题 2: 端口被占用

**错误**: `Address already in use`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :9621

# 停止进程
kill -9 <PID>
```

### 问题 3: 本体创建失败

**错误**: `项目 xxx 已有本体`

**解决**:
- 每个 project_id 只能有一个本体
- 使用不同的 project_id，或先删除现有本体

---

## ✅ 验证清单

- [x] API 路由代码已修复
- [x] 代码语法检查通过
- [ ] 服务器已重启（**需要手动操作**）
- [ ] 所有 API 测试通过（重启后）

---

## 📝 快速重启命令

```bash
# 一键重启脚本
pkill -f lightrag-server && sleep 2 && lightrag-server
```

或者分步执行：
```bash
# 1. 停止
pkill -f lightrag-server

# 2. 启动
lightrag-server

# 3. 测试（新终端）
python3 test_api_endpoints.py
```

---

## 🎯 重启后验证

1. **访问 Swagger UI**
   ```
   http://localhost:9621/docs
   ```

2. **查看新标签**
   - ontology（本体管理）
   - projects（项目管理）
   - enrichment（实体丰富）

3. **运行测试**
   ```bash
   python3 test_api_endpoints.py
   ```

---

## 📊 修复总结

| 文件 | 修改内容 | 状态 |
|------|---------|------|
| `ontology_routes.py` | 修复 create_ontology 参数 | ✅ 已修复 |
| `ontology_routes.py` | 修复 update_ontology 参数 | ✅ 已修复 |
| `projects/service.py` | 修复 Project.get 字段过滤 | ✅ 已修复 |
| 服务器 | 需要重启加载新代码 | ⚠️ 待操作 |

**下一步**: 重启服务器即可使用所有新功能！
