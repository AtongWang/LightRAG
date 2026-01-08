# 📋 任务追踪清单

## 🗓️ 总览

**项目周期**：15周（105天）
**开始日期**：2025-01-08
**预计结束**：2025-04-22
**当前进度**：Phase 1 准备中

---

## 📊 进度仪表盘

```
总体进度: ████░░░░░░ 5%

Phase 1: 基础架构     ⏸️ 0%   [Week 1-2]
Phase 2: 核心业务     ⏸️ 0%   [Week 3-6]
Phase 3: 图谱表格     ⏸️ 0%   [Week 7-10]
Phase 4: 高级功能     ⏸️ 0%   [Week 11-13]
Phase 5: 优化发布     ⏸️ 0%   [Week 14-15]
```

---

## 🟦 Agent 1: 基础架构师

### Phase 1 任务

#### 1.1 项目初始化
- [ ] 创建新分支：`feature/meme-library-frontend`
- [ ] 复制lightrag_webui到新项目
- [ ] 清理现有代码
- [ ] 更新package.json
- [ ] 配置Vite
- [ ] 配置ESLint + Prettier
- [ ] 配置Tailwind CSS
- [ ] 创建目录结构
- [ ] 更新.env配置
**状态**：⏸️ Pending
**预计**：2天
**优先级**：P0

#### 1.2 路由系统配置
- [ ] 安装react-router-dom
- [ ] 创建AppRouter组件
- [ ] 配置路由表
- [ ] 创建MainLayout路由
- [ ] 创建ProjectLayout路由
- [ ] 配置嵌套路由
- [ ] 添加404页面
- [ ] 测试路由导航
**状态**：⏸️ Pending
**依赖**：1.1
**预计**：2天
**优先级**：P0

#### 1.4 Zustand Store设计
- [ ] 创建stores目录
- [ ] 实现ProjectStore
- [ ] 实现OntologyStore
- [ ] 实现GraphStore
- [ ] 实现UIStore
- [ ] 创建store组合器
- [ ] 添加开发工具
- [ ] 编写单元测试
**状态**：⏸️ Pending
**依赖**：1.1
**预计**：3天
**优先级**：P0

#### 1.5 API客户端封装
- [ ] 扩展api/lightrag.ts
- [ ] 实现projectApi
- [ ] 实现ontologyApi
- [ ] 实现enrichmentApi
- [ ] 实现graphApi
- [ ] 添加错误处理
- [ ] 添加请求拦截器
- [ ] 添加响应拦截器
**状态**：⏸️ Pending
**依赖**：1.1
**预计**：2天
**优先级**：P0

#### 1.7 TypeScript类型定义
- [ ] 创建types/project.ts
- [ ] 创建types/ontology.ts
- [ ] 创建types/entity.ts
- [ ] 创建types/graph.ts
- [ ] 创建types/enrichment.ts
- [ ] 创建types/index.ts
- [ ] 添加JSDoc注释
**状态**：⏸️ Pending
**依赖**：1.1
**预计**：2天
**优先级**：P0

#### 1.8 开发环境配置
- [ ] 配置VS Code settings
- [ ] 配置推荐扩展
- [ ] 配置Git hooks
- [ ] 配置CI/CD
- [ ] 创建.env.example
- [ ] 编写README
**状态**：⏸️ Pending
**依赖**：-
**预计**：1天
**优先级**：P0

---

## 🟩 Agent 2: UI组件开发者

### Phase 1 任务

#### 1.3 布局组件开发
- [ ] 创建MainLayout组件
- [ ] 创建ProjectLayout组件
- [ ] 创建TopNavigation组件
- [ ] 创建ProjectTabs组件
- [ ] 创建BottomNavigation组件（移动端）
- [ ] 创建ProjectBreadcrumb组件
- [ ] 响应式布局测试
- [ ] 无障碍测试
**状态**：⏸️ Pending
**依赖**：1.1
**预计**：3天
**优先级**：P0

#### 1.6 主题系统实现
- [ ] 定义颜色变量
- [ ] 配置亮色主题
- [ ] 配置暗色主题
- [ ] 创建ThemeProvider
- [ ] 实现主题切换Hook
- [ ] 测试主题切换
- [ ] 创建主题预览
**状态**：⏸️ Pending
**依赖**：1.3
**预计**：2天
**优先级**：P1

#### 通用UI组件库（持续）
- [ ] Button组件
- [ ] Input组件
- [ ] Select组件
- [ ] Dialog组件
- [ ] Table组件
- [ ] Card组件
- [ ] Badge组件
- [ ] Tabs组件
**状态**：⏸️ Pending
**依赖**：1.3
**预计**：持续进行
**优先级**：P0

---

## 🟨 Agent 3: 业务模块开发者A

### Phase 2 任务准备

等待Phase 1基础架构完成后开始...

**即将开始**：
- [ ] 2.1 项目列表页面
- [ ] 2.2 项目卡片组件
- [ ] 2.3 创建项目对话框
- [ ] 2.5 本体编辑器
- [ ] 2.10 文档上传界面

---

## 🟧 Agent 4: 业务模块开发者B

### Phase 3 任务准备

等待Phase 2核心业务完成后开始...

**即将开始**：
- [ ] 3.1 扩展GraphViewer
- [ ] 3.2 图片节点渲染器
- [ ] 3.3 节点属性面板
- [ ] 3.7 数据表格组件

---

## 🟪 Agent 5: 高级功能开发者

### Phase 4 任务准备

等待Phase 3可视化完成后开始...

**即将开始**：
- [ ] 4.1 属性编辑对话框
- [ ] 4.2 LLM生成面板
- [ ] 4.3 提示词模板系统
- [ ] 4.7 扩展现有Chat组件

---

## 🔄 每周任务分配

### Week 1 (2025-01-08 ~ 2025-01-14)

**目标**：完成项目初始化和基础配置

| Agent | 任务 | 工作量 | 状态 |
|-------|------|--------|------|
| 🟦 | 1.1 项目初始化 | 2天 | ⏸️ |
| 🟦 | 1.2 路由系统配置 | 2天 | ⏸️ |
| 🟩 | 1.3 布局组件开发（开始） | 3天 | ⏸️ |
| 🟨 | 等待基础架构 | - | ⏸️ |
| 🟧 | 等待基础架构 | - | ⏸️ |
| 🟪 | 研究LLM/VLLM API | - | ⏸️ |

**本周重点**：
- ✅ 搭建项目骨架
- ✅ 配置开发环境
- ✅ 实现路由系统

---

### Week 2 (2025-01-15 ~ 2025-01-21)

**目标**：完成状态管理和API集成

| Agent | 任务 | 工作量 | 状态 |
|-------|------|--------|------|
| 🟦 | 1.4 Zustand Store设计 | 3天 | ⏸️ |
| 🟦 | 1.5 API客户端封装 | 2天 | ⏸️ |
| 🟦 | 1.7 TypeScript类型定义 | 2天 | ⏸️ |
| 🟩 | 1.3 布局组件开发（完成） | - | ⏸️ |
| 🟩 | 1.6 主题系统实现 | 2天 | ⏸️ |
| 🟨 | 开始2.1项目列表页面（准备） | - | ⏸️ |

**本周重点**：
- ✅ 完成状态管理
- ✅ 完成API集成
- ✅ 完成主题系统
- 🎉 **里程碑M1：基础框架完成**

---

## 🚀 启动指令

### 立即开始的任务

#### 🟦 Agent 1 - 开始任务1.1
```bash
# 1. 创建开发分支
git checkout -b feature/meme-library-frontend

# 2. 复制项目
cp -r lightrag_webui meme_library_frontend
cd meme_library_frontend

# 3. 更新package.json
# 修改名称、描述等

# 4. 清理不需要的文件
# 保留核心代码，删除业务特定代码

# 5. 创建目录结构
mkdir -p src/{features/{projects,ontology,graph,table,documents,attributes,chat}}
```

#### 🟦 Agent 2 - 准备布局组件
```bash
# 等待Agent 1完成项目初始化
# 然后开始开发布局组件

# 参考文档：docs/Frontend-Design-Spec.md
# 组件位置：src/components/layout/
```

#### 🟨 Agent 3 - 研究现有代码
```bash
# 研究现有的DocumentManager组件
# 理解API调用方式
# 准备项目管理模块的设计
```

#### 🟧 Agent 4 - 研究图谱可视化
```bash
# 研究现有的GraphViewer组件
# 理解Sigma.js的使用
# 研究图片节点渲染方案
```

#### 🟪 Agent 5 - 研究LLM/VLLM
```bash
# 研究enrichment API
# 了解LLM和VLLM的区别
# 设计属性生成界面
```

---

## 📝 每日更新模板

### 日报格式

```markdown
## 日期：YYYY-MM-DD
### Agent: [名字]

#### 今日完成
- [x] 任务1.1.1 - 创建项目结构
- [x] 任务1.1.2 - 配置Vite

#### 明日计划
- [ ] 任务1.1.3 - 配置Tailwind
- [ ] 任务1.1.4 - 配置ESLint

#### 遇到的问题
- 问题描述：...
- 解决方案：...
- 是否阻塞：是/否

#### 代码提交
- Commit: xxx
- PR: xxx
```

---

## 🎯 下一周预告（Week 3）

**Phase 2启动**：
- 🟨 开始项目列表页面开发
- 🟨 开始本体编辑器开发
- 🟦 提供API支持
- 🟩 提供UI组件支持

---

**更新时间**：2025-01-08
**更新人**：Claude Code
**下次更新**：每日站会后
