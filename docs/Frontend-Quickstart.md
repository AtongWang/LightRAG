# 🚀 文化基因库前端 - 快速启动指南

## 📋 目录

1. [系统概述](#系统概述)
2. [快速开始](#快速开始)
3. [功能导航](#功能导航)
4. [组件使用](#组件使用)
5. [API集成](#api集成)
6. [常见问题](#常见问题)

---

## 系统概述

### 核心功能

文化基因库是一个基于本体驱动的多模态知识图谱管理系统，提供以下核心功能：

1. **项目管理** - 创建和管理多个文化主题项目
2. **本体管理** - 定义和管理知识图谱的本体结构
3. **文档管理** - 上传和解析多模态文档
4. **图谱可视化** - 交互式知识图谱展示
5. **表格视图** - 以表格形式浏览实体和关系
6. **智能问答** - 基于知识图谱的AI对话
7. **属性丰富** - 使用LLM/VLLM自动丰富实体属性

### 技术架构

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer (React)                   │
├─────────────────────────────────────────────────────┤
│  Projects  │  Ontology  │  Documents  │  Graph      │
├─────────────────────────────────────────────────────┤
│              State Management (Zustand)              │
├─────────────────────────────────────────────────────┤
│                 API Client (Axios)                   │
├─────────────────────────────────────────────────────┤
│              Backend API (FastAPI)                   │
└─────────────────────────────────────────────────────┘
```

---

## 快速开始

### 1. 安装依赖

```bash
cd lightrag_webui
bun install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:9621
VITE_APP_TITLE=文化基因库
VITE_APP_VERSION=1.0.0
```

### 3. 启动开发服务器

```bash
bun run dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
bun run build
```

---

## 功能导航

### 项目列表页面

**路由**: `/` 或 `/projects`

**功能**:
- 查看所有项目
- 创建新项目
- 搜索和筛选
- 网格/列表视图切换

**使用示例**:
```typescript
// 访问项目列表
navigate('/')

// 创建新项目
openDialog('createProject')
```

### 项目详情页面

**路由**: `/projects/:projectId`

**子页面**:
- `/documents` - 文档管理
- `/ontology` - 本体管理
- `/graph` - 图谱可视化
- `/table` - 表格视图
- `/chat` - 智能问答

---

## 组件使用

### 1. 项目管理组件

#### ProjectsList

```typescript
import { ProjectsList } from '@/features/projects'

<ProjectsList />
```

#### ProjectCard

```typescript
import { ProjectCard } from '@/features/projects'

<ProjectCard
  project={projectData}
  onClick={handleClick}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

#### CreateProjectDialog

```typescript
import { CreateProjectDialog } from '@/features/projects'

<CreateProjectDialog
  open={isOpen}
  onClose={handleClose}
  onSuccess={handleSuccess}
/>
```

### 2. 本体管理组件

#### OntologyEditor

```typescript
import { OntologyEditor } from '@/features/ontology'

<OntologyEditor
  projectId={projectId}
  ontologyId={ontologyId}
/>
```

#### EntityTypeList

```typescript
import { EntityTypeList } from '@/features/ontology'

<EntityTypeList
  entityTypes={types}
  onAdd={handleAdd}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

### 3. 文档管理组件

#### DocumentUploader

```typescript
import { DocumentUploader } from '@/features/documents'

<DocumentUploader />
```

#### FileList

```typescript
import { FileList } from '@/features/documents'

<FileList />
```

### 4. 图谱可视化组件

#### GraphControlPanel

```typescript
import { GraphControlPanel } from '@/components/graph'

<GraphControlPanel
  settings={settings}
  onSettingsChange={handleChange}
  onRefresh={handleRefresh}
  onExport={handleExport}
/>
```

#### GraphStatsPanel

```typescript
import { GraphStatsPanel } from '@/components/graph'

<GraphStatsPanel
  stats={{
    nodeCount: 150,
    edgeCount: 320,
    avgDegree: 4.27,
    density: 0.014
  }}
/>
```

### 5. UI组件

#### Card

```typescript
import { Card } from '@/components/ui/Card'

<Card variant="elevated" hoverable>
  <CardHeader>标题</CardHeader>
  <CardContent>内容</CardContent>
</Card>
```

#### Badge

```typescript
import { Badge } from '@/components/ui/Badge'

<Badge color="person" size="lg">人物</Badge>
```

#### Loading

```typescript
import { Loading } from '@/components/ui/Loading'

<Loading size="lg" text="加载中..." fullScreen />
```

---

## API集成

### 项目API

```typescript
import { projectApi } from '@/api/meme-lab'

// 获取所有项目
const projects = await projectApi.list()

// 创建项目
const newProject = await projectApi.create({
  name: '新项目',
  description: '项目描述'
})

// 更新项目
await projectApi.update(projectId, {
  name: '更新后的名称'
})

// 删除项目
await projectApi.delete(projectId)
```

### 本体API

```typescript
import { ontologyApi } from '@/api/meme-lab'

// 获取项目本体
const ontology = await ontologyApi.getByProject(projectId)

// 创建本体
const newOntology = await ontologyApi.create({
  name: '新本体',
  project_id: projectId
})

// 更新本体
await ontologyApi.update(ontologyId, {
  entity_types: ['Person', 'Location']
})

// 验证本体
const validation = await ontologyApi.validate(ontologyId)
```

### 文档API

```typescript
// 上传文档
const formData = new FormData()
formData.append('file', file)
await api.post(`/projects/${projectId}/documents`, formData)

// 获取文档列表
const documents = await api.get(`/projects/${projectId}/documents`)

// 删除文档
await api.delete(`/documents/${documentId}`)
```

### 丰富API

```typescript
import { enrichmentApi } from '@/api/enrichment'

// 丰富单个实体
const result = await enrichmentApi.enrichEntity({
  entity_name: '孔子',
  ontology_id: ontologyId,
  prompt: '生成详细的生平介绍'
})

// 批量丰富
const results = await enrichmentApi.enrichEntities(
  ['孔子', '孟子'],
  ontologyId
)
```

---

## 状态管理

### 使用ProjectStore

```typescript
import { useProjectStore } from '@/stores/project'

function MyComponent() {
  const {
    projects,
    currentProject,
    loading,
    fetchProjects,
    createProject,
    setCurrentProject
  } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [])

  return <div>{/* ... */}</div>
}
```

### 使用OntologyStore

```typescript
import { useOntologyStore } from '@/stores/ontology'

function MyComponent() {
  const {
    currentOntology,
    getProjectOntology,
    updateOntology
  } = useOntologyStore()

  useEffect(() => {
    if (projectId) {
      getProjectOntology(projectId)
    }
  }, [projectId])

  return <div>{/* ... */}</div>
}
```

### 使用UIStore

```typescript
import { useUIStore } from '@/stores/ui'

function MyComponent() {
  const {
    theme,
    openDialog,
    closeDialog,
    showToast
  } = useUIStore()

  const handleOpen = () => {
    openDialog('createProject')
  }

  const handleSuccess = () => {
    showToast('success', '操作成功')
    closeDialog()
  }

  return <div>{/* ... */}</div>
}
```

---

## 常见问题

### Q1: 如何切换主题？

```typescript
import { useUIStore } from '@/stores/ui'

function ThemeToggle() {
  const { theme, setTheme } = useUIStore()

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      切换主题
    </button>
  )
}
```

### Q2: 如何处理错误？

```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### Q3: 如何显示加载状态？

```typescript
import { Loading } from '@/components/ui/Loading'

{loading ? (
  <Loading text="加载中..." />
) : (
  <div>内容</div>
)}
```

### Q4: 如何使用对话框？

```typescript
import { useUIStore } from '@/stores/ui'

function MyComponent() {
  const { openDialog } = useUIStore()

  return (
    <button onClick={() => openDialog('createProject')}>
      创建项目
    </button>
  )
}
```

### Q5: 如何显示通知？

```typescript
import { useUIStore } from '@/stores/ui'

function MyComponent() {
  const { showToast } = useUIStore()

  const handleSuccess = () => {
    showToast('success', '操作成功')
  }

  const handleError = () => {
    showToast('error', '操作失败')
  }

  return <div>{/* ... */}</div>
}
```

---

## 开发技巧

### 1. 使用Mock数据开发

所有Store都包含Mock数据，可以在没有后端的情况下开发：

```typescript
// stores/project.ts
const useProjectStore = create<ProjectStore>((set) => ({
  projects: mockProjects, // 使用Mock数据
  // ...
}))
```

### 2. 类型安全

所有API调用都有完整的类型定义：

```typescript
const project: Project = await projectApi.get(projectId)
// project自动获得Project类型
```

### 3. 错误处理

统一的错误处理：

```typescript
try {
  await apiCall()
} catch (error) {
  if (axios.isAxiosError(error)) {
    showToast('error', error.response?.data?.message || '请求失败')
  }
}
```

### 4. 加载状态

统一的加载状态管理：

```typescript
const { loading, fetchProjects } = useProjectStore()

useEffect(() => {
  fetchProjects() // 自动设置loading状态
}, [])
```

---

## 调试技巧

### 1. 查看当前状态

```typescript
// 在控制台查看Store状态
console.log(useProjectStore.getState())
```

### 2. React DevTools

安装React DevTools浏览器扩展，查看组件树和状态。

### 3. Network Tab

使用浏览器开发工具的Network标签查看API请求。

### 4. Console Logging

```typescript
console.log('Projects:', projects)
console.log('Current Project:', currentProject)
```

---

## 部署

### 构建生产版本

```bash
bun run build
```

### 预览生产版本

```bash
bun run preview
```

### 环境变量

确保设置正确的环境变量：

```env
VITE_API_BASE_URL=https://api.example.com
VITE_APP_TITLE=文化基因库
```

---

## 更多资源

- **设计文档**: `docs/Frontend-Design-Spec.md`
- **开发计划**: `docs/Frontend-Development-Plan.md`
- **完成报告**: `docs/Frontend-Completion-Report.md`
- **组件示例**: 查看 `src/features/` 目录下的组件

---

**最后更新**: 2025-01-08
**版本**: 1.0.0
**维护者**: Claude Code (5 Agents)
