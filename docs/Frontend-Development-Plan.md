# 🚀 文化基因库前端开发计划

## 📋 项目概述

**项目名称**：文化基因库前端系统（Meme Library Frontend）
**技术栈**：React 19 + TypeScript + Tailwind CSS + Zustand
**开发周期**：15周
**团队规模**：5个AI智能体并行开发
**代码复用率**：70%（基于现有LightRAG WebUI）

---

## 🤖 智能体分工

### Agent 1: 基础架构师（Foundation Architect）
**职责**：项目基础架构、路由系统、状态管理、API集成
**颜色标识**：🟦 蓝色

**主要任务**：
- 项目结构搭建
- 路由系统配置
- Zustand stores 设计与实现
- API客户端封装
- TypeScript类型定义
- 开发环境配置

### Agent 2: UI组件开发者（UI Component Developer）
**职责**：通用UI组件、布局组件、主题系统
**颜色标识**：🟩 绿色

**主要任务**：
- 布局组件（MainLayout, ProjectLayout）
- 通用UI组件（Button, Input, Dialog等）
- 主题系统（亮色/暗色主题）
- 样式系统（Tailwind配置）
- Radix UI集成
- 响应式设计

### Agent 3: 业务模块开发者A（Business Module Dev A）
**职责**：项目管理、本体管理、文档管理
**颜色标识**：🟨 黄色

**主要任务**：
- 项目列表页面
- 项目创建/编辑对话框
- 本体编辑器
- 实体/关系类型管理
- 文档上传界面
- 多模态解析展示

### Agent 4: 业务模块开发者B（Business Module Dev B）
**职责**：图谱可视化、表格视图、节点管理
**颜色标识**：🟧 橙色

**主要任务**：
- 图谱查看器扩展
- 图片节点渲染
- 表格视图实现
- 节点属性面板
- 图谱筛选和搜索
- 数据可视化

### Agent 5: 高级功能开发者（Advanced Feature Dev）
**职责**：LLM属性生成、智能问答、多模态查询
**颜色标识**：🟪 紫色

**主要任务**：
- LLM/VLLM属性生成对话框
- 提示词模板系统
- 智能问答界面集成
- 多模态查询
- 实时通信（WebSocket）
- 性能优化

---

## 📅 开发阶段划分

### 🎯 Phase 1: 基础架构搭建（Week 1-2）

**目标**：完成项目基础架构，为其他模块提供支撑

| 任务 | 负责Agent | 优先级 | 依赖 | 预计时间 |
|-----|----------|--------|------|---------|
| 1.1 项目初始化 | 🟦 | P0 | - | 2天 |
| 1.2 路由系统配置 | 🟦 | P0 | 1.1 | 2天 |
| 1.3 布局组件开发 | 🟩 | P0 | 1.1 | 3天 |
| 1.4 Zustand Store设计 | 🟦 | P0 | 1.1 | 3天 |
| 1.5 API客户端封装 | 🟦 | P0 | 1.1 | 2天 |
| 1.6 主题系统实现 | 🟩 | P1 | 1.3 | 2天 |
| 1.7 TypeScript类型定义 | 🟦 | P0 | 1.1 | 2天 |
| 1.8 开发环境配置 | 🟦 | P0 | - | 1天 |

**里程碑**：✅ 基础框架完成，可以运行空白页面

**详细任务清单**：

#### 1.1 项目初始化（🟦 Agent 1）
```bash
# 任务清单
- [ ] 创建新分支：feature/meme-library-frontend
- [ ] 复制lightrag_webui目录到新项目
- [ ] 清理不需要的现有代码
- [ ] 更新package.json名称和依赖
- [ ] 配置Vite构建选项
- [ ] 配置ESLint和Prettier
- [ ] 配置Tailwind CSS
- [ ] 创建基本目录结构

# 目录结构
src/
├── api/              # API客户端（🟦负责）
├── assets/           # 静态资源
├── components/       # 通用组件（🟩负责）
│   ├── ui/          # 基础UI组件
│   ├── layout/      # 布局组件
│   └── ...          # 其他组件
├── features/         # 功能模块
│   ├── projects/    # 项目管理（🟨负责）
│   ├── ontology/    # 本体管理（🟨负责）
│   ├── graph/       # 图谱可视化（🟧负责）
│   ├── table/       # 表格视图（🟧负责）
│   ├── documents/   # 文档管理（🟨负责）
│   ├── attributes/  # 属性编辑（🟪负责）
│   └── chat/        # 智能问答（🟪负责）
├── hooks/           # 自定义Hooks
├── lib/             # 工具函数
├── stores/          # Zustand stores（🟦负责）
├── types/           # TypeScript类型（🟦负责）
├── utils/           # 工具函数
└── App.tsx
```

#### 1.2 路由系统配置（🟦 Agent 1）
```typescript
// AppRouter.tsx
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import ProjectLayout from '@/components/layout/ProjectLayout'

// 路由配置
const routes = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <ProjectsList /> }, // 首页
      {
        path: 'projects/:projectId',
        element: <ProjectLayout />,
        children: [
          { index: true, element: <Navigate to="documents" /> },
          { path: 'documents', element: <DocumentManager /> },
          { path: 'ontology', element: <OntologyEditor /> },
          { path: 'graph', element: <GraphViewer /> },
          { path: 'table', element: <TableView /> },
          { path: 'chat', element: <ChatInterface /> }
        ]
      }
    ]
  }
]
```

#### 1.3 布局组件开发（🟩 Agent 2）
```tsx
// MainLayout.tsx
export function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <BottomNavigation /> {/* 移动端 */}
    </div>
  )
}

// ProjectLayout.tsx
export function ProjectLayout() {
  const { projectId } = useParams()
  const project = useProjectStore(use => use.currentProject)

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} />
      <ProjectTabs />
      <Outlet />
    </div>
  )
}
```

#### 1.4 Zustand Store设计（🟦 Agent 1）
```typescript
// stores/project.ts
interface ProjectStore {
  projects: Project[]
  currentProject: Project | null
  fetchProjects: () => Promise<void>
  setCurrentProject: (project: Project) => void
}

// stores/ontology.ts
interface OntologyStore {
  ontologies: Record<string, OntologySpec>
  currentOntology: OntologySpec | null
  fetchOntology: (projectId: string) => Promise<void>
}

// stores/graph.ts
interface GraphStore {
  nodes: Node[]
  edges: Edge[]
  selectedNodes: string[]
  fetchGraph: (projectId: string) => Promise<void>
}

// stores/ui.ts
interface UIStore {
  theme: 'light' | 'dark'
  viewMode: 'graph' | 'table'
  dialogs: Record<string, boolean>
  toasts: Toast[]
}
```

#### 1.5 API客户端封装（🟦 Agent 1）
```typescript
// api/lightrag.ts 扩展
export const projectApi = {
  list: () => api.get('/projects/'),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects/create', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`)
}

export const ontologyApi = {
  get: (id) => api.get(`/ontology/${id}`),
  create: (data) => api.post('/ontology/create', data),
  update: (id, data) => api.put(`/ontology/${id}`, data),
  validate: (id) => api.get(`/ontology/${id}/validate`)
}

export const enrichmentApi = {
  enrichEntity: (data) => api.post('/enrichment/entity', data),
  enrichEntities: (data) => api.post('/enrichment/entities', data)
}
```

#### 1.6 主题系统实现（🟩 Agent 2）
```css
/* index.css */
@layer base {
  :root {
    --brand-primary: 8B5CF6;
    --brand-secondary: EC4899;
    --entity-color-artifact: 8B5CF6;
    --entity-color-person: 3B82F6;
    /* ... */
  }

  .dark {
    --bg-primary: 0F172A;
    --bg-secondary: 1E293B;
    /* ... */
  }
}
```

---

### 🎯 Phase 2: 核心业务模块（Week 3-6）

**目标**：完成项目、本体、文档管理功能

#### Week 3-4: 项目与本体管理（🟨 Agent 3）

| 任务 | 负责Agent | 优先级 | 依赖 | 预计时间 |
|-----|----------|--------|------|---------|
| 2.1 项目列表页面 | 🟨 | P0 | 1.3 | 3天 |
| 2.2 项目卡片组件 | 🟨 | P0 | 2.1 | 2天 |
| 2.3 创建项目对话框 | 🟨 | P0 | 2.1 | 3天 |
| 2.4 项目选择器 | 🟨 | P1 | 2.1 | 1天 |
| 2.5 本体编辑器 | 🟨 | P0 | 2.1 | 4天 |
| 2.6 实体类型列表 | 🟨 | P0 | 2.5 | 2天 |
| 2.7 关系类型列表 | 🟨 | P0 | 2.5 | 2天 |
| 2.8 属性定义表单 | 🟨 | P0 | 2.5 | 2天 |
| 2.9 本体验证器 | 🟨 | P1 | 2.5 | 1天 |

**详细实现**：

##### 2.1 项目列表页面（🟨）
```tsx
// features/projects/ProjectsList.tsx
export function ProjectsList() {
  const { projects, fetchProjects } = useProjectStore()
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  const filteredProjects = useMemo(() => {
    return projects.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [projects, search])

  return (
    <div className="space-y-6">
      <ProjectHeader>
        <h1>文化主题</h1>
        <CreateProjectButton />
      </ProjectHeader>

      <SearchBar value={search} onChange={setSearch} />

      <ProjectGrid>
        {filteredProjects.map(project => (
          <ProjectCard key={project.project_id} project={project} />
        ))}
      </ProjectGrid>
    </div>
  )
}
```

##### 2.5 本体编辑器（🟨）
```tsx
// features/ontology/OntologyEditor.tsx
export function OntologyEditor() {
  const { currentOntology, updateOntology } = useOntologyStore()
  const [tab, setTab] = useState('entities') // 'entities' | 'relations'

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 左侧：编辑面板 */}
      <div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="entities">实体类型</TabsTrigger>
            <TabsTrigger value="relations">关系类型</TabsTrigger>
          </TabsList>

          <TabsContent value="entities">
            <EntityTypeList />
            <AddEntityTypeButton />
          </TabsContent>

          <TabsContent value="relations">
            <RelationTypeList />
            <AddRelationTypeButton />
          </TabsContent>
        </Tabs>
      </div>

      {/* 右侧：预览 */}
      <div>
        <OntologyPreview ontology={currentOntology} />
      </div>
    </div>
  )
}
```

#### Week 5-6: 文档管理（🟨 Agent 3）

| 任务 | 负责Agent | 优先级 | 依赖 | 预计时间 |
|-----|----------|--------|------|---------|
| 2.10 文档上传界面 | 🟨 | P0 | 1.3 | 3天 |
| 2.11 文件列表组件 | 🟨 | P0 | 2.10 | 2天 |
| 2.12 上传进度显示 | 🟨 | P0 | 2.10 | 2天 |
| 2.13 多模态解析展示 | 🟨 | P0 | 2.10 | 3天 |
| 2.14 图片画廊组件 | 🟨 | P1 | 2.13 | 2天 |
| 2.15 文档预览 | 🟨 | P1 | 2.10 | 2天 |

**详细实现**：

##### 2.10 文档上传界面（🟨）
```tsx
// features/documents/DocumentUploader.tsx
export function DocumentUploader() {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState([])

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const uploadFiles = async () => {
    setUploading(true)
    for (const file of files) {
      await uploadFile(file)
    }
    setUploading(false)
    setFiles([])
  }

  return (
    <div>
      <Dropzone onDrop={onDrop}>
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <p>拖拽文件到此处，或点击选择</p>
          </div>
        )}
      </Dropzone>

      <FileList files={files} />

      <Button onClick={uploadFiles} disabled={uploading}>
        {uploading ? '上传中...' : '开始上传'}
      </Button>
    </div>
  )
}
```

---

### 🎯 Phase 3: 图谱与表格视图（Week 7-10）

#### Week 7-8: 图谱可视化扩展（🟧 Agent 4）

| 任务 | 负责Agent | 优先级 | 依赖 | 预计时间 |
|-----|----------|--------|------|---------|
| 3.1 扩展GraphViewer | 🟧 | P0 | 1.3 | 4天 |
| 3.2 图片节点渲染器 | 🟧 | P0 | 3.1 | 3天 |
| 3.3 节点属性面板 | 🟧 | P0 | 3.1 | 3天 |
| 3.4 图谱筛选器 | 🟧 | P1 | 3.1 | 2天 |
| 3.5 节点搜索功能 | 🟧 | P1 | 3.1 | 2天 |
| 3.6 图谱布局优化 | 🟧 | P2 | 3.1 | 2天 |

**详细实现**：

##### 3.2 图片节点渲染器（🟧）
```tsx
// components/graph/ImageNodeRenderer.tsx
export function ImageNodeRenderer({ node }: { node: Node }) {
  const imageUrl = node.properties.image_url
  const sigma = useSigma()

  if (imageUrl) {
    // 图片节点
    return (
      <g>
        <image
          href={imageUrl}
          x={-20}
          y={-20}
          width={40}
          height={40}
          clipPath="circle(20px)"
        />
        <circle r={20} fill="none" stroke={getNodeTypeColor(node)} />
      </g>
    )
  }

  // 默认节点
  return <DefaultNodeRenderer node={node} />
}
```

##### 3.3 节点属性面板（🟧）
```tsx
// components/graph/NodePropertiesPanel.tsx
export function NodePropertiesPanel({ node }: { node: Node }) {
  const { updateNode } = useGraphStore()

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{node.entity_name}</DialogTitle>
          <EntityTypeBadge>{node.entity_type}</EntityTypeBadge>
        </DialogHeader>

        {/* 图片 */}
        {node.image_url && (
          <div className="mb-4">
            <img src={node.image_url} alt="" className="rounded-lg" />
          </div>
        )}

        {/* 属性列表 */}
        <PropertyList>
          {node.attributes.map(attr => (
            <PropertyItem key={attr.name}>
              <PropertyName>{attr.name}</PropertyName>
              <PropertyValue>
                {attr.type === 'image' ? (
                  <img src={attr.value} alt="" />
                ) : (
                  attr.value
                )}
              </PropertyValue>
            </PropertyItem>
          ))}
        </PropertyList>

        {/* 操作按钮 */}
        <DialogActions>
          <AddAttributeButton />
          <EnrichAttributesButton />
        </DialogActions>
      </DialogContent>
    </Dialog>
  )
}
```

#### Week 9-10: 表格视图（🟧 Agent 4）

| 任务 | 负责Agent | 优先级 | 依赖 | 预计时间 |
|-----|----------|--------|------|---------|
| 3.7 数据表格组件 | 🟧 | P0 | 1.3 | 4天 |
| 3.8 表格筛选器 | 🟧 | P0 | 3.7 | 2天 |
| 3.9 表格排序 | 🟧 | P1 | 3.7 | 2天 |
| 3.10 图片列 | 🟧 | P0 | 3.7 | 2天 |
| 3.11 属性预览 | 🟧 | P0 | 3.7 | 2天 |
| 3.12 批量操作 | 🟧 | P1 | 3.7 | 2天 |
| 3.13 内联编辑 | 🟧 | P1 | 3.7 | 3天 |

**详细实现**：

##### 3.7 数据表格组件（🟧）
```tsx
// components/table/DataTable.tsx
export function DataTable() {
  const { nodes, updateNode } = useGraphStore()
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])

  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      )
    },
    {
      accessorKey: 'entity_name',
      header: '名称',
      cell: ({ row }) => {
        const node = row.original
        return (
          <div className="flex items-center gap-2">
            {node.image_url && (
              <img src={node.image_url} className="w-8 h-8 rounded" />
            )}
            <span>{node.entity_name}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'entity_type',
      header: '类型',
      cell: ({ row }) => (
        <EntityTypeBadge>{row.original.entity_type}</EntityTypeBadge>
      )
    },
    // ... 更多列
  ], [])

  const table = useReactTable({
    data: nodes,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center">
                暂无数据
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

---

### 🎯 Phase 4: 高级功能（Week 11-13）

#### Week 11-12: LLM属性生成（🟪 Agent 5）

| 任务 | 负责Agent | 优先级 | 依赖 | 预计时间 |
|-----|----------|--------|------|---------|
| 4.1 属性编辑对话框 | 🟪 | P0 | 3.3 | 3天 |
| 4.2 LLM生成面板 | 🟪 | P0 | 4.1 | 4天 |
| 4.3 提示词模板系统 | 🟪 | P0 | 4.2 | 3天 |
| 4.4 模型选择器 | 🟪 | P0 | 4.2 | 1天 |
| 4.5 生成进度显示 | 🟪 | P0 | 4.2 | 2天 |
| 4.6 批量属性操作 | 🟪 | P1 | 4.2 | 2天 |

**详细实现**：

##### 4.2 LLM生成面板（🟪）
```tsx
// components/attributes/LLMEnrichmentPanel.tsx
export function LLMEnrichmentPanel({ node }: { node: Node }) {
  const [generating, setGenerating] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [model, setModel] = useState<'llm' | 'vllm'>('llm')

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const response = await enrichmentApi.enrichEntity({
        entity_name: node.entity_name,
        ontology_id: currentOntology.ontology_id,
        prompt: prompt,
        model: model,
        image_url: model === 'vllm' ? node.image_url : undefined
      })
      setResult(response.value)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3>AI 属性生成</h3>

      {/* 模型选择 */}
      <ModelSelector value={model} onChange={setModel}>
        <option value="llm">LLM（文本模型）</option>
        {node.image_url && (
          <option value="vllm">VLLM（视觉-语言模型）</option>
        )}
      </ModelSelector>

      {/* 属性名称 */}
      <Input
        placeholder="新属性名称，如：隐性描述"
        onChange={(e) => setAttributeName(e.target.value)}
      />

      {/* 提示词模板 */}
      <PromptTemplateSelector
        value={prompt}
        onChange={setPrompt}
      />

      {/* 自定义提示词 */}
      <Textarea
        placeholder="自定义提示词..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
      />

      {/* 生成按钮 */}
      <Button onClick={handleGenerate} disabled={generating}>
        {generating ? '生成中...' : '生成属性'}
      </Button>

      {/* 生成结果 */}
      {result && (
        <div className="p-4 bg-muted rounded">
          <h4>生成结果</h4>
          <p>{result}</p>
          <Button onClick={saveAttribute}>保存属性</Button>
        </div>
      )}
    </div>
  )
}
```

##### 4.3 提示词模板系统（🟪）
```tsx
// components/attributes/PromptTemplateSelector.tsx
const promptTemplates = [
  {
    id: 'historical',
    name: '历史描述',
    template: '你是{朝代}的一位历史学家。请描述这个文物的用途、意义和文化背景。',
    model: 'llm'
  },
  {
    id: 'cultural',
    name: '文化解读',
    template: '你是{朝代}的一位民众。对于这个文物，你有什么个人认知或印象？',
    model: 'llm'
  },
  {
    id: 'artistic',
    name: '艺术分析',
    template: '你是{朝代}的一位工匠。请从技术和艺术角度分析这个文物的制作工艺。',
    model: 'vllm' // 需要看到图片
  },
  {
    id: 'modern',
    name: '现代视角',
    template: '你是一位现代博物馆策展人。请从当代视角解释这个文物的价值。',
    model: 'llm'
  }
]

export function PromptTemplateSelector({ value, onChange }) {
  const [template, setTemplate] = useState(null)

  const handleSelect = (tmpl) => {
    setTemplate(tmpl)
    onChange(tmpl.template)
  }

  return (
    <div>
      <label>提示词模板</label>
      <Select value={template?.id} onChange={handleSelect}>
        <option value="">自定义</option>
        {promptTemplates.map(tmpl => (
          <option key={tmpl.id} value={tmpl.id}>
            {tmpl.name}
            {tmpl.model === 'vllm' && ' 📷'}
          </option>
        ))}
      </Select>

      {template && (
        <div className="text-sm text-muted-foreground">
          {tmpl.template}
        </div>
      )}
    </div>
  )
}
```

#### Week 13: 智能问答集成（🟪 Agent 5）

| 任务 | 负责Agent | 优先级 | 依赖 | 预计时间 |
|-----|----------|--------|------|---------|
| 4.7 扩展现有Chat组件 | 🟪 | P0 | 2.x | 2天 |
| 4.8 多模态输入 | 🟪 | P0 | 4.7 | 2天 |
| 4.9 引用查看器 | 🟪 | P1 | 4.7 | 2天 |
| 4.10 本体注入提示 | 🟪 | P0 | 4.7 | 1天 |

**详细实现**：

##### 4.8 多模态输入（🟪）
```tsx
// components/chat/MultimodalInput.tsx
export function MultimodalInput() {
  const [text, setText] = useState('')
  const [image, setImage] = useState(null)

  const handleImageUpload = async (file) => {
    const url = await uploadImage(file)
    setImage(url)
  }

  const handleSend = async () => {
    const queryData = {
      query: text,
      image_url: image,
      mode: 'mix',
      ontology_id: currentOntology.ontology_id
    }

    await queryWithImage(queryData)
    setText('')
    setImage(null)
  }

  return (
    <div className="flex gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="请输入您的问题..."
      />

      {image && (
        <div className="relative">
          <img src={image} alt="上传的图片" />
          <Button onClick={() => setImage(null)}>×</Button>
        </div>
      )}

      <ImageUploadButton onUpload={handleImageUpload} />
      <SendButton onClick={handleSend} />
    </div>
  )
}
```

---

### 🎯 Phase 5: 优化与测试（Week 14-15）

#### Week 14: 性能优化（所有Agent协作）

| 任务 | 负责Agent | 优先级 | 预计时间 |
|-----|----------|--------|---------|
| 5.1 代码分割 | 🟦 | P0 | 2天 |
| 5.2 图片懒加载 | 🟧 | P0 | 1天 |
| 5.3 虚拟滚动（长列表） | 🟧 | P1 | 2天 |
| 5.4 缓存策略优化 | 🟦 | P0 | 2天 |
| 5.5 状态管理优化 | 🟦 | P1 | 1天 |
| 5.6 Bundle体积优化 | 🟦 | P1 | 1天 |

#### Week 15: 测试与文档（所有Agent协作）

| 任务 | 负责Agent | 优先级 | 预计时间 |
|-----|----------|--------|---------|
| 5.7 单元测试 | All | P0 | 2天 |
| 5.8 集成测试 | All | P0 | 2天 |
| 5.9 E2E测试 | 🟪 | P1 | 1天 |
| 5.10 用户文档 | 🟨 | P0 | 1天 |
| 5.11 API文档 | 🟦 | P0 | 1天 |
| 5.12 部署配置 | 🟦 | P0 | 1天 |

---

## 🔄 并行开发流程

### Week 1-2：基础框架阶段
```
🟦 (Agent 1) │ 项目初始化 → 路由配置 → Store设计 → API封装
🟩 (Agent 2) │ ───────布局组件开发──────→ 主题系统实现
🟨 (Agent 3) │ 等待基础框架完成
🟧 (Agent 4) │ 等待基础框架完成
🟪 (Agent 5) │ 等待基础框架完成
```

### Week 3-6：核心业务阶段
```
🟦 (Agent 1) │ API支持、类型定义、Bug修复
🟩 (Agent 2) │ 通用组件开发、样式优化
🟨 (Agent 3) │ 项目管理 → 本体管理 → 文档管理
🟧 (Agent 4) │ ──────等待图谱视图任务─────
🟪 (Agent 5) │ ──────等待高级功能任务─────
```

### Week 7-10：可视化阶段
```
🟦 (Agent 1) │ 图谱API支持、性能优化
🟩 (Agent 2) │ UI组件优化、响应式适配
🟨 (Agent 3) │ 文档管理完善、功能测试
🟧 (Agent 4) │ 图谱视图 → 表格视图
🟪 (Agent 5) │ ──────等待高级功能任务─────
```

### Week 11-13：高级功能阶段
```
🟦 (Agent 1) │ LLM API集成、WebSocket
🟩 (Agent 2) │ 对话框组件、动画效果
🟨 (Agent 3) │ 集成测试、Bug修复
🟧 (Agent 4) │ 图谱功能完善、优化
🟪 (Agent 5) │ LLM属性生成 → 智能问答
```

### Week 14-15：优化发布阶段
```
All Agents │ 并行优化各自负责模块
         │ 交叉测试、Bug修复
         │ 文档编写
         │ 部署上线
```

---

## 📊 进度跟踪

### 任务状态定义
- ⏸️ **Pending**：未开始
- 🔄 **In Progress**：进行中
- ✅ **Completed**：已完成
- ❌ **Blocked**：阻塞
- ⚠️ **At Risk**：风险

### 里程碑
1. **M1 (Week 2)**：基础框架完成 ✅
2. **M2 (Week 4)**：项目与本体管理完成 ✅
3. **M3 (Week 6)**：文档管理完成 ✅
4. **M4 (Week 8)**：图谱可视化完成 ✅
5. **M5 (Week 10)**：表格视图完成 ✅
6. **M6 (Week 12)**：LLM属性生成完成 ✅
7. **M7 (Week 13)**：智能问答完成 ✅
8. **M8 (Week 15)**：项目上线 🎉

---

## 🤝 协作规范

### Git工作流
```bash
# 主分支
main          # 稳定版本
develop       # 开发分支

# 功能分支
feature/project-management    # 项目管理（🟨）
feature/ontology-management   # 本体管理（🟨）
feature/graph-viewer         # 图谱视图（🟧）
feature/table-view           # 表格视图（🟧）
feature/llm-enrichment       # LLM属性生成（🟪）
feature/chat-interface       # 智能问答（🟪）
```

### 代码审查流程
1. Agent完成功能开发
2. 创建Pull Request到`develop`分支
3. 其他Agent进行Code Review
4. 修改意见并完善
5. 合并到`develop`分支

### 文档规范
- 每个模块必须有README
- 复杂组件必须有JSDoc注释
- API调用必须有类型定义
- 提交信息使用约定式提交格式

---

## 🎯 关键指标

### 质量指标
- TypeScript覆盖率：> 95%
- 单元测试覆盖率：> 80%
- ESLint警告：0
- 性能评分：> 90

### 进度指标
- 每周完成进度报告
- 里程碑按时完成率：> 90%
- Bug修复时间：< 2天

### 用户体验指标
- 首屏加载时间：< 2s
- 页面交互响应：< 100ms
- 图谱节点渲染：< 1s (1000节点)
- 表格滚动流畅度：60fps

---

## 📞 沟通机制

### 每日站会（每日）
- 每个Agent汇报昨日完成
- 今日计划
- 遇到的阻塞

### 周例会（每周五）
- 回顾本周进度
- 计划下周任务
- 风险识别

### 技术讨论会（按需）
- 架构设计讨论
- 技术方案评审
- Bug分析和解决

---

**下一步行动**：启动Phase 1，各Agent开始执行任务！🚀
