# 文化基因库前端设计说明

## 📋 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [功能模块设计](#功能模块设计)
4. [页面结构](#页面结构)
5. [数据流设计](#数据流设计)
6. [组件设计](#组件设计)
7. [API集成](#api集成)
8. [多模态支持](#多模态支持)
9. [状态管理](#状态管理)
10. [样式与主题](#样式与主题)
11. [开发计划](#开发计划)

---

## 📌 项目概述

### 核心概念

**文化基因库（Meme Library）** 是一个基于本体驱动的多模态知识图谱系统，允许用户：
- 创建和管理多个文化主题（项目/工作空间）
- 上传多模态文档（文本、图片、PDF等）
- 自定义本体结构（实体类型、关系类型、属性）
- 提取和可视化知识图谱
- 进行智能问答（KG-RAG）
- 丰富节点属性（支持LLM/VLLM）

### 与现有WebUI的关系

- ✅ **复用现有组件**：图谱查看器、文档管理器、查询界面
- ✅ **复用技术栈**：React 19、TypeScript、Tailwind CSS、Zustand
- ✅ **扩展功能**：项目管理、本体管理、多模态展示、节点属性编辑
- ✅ **新增页面**：文化主题列表、本体编辑器、表格视图、属性丰富界面

---

## 🛠 技术栈

### 前端框架
- **React 19.2.3** - UI框架
- **TypeScript 5.9** - 类型安全
- **Vite 7.3** - 构建工具
- **React Router Dom 7.11** - 路由管理

### UI组件库
- **Radix UI** - 无障碍组件基础
- **Tailwind CSS 4.1** - 样式系统
- **Lucide React** - 图标库
- **Sonner** - Toast通知

### 数据可视化
- **Sigma.js / React-Sigma** - 图谱可视化（已有）
- **@tanstack/react-table** - 表格视图
- **React Markdown** - Markdown渲染

### 状态管理
- **Zustand 5.0** - 轻量级状态管理

### HTTP客户端
- **Axios 1.13** - API请求

### 多模态支持
- **React Dropzone** - 文件上传
- **HTML5 Canvas** - 图片预览和处理

---

## 🎯 功能模块设计

### 1. 文化主题管理模块（Projects Module）

#### 1.1 主题列表页（Projects List）

**路径**：`/projects` 或 `/`

**功能**：
- 显示所有文化主题（项目）
- 卡片式布局，展示主题基本信息
- 支持搜索、筛选、排序
- 创建新主题
- 切换主题

**UI组件**：
```tsx
<ProjectsList>
  <ProjectHeader>
    <SearchBar />
    <CreateProjectButton />
  </ProjectHeader>
  <ProjectGrid>
    <ProjectCard>
      <ProjectCover />
      <ProjectTitle />
      <ProjectDescription />
      <ProjectStats /> // 文档数、节点数、关系数
      <ProjectActions />
    </ProjectCard>
  </ProjectGrid>
</ProjectsList>
```

**数据结构**：
```typescript
interface Project {
  project_id: string
  name: string
  description: string
  workspace: string
  ontology_id?: string
  created_at: string
  updated_at: string
  status: 'active' | 'archived'

  // 统计信息（从后端计算）
  stats?: {
    document_count: number
    entity_count: number
    relation_count: number
    last_updated: string
  }
}
```

#### 1.2 创建/编辑主题对话框

**功能**：
- 设置主题名称、描述
- 上传主题封面图（可选）
- 选择本体模板或稍后创建
- 设置标签/分类

**API集成**：
```typescript
// POST /projects/create
const createProject = async (data: {
  name: string
  description: string
  tags?: string[]
  cover_image?: string
}) => {
  return await api.post('/projects/create', data)
}
```

---

### 2. 本体管理模块（Ontology Module）

#### 2.1 本体编辑器（Ontology Editor）

**路径**：`/projects/:projectId/ontology`

**功能**：
- **实体类型管理**：添加、编辑、删除实体类型
- **关系类型管理**：添加、编辑、删除关系类型
- **属性定义**：为每个类型定义属性
- **可视化展示**：以树状或表格形式展示本体结构
- **导入导出**：支持JSON格式的本体导入导出

**UI组件**：
```tsx
<OntologyEditor>
  <OntologyHeader>
    <OntologySelector /> // 切换不同本体
    <OntologyActions>
      <SaveButton />
      <ExportButton />
      <ValidateButton />
    </OntologyActions>
  </OntologyHeader>

  <OntologyContent>
    <EntityTypesPanel>
      <EntityTypeList>
        <EntityTypeCard>
          <EntityTypeName />
          <EntityTypeAttributes />
          <EntityTypeActions />
        </EntityTypeCard>
      </EntityTypeList>
      <AddEntityTypeButton />
    </EntityTypesPanel>

    <RelationTypesPanel>
      <RelationTypeList>
        <RelationTypeCard>
          <RelationTypeName />
          <RelationTypeAttributes />
          <RelationTypeActions />
        </RelationTypeCard>
      </RelationTypeList>
      <AddRelationTypeButton />
    </RelationTypesPanel>
  </OntologyContent>

  <OntologyPreview>
    <OntologyGraphVisualization />
  </OntologyPreview>
</OntologyEditor>
```

**数据结构**：
```typescript
interface OntologySpec {
  ontology_id: string
  project_id: string
  name: string
  description: string
  version: string
  language: 'zh' | 'en'
  entity_types: string[]
  relation_types: string[]
  entity_attributes: Record<string, AttributeDefinition>
  relation_attributes: Record<string, AttributeDefinition>
  normalization_rules?: Record<string, any>
  created_at: string
  updated_at: string
}

interface AttributeDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'image' | 'array'
  required: boolean
  description: string
  enum_values?: string[]
  min_value?: number
  max_value?: number
}
```

**API集成**：
```typescript
// 创建本体
POST /ontology/create

// 获取本体
GET /ontology/:ontologyId

// 更新本体
PUT /ontology/:ontologyId

// 验证本体
GET /ontology/:ontologyId/validate

// 删除本体
DELETE /ontology/:ontologyId
```

---

### 3. 文档管理模块（Documents Module）

#### 3.1 文档上传界面

**路径**：`/projects/:projectId/documents`

**功能**：
- 拖拽上传文件
- 支持多文件上传
- 显示上传进度
- 多模态解析状态
- 文档预览

**支持的文件格式**：
- 📄 文本文件：TXT, MD, DOC, DOCX
- 📊 表格文件：CSV, XLS, XLSX
- 📕 PDF文件
- 🖼 图片文件：JPG, PNG, GIF, WebP
- 🎬 音视频（未来扩展）

**UI组件**：
```tsx
<DocumentUploader>
  <Dropzone>
    <DropzoneContent>
      <UploadIcon />
      <UploadInstructions />
      <SupportedFormatsList />
    </DropzoneContent>
  </Dropzone>

  <FileList>
    <FileItem>
      <FileIcon />
      <FileName />
      <FileSize />
      <UploadProgress />
      <ParseStatus /> // pending | parsing | completed | failed
      <FileActions />
    </FileItem>
  </FileList>

  <ParsingLog>
    <ParseProgress />
    <ParseDetails /> // 提取的文本、图片数量等
  </ParsingLog>
</DocumentUploader>
```

**多模态解析结果展示**：
```tsx
<ParseResultViewer>
  <TextContent>
    <ExtractedText />
  </TextContent>

  <ImageGallery>
    <ExtractedImage>
      <ImagePreview />
      <ImageMetadata /> // OCR文本、位置信息等
    </ExtractedImage>
  </ImageGallery>

  <TablePreview>
    <ExtractedTables />
  </TablePreview>
</ParseResultViewer>
```

**API集成**：
```typescript
// 使用现有的文档上传API
POST /documents/upload

// 获取文档列表
GET /documents

// 获取文档状态
GET /documents/status

// 删除文档
DELETE /documents/:docId
```

---

### 4. 知识图谱可视化模块（Graph Visualization Module）

#### 4.1 图谱查看器（Graph Viewer）

**路径**：`/projects/:projectId/graph`

**功能**：
- 复用现有的 `GraphViewer` 组件
- 支持多模态节点展示（图片节点）
- 节点类型着色（基于本体）
- 关系类型标签
- 搜索和过滤
- 布局切换（力导向、层次、圆形等）
- 缩放、平移、全屏

**多模态展示增强**：
```tsx
<NodeRender>
  {/* 根据节点类型选择渲染方式 */}
  {node.entity_type === 'Image' ? (
    <ImageNode>
      <img src={node.image_url} alt={node.label} />
      <NodeLabel>{node.label}</NodeLabel>
    </ImageNode>
  ) : (
    <DefaultNode>
      <NodeShape color={getEntityTypeColor(node.entity_type)} />
      <NodeLabel>{node.label}</NodeLabel>
    </DefaultNode>
  )}

  {/* 节点属性指示器 */}
  {node.attributes.length > 0 && (
    <AttributeIndicator count={node.attributes.length} />
  )}
</NodeRender>
```

**节点属性展示**：
```tsx
<NodePropertiesPanel>
  <PropertyList>
    <PropertyItem>
      <PropertyName>名称</PropertyName>
      <PropertyValue>{node.entity_name}</PropertyValue>
    </PropertyItem>

    <PropertyItem>
      <PropertyName>类型</PropertyName>
      <PropertyValue>
        <EntityTypeBadge>{node.entity_type}</EntityTypeBadge>
      </PropertyValue>
    </PropertyItem>

    {/* 图片属性 */}
    {node.image_url && (
      <PropertyItem>
        <PropertyName>图片</PropertyName>
        <PropertyValue>
          <ImageViewer src={node.image_url} />
        </PropertyValue>
      </PropertyItem>
    )}

    {/* 其他属性 */}
    {node.attributes.map(attr => (
      <PropertyItem key={attr.name}>
        <PropertyName>{attr.name}</PropertyName>
        <PropertyValue>
          {attr.type === 'image' ? (
            <ImageViewer src={attr.value} />
          ) : (
            attr.value
          )}
        </PropertyValue>
      </PropertyItem>
    ))}
  </PropertyList>

  <PropertyActions>
    <AddAttributeButton />
    <EnrichAttributesButton />
  </PropertyActions>
</NodePropertiesPanel>
```

#### 4.2 表格视图（Table View）

**路径**：`/projects/:projectId/table`

**功能**：
- 以表格形式展示所有节点
- 支持筛选（按类型、属性）
- 支持排序
- 支持搜索
- 批量操作
- 内联编辑

**UI组件**：
```tsx
<TableView>
  <TableFilters>
    <EntityTypeFilter />
    <AttributeFilter />
    <SearchInput />
    <ColumnSelector />
  </TableFilters>

  <DataTable>
    <TableHeader>
      <TableRow>
        <TableCheckbox />
        <TableName />
        <TableType />
        <TableAttributes />
        <TableActions />
      </TableRow>
    </TableHeader>

    <TableBody>
      {nodes.map(node => (
        <TableRow key={node.id}>
          <TableCheckbox />
          <TableName>
            {node.image_url && <NodeThumbnail src={node.image_url} />}
            {node.entity_name}
          </TableName>
          <TableType>
            <EntityTypeBadge>{node.entity_type}</EntityTypeBadge>
          </TableType>
          <TableAttributes>
            <AttributePreview attributes={node.attributes} />
          </TableAttributes>
          <TableActions>
            <EditButton />
            <DeleteButton />
          </TableActions>
        </TableRow>
      ))}
    </TableBody>
  </DataTable>

  <TablePagination />
</TableView>
```

**列配置**：
```typescript
interface ColumnConfig {
  id: string
  header: string
  visible: boolean
  width: number
  sortable: boolean
  filterable: boolean
}

// 默认列
const defaultColumns: ColumnConfig[] = [
  { id: 'select', header: '', visible: true, width: 50, sortable: false, filterable: false },
  { id: 'name', header: '名称', visible: true, width: 200, sortable: true, filterable: true },
  { id: 'type', header: '类型', visible: true, width: 120, sortable: true, filterable: true },
  { id: 'description', header: '描述', visible: true, width: 300, sortable: false, filterable: false },
  { id: 'image', header: '图片', visible: true, width: 100, sortable: false, filterable: false },
  { id: 'attributes', header: '属性', visible: true, width: 400, sortable: false, filterable: true },
  { id: 'actions', header: '操作', visible: true, width: 100, sortable: false, filterable: false },
]

// 动态列（基于本体属性定义）
const dynamicColumns: ColumnConfig[] = ontology.entity_types.map(type => ({
  id: `attr_${type}`,
  header: type,
  visible: false,
  width: 150,
  sortable: true,
  filterable: true
}))
```

---

### 5. 节点属性编辑模块（Node Attribute Editor Module）

#### 5.1 属性编辑对话框

**触发方式**：
- 从图谱节点右键菜单
- 从表格行的编辑按钮
- 从属性面板的添加按钮

**功能**：
- 查看所有属性
- 添加新属性
- 编辑现有属性
- 删除属性
- LLM/VLLM自动生成属性

**UI组件**：
```tsx
<AttributeEditDialog>
  <DialogHeader>
    <DialogTitle>节点属性</DialogTitle>
    <EntityInfo>{entity_name} - {entity_type}</EntityInfo>
  </DialogHeader>

  <DialogContent>
    {/* 现有属性列表 */}
    <AttributeList>
      {attributes.map(attr => (
        <AttributeItem key={attr.name}>
          <AttributeName>{attr.name}</AttributeName>
          <AttributeValue>
            {attr.type === 'image' ? (
              <ImageDisplay src={attr.value} />
            ) : attr.type === 'boolean' ? (
              <BooleanSwitch value={attr.value} />
            ) : (
              <TextValue>{attr.value}</TextValue>
            )}
          </AttributeValue>
          <AttributeActions>
            <EditButton />
            <DeleteButton />
          </AttributeActions>
        </AttributeItem>
      ))}
    </AttributeList>

    {/* 添加属性表单 */}
    <AddAttributeForm>
      <AttributeNameInput placeholder="属性名称" />
      <AttributeTypeSelect>
        <option value="string">文本</option>
        <option value="number">数字</option>
        <option value="boolean">布尔</option>
        <option value="date">日期</option>
        <option value="image">图片</option>
        <option value="array">数组</option>
      </AttributeTypeSelect>
      <AttributeValueInput />
      <AddButton />
    </AddAttributeForm>

    {/* LLM/VLLM属性生成 */}
    <LLMEnrichmentSection>
      <SectionTitle>AI 属性生成</SectionTitle>

      <ModelSelector>
        <ModelOption value="llm">LLM（文本）</ModelOption>
        <ModelOption value="vllm">VLLM（视觉-语言）</ModelOption>
      </ModelSelector>

      <AttributeNameInput placeholder="新属性名称" />
      <PromptTextArea
        placeholder="提示词：你是XX朝代的一位民众，你对于该文物有什么认知或印象？"
      />

      <TemplateSelector>
        <TemplateOption>历史描述</TemplateOption>
        <TemplateOption>文化解读</TemplateOption>
        <TemplateOption>艺术分析</TemplateOption>
        <TemplateOption>自定义...</TemplateOption>
      </TemplateSelector>

      <GenerateButton onStart={handleGenerate} />
      <GenerationProgress>
        <ProgressBar />
        <StatusText />
      </GenerationProgress>
      <GeneratedResult value={generatedValue} onChange={setGeneratedValue} />

      <SaveButton />
    </LLMEnrichmentSection>
  </DialogContent>
</AttributeEditDialog>
```

**API集成**：
```typescript
// 获取实体丰富API
POST /enrichment/entity
Body: {
  entity_name: string
  ontology_id: string
}

// 批量丰富
POST /enrichment/entities
Body: {
  entity_names: string[]
  ontology_id: string
}

// 后台任务
POST /enrichment/entity/background
POST /enrichment/entities/background
```

**生成流程**：
```typescript
const handleGenerate = async () => {
  // 1. 获取实体信息（包括图片）
  const entity = await fetchEntity(node.id)

  // 2. 根据模型类型选择API
  if (modelType === 'vllm' && entity.image_url) {
    // 使用VLLM，传递图片URL
    const result = await api.post('/enrichment/entity', {
      entity_name: entity.entity_name,
      ontology_id: currentOntology.ontology_id,
      attribute_name: newAttributeName,
      prompt: prompt,
      image_url: entity.image_url, // VLLM可以看到图片
      model: 'vllm'
    })
  } else {
    // 使用LLM
    const result = await api.post('/enrichment/entity', {
      entity_name: entity.entity_name,
      ontology_id: currentOntology.ontology_id,
      attribute_name: newAttributeName,
      prompt: prompt,
      model: 'llm'
    })
  }

  // 3. 显示生成结果
  setGeneratedValue(result.value)
}

const saveAttribute = async () => {
  // 4. 保存到后端
  await api.put(`/entities/${node.id}/attributes`, {
    name: newAttributeName,
    value: generatedValue
  })

  // 5. 刷新节点数据
  await fetchNode(node.id)
}
```

**提示词模板**：
```typescript
const promptTemplates = {
  historicalDescription: {
    name: '历史描述',
    template: '你是{朝代}的一位历史学家。请描述这个文物在当时的用途、意义和文化背景。',
    modelName: 'llm'
  },
  culturalInterpretation: {
    name: '文化解读',
    template: '你是{朝代}的一位民众。对于这个文物，你有什么个人认知或印象？它对你意味着什么？',
    modelName: 'llm'
  },
  artisticAnalysis: {
    name: '艺术分析',
    template: '你是{朝代}的一位工匠。请从技术和艺术角度分析这个文物的制作工艺和美学价值。',
    modelName: 'vllm' // 使用VLLM可以看到图片
  },
  modernContext: {
    name: '现代视角',
    template: '你是一位现代博物馆策展人。请从当代视角解释这个文物的历史价值和现实意义。',
    modelName: 'llm'
  }
}
```

---

### 6. 智能问答模块（Q&A Module）

#### 6.1 问答界面

**路径**：`/projects/:projectId/chat`

**功能**：
- 复用现有的 `RetrievalTesting` 组件
- 集成本体提示词
- 多模态问答（如果问题涉及图片）
- 对话历史
- 引用来源展示

**UI组件**：
```tsx
<ChatInterface>
  <ChatHeader>
    <ProjectSelector />
    <OntologyIndicator />
    <ChatSettings />
  </ChatHeader>

  <ChatMessages>
    {messages.map(msg => (
      <MessageBubble key={msg.id} role={msg.role}>
        <MessageContent>{msg.content}</MessageContent>

        {/* 引用的知识图谱节点 */}
        {msg.citations && (
          <MessageCitations>
            <CitationList>
              {msg.citations.map(citation => (
                <CitationItem key={citation.id}>
                  <CitationType>{citation.type}</CitationType>
                  <CitationText>{citation.text}</CitationText>
                  {citation.image_url && (
                    <CitationImage src={citation.image_url} />
                  )}
                </CitationItem>
              ))}
            </CitationList>
          </MessageCitations>
        )}

        {/* 思考过程 */}
        {msg.thinkingContent && (
          <ThinkingContent>{msg.thinkingContent}</ThinkingContent>
        )}
      </MessageBubble>
    ))}
  </ChatMessages>

  <ChatInput>
    <TextArea placeholder="请输入您的问题..." />
    <ImageUploadButton />
    <SendButton />
  </ChatInput>

  <QueryOptions>
    <QueryModeSelector />
    <TopKSelector />
    <ResponseTypeSelector />
  </QueryOptions>
</ChatInterface>
```

**API集成**：
```typescript
// 使用现有的查询API
POST /query
Body: {
  query: string
  mode: 'local' | 'global' | 'hybrid' | 'mix'
  ontology_id?: string // 自动注入当前项目本体
  conversation_history?: Message[]
  stream?: boolean
}

// 多模态查询（带图片）
POST /query
Body: {
  query: string
  image_url?: string // 如果上传了图片
  mode: 'mix'
  ontology_id: string
}
```

---

## 📐 页面结构

### 主路由布局

```typescript
routes = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      // 文化主题列表（首页）
      {
        index: true,
        element: <ProjectsList />
      },

      // 项目详情页
      {
        path: 'projects/:projectId',
        element: <ProjectLayout />,
        children: [
          { index: true, element: <Navigate to="documents" /> },
          { path: 'documents', element: <DocumentManager /> },
          { path: 'ontology', element: <OntologyEditor /> },
          { path: 'graph', element: <GraphViewer /> },
          { path: 'table', element: <TableView /> },
          { path: 'chat', element: <ChatInterface /> },
          { path: 'settings', element: <ProjectSettings /> }
        ]
      },

      // 全局页面
      {
        path: 'search',
        element: <GlobalSearch />
      },
      {
        path: 'settings',
        element: <GlobalSettings />
      }
    ]
  }
]
```

### 主布局组件

```tsx
<MainLayout>
  <TopNavigation>
    <Logo />
    <MainMenu>
      <MenuItem to="/">文化主题</MenuItem>
      <MenuItem to="/search">全局搜索</MenuItem>
      <MenuItem to="/settings">系统设置</MenuItem>
    </MainMenu>
    <UserMenu />
  </TopNavigation>

  <MainContent>
    <Outlet /> {/* 子路由渲染 */}
  </MainContent>

  <BottomNavigation>
    {/* 移动端底部导航 */}
    <NavItem to="/" icon={GridIcon}>主题</NavItem>
    <NavItem to="/projects/:projectId/graph" icon={NetworkIcon}>图谱</NavItem>
    <NavItem to="/projects/:projectId/chat" icon={MessageIcon}>问答</NavItem>
  </BottomNavigation>
</MainLayout>
```

### 项目布局组件

```tsx
<ProjectLayout>
  <ProjectHeader>
    <ProjectBreadcrumb>
      <BreadcrumbItem to="/">文化主题</BreadcrumbItem>
      <BreadcrumbItem>{project.name}</BreadcrumbItem>
    </ProjectBreadcrumb>

    <ProjectInfo>
      <ProjectCover src={project.cover_image} />
      <ProjectTitle>{project.name}</ProjectTitle>
      <ProjectDescription>{project.description}</ProjectDescription>
    </ProjectInfo>

    <ProjectActions>
      <ProjectSelector />
      <SettingsButton />
      <ShareButton />
    </ProjectActions>
  </ProjectHeader>

  <ProjectTabs>
    <TabList>
      <Tab to="documents">文档</Tab>
      <Tab to="ontology">本体</Tab>
      <Tab to="graph">图谱</Tab>
      <Tab to="table">表格</Tab>
      <Tab to="chat">问答</Tab>
    </TabList>

    <TabPanel>
      <Outlet /> {/* 子路由渲染 */}
    </TabPanel>
  </ProjectTabs>
</ProjectLayout>
```

---

## 🔄 数据流设计

### 状态管理（Zustand Stores）

#### 1. 项目状态（Project Store）

```typescript
interface ProjectStore {
  // 状态
  projects: Project[]
  currentProject: Project | null

  // 操作
  fetchProjects: () => Promise<void>
  createProject: (data: CreateProjectDto) => Promise<Project>
  updateProject: (id: string, data: UpdateProjectDto) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setCurrentProject: (project: Project) => void
  clearCurrentProject: () => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,

  fetchProjects: async () => {
    const response = await api.get('/projects/')
    set({ projects: response.data })
  },

  createProject: async (data) => {
    const response = await api.post('/projects/create', data)
    const newProject = response.data

    set(state => ({
      projects: [...state.projects, newProject]
    }))

    return newProject
  },

  setCurrentProject: (project) => {
    set({ currentProject: project })
  },

  clearCurrentProject: () => {
    set({ currentProject: null })
  }
}))
```

#### 2. 本体状态（Ontology Store）

```typescript
interface OntologyStore {
  // 状态
  ontologies: Record<string, OntologySpec> // projectId -> ontology
  currentOntology: OntologySpec | null

  // 操作
  fetchOntology: (projectId: string) => Promise<void>
  createOntology: (data: CreateOntologyDto) => Promise<OntologySpec>
  updateOntology: (ontologyId: string, data: UpdateOntologyDto) => Promise<void>
  validateOntology: (ontologyId: string) => Promise<ValidationResult>
  setCurrentOntology: (ontology: OntologySpec) => void
}

export const useOntologyStore = create<OntologyStore>((set, get) => ({
  ontologies: {},
  currentOntology: null,

  fetchOntology: async (projectId: string) => {
    // 先从项目获取ontology_id
    const project = await api.get(`/projects/${projectId}`)
    const ontologyId = project.data.ontology_id

    if (!ontologyId) {
      set({ currentOntology: null })
      return
    }

    const response = await api.get(`/ontology/${ontologyId}`)
    const ontology = response.data

    set(state => ({
      ontologies: { ...state.ontologies, [projectId]: ontology },
      currentOntology: ontology
    }))
  },

  createOntology: async (data) => {
    const response = await api.post('/ontology/create', data)
    const ontology = response.data

    set(state => ({
      ontologies: { ...state.ontologies, [data.project_id]: ontology },
      currentOntology: ontology
    }))

    return ontology
  }
}))
```

#### 3. 图谱状态（Graph Store）

```typescript
interface GraphStore {
  // 状态
  nodes: LightragNodeType[]
  edges: LightragEdgeType[]
  selectedNodes: string[]
  filteredNodes: string[] // 筛选后的节点

  // 操作
  fetchGraph: (projectId: string) => Promise<void>
  updateNode: (nodeId: string, data: Partial<Node>) => Promise<void>
  deleteNode: (nodeId: string) => Promise<void>
  selectNode: (nodeId: string) => void
  selectMultipleNodes: (nodeIds: string[]) => void
  clearSelection: () => void
  filterByType: (types: string[]) => void
  searchNodes: (query: string) => void
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodes: [],
  filteredNodes: [],

  fetchGraph: async (projectId: string) => {
    const response = await api.get(`/graphs/${projectId}`)
    const { nodes, edges } = response.data

    set({
      nodes,
      edges,
      filteredNodes: nodes.map(n => n.id)
    })
  },

  updateNode: async (nodeId: string, data) => {
    const response = await api.put(`/entities/${nodeId}`, data)

    set(state => ({
      nodes: state.nodes.map(node =>
        node.id === nodeId
          ? { ...node, ...response.data }
          : node
      )
    }))
  },

  selectNode: (nodeId: string) => {
    set({ selectedNodes: [nodeId] })
  }
}))
```

#### 4. UI状态（UI Store）

```typescript
interface UIStore {
  // 主题
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void

  // 视图模式
  viewMode: 'graph' | 'table'
  setViewMode: (mode: 'graph' | 'table') => void

  // 对话框状态
  dialogs: {
    attributeEdit: boolean
    ontologyEditor: boolean
    projectSettings: boolean
  }
  openDialog: (name: string) => void
  closeDialog: (name: string) => void

  // 加载状态
  loading: boolean
  setLoading: (loading: boolean) => void

  // Toast通知
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'light',
  viewMode: 'graph',
  dialogs: {
    attributeEdit: false,
    ontologyEditor: false,
    projectSettings: false
  },
  loading: false,
  toasts: [],

  setTheme: (theme) => set({ theme }),
  setViewMode: (mode) => set({ viewMode: mode }),
  openDialog: (name) => set(state => ({
    dialogs: { ...state.dialogs, [name]: true }
  })),
  closeDialog: (name) => set(state => ({
    dialogs: { ...state.dialogs, [name]: false }
  })),
  setLoading: (loading) => set({ loading }),
  addToast: (toast) => set(state => ({
    toasts: [...state.toasts, { ...toast, id: generateId() }]
  })),
  removeToast: (id) => set(state => ({
    toasts: state.toasts.filter(t => t.id !== id)
  }))
}))
```

---

## 🎨 组件设计

### 核心组件列表

#### 1. 布局组件

| 组件名 | 路径 | 说明 |
|-------|------|------|
| `MainLayout` | `@/components/layout/MainLayout` | 主布局 |
| `ProjectLayout` | `@/components/layout/ProjectLayout` | 项目布局 |
| `TopNavigation` | `@/components/layout/TopNavigation` | 顶部导航 |
| `ProjectTabs` | `@/components/layout/ProjectTabs` | 项目标签页 |

#### 2. 项目管理组件

| 组件名 | 路径 | 说明 |
|-------|------|------|
| `ProjectsList` | `@/components/projects/ProjectsList` | 项目列表 |
| `ProjectCard` | `@/components/projects/ProjectCard` | 项目卡片 |
| `CreateProjectDialog` | `@/components/projects/CreateProjectDialog` | 创建项目对话框 |
| `ProjectSelector` | `@/components/projects/ProjectSelector` | 项目选择器 |

#### 3. 本体管理组件

| 组件名 | 路径 | 说明 |
|-------|------|------|
| `OntologyEditor` | `@/components/ontology/OntologyEditor` | 本体编辑器 |
| `EntityTypeList` | `@/components/ontology/EntityTypeList` | 实体类型列表 |
| `RelationTypeList` | `@/components/ontology/RelationTypeList` | 关系类型列表 |
| `AttributeDefinitionForm` | `@/components/ontology/AttributeDefinitionForm` | 属性定义表单 |
| `OntologyValidator` | `@/components/ontology/OntologyValidator` | 本体验证器 |

#### 4. 图谱可视化组件（扩展现有）

| 组件名 | 路径 | 说明 |
|-------|------|------|
| `GraphViewer` | `@/features/GraphViewer` | 图谱查看器（已有，需扩展） |
| `ImageNodeRenderer` | `@/components/graph/ImageNodeRenderer` | 图片节点渲染器（新增） |
| `NodePropertiesPanel` | `@/components/graph/NodePropertiesPanel` | 节点属性面板（新增） |
| `GraphFilters` | `@/components/graph/GraphFilters` | 图谱筛选器（新增） |

#### 5. 表格视图组件

| 组件名 | 路径 | 说明 |
|-------|------|------|
| `TableView` | `@/components/table/TableView` | 表格视图 |
| `DataTable` | `@/components/table/DataTable` | 数据表格 |
| `TableFilters` | `@/components/table/TableFilters` | 表格筛选器 |
| `AttributePreview` | `@/components/table/AttributePreview` | 属性预览 |
| `ImageColumn` | `@/components/table/ImageColumn` | 图片列 |

#### 6. 属性编辑组件

| 组件名 | 路径 | 说明 |
|-------|------|------|
| `AttributeEditDialog` | `@/components/attributes/AttributeEditDialog` | 属性编辑对话框 |
| `AttributeList` | `@/components/attributes/AttributeList` | 属性列表 |
| `AddAttributeForm` | `@/components/attributes/AddAttributeForm` | 添加属性表单 |
| `LLMEnrichmentPanel` | `@/components/attributes/LLMEnrichmentPanel` | LLM属性生成面板 |
| `PromptTemplateSelector` | `@/components/attributes/PromptTemplateSelector` | 提示词模板选择器 |
| `ModelSelector` | `@/components/attributes/ModelSelector` | 模型选择器（LLM/VLLM） |

#### 7. 多模态组件

| 组件名 | 路径 | 说明 |
|-------|------|------|
| `ImageUploader` | `@/components/multimodal/ImageUploader` | 图片上传器 |
| `ImageGallery` | `@/components/multimodal/ImageGallery` | 图片画廊 |
| `ImageViewer` | `@/components/multimodal/ImageViewer` | 图片查看器 |
| `DocumentPreview` | `@/components/multimodal/DocumentPreview` | 文档预览 |
| `ParseResultViewer` | `@/components/multimodal/ParseResultViewer` | 解析结果查看器 |

#### 8. 问答组件（扩展现有）

| 组件名 | 路径 | 说明 |
|-------|------|------|
| `ChatInterface` | `@/features/RetrievalTesting` | 问答界面（已有，需扩展） |
| `MessageBubble` | `@/components/chat/MessageBubble` | 消息气泡 |
| `CitationViewer` | `@/components/chat/CitationViewer` | 引用查看器 |
| `MultimodalInput` | `@/components/chat/MultimodalInput` | 多模态输入（支持图片） |

---

## 🔌 API集成

### API客户端封装

扩展现有的 `lightrag.ts` API文件，添加新的API端点：

```typescript
// @/api/lightrag.ts 扩展

// ==================== 项目管理API ====================

export const createProject = async (data: {
  name: string
  description: string
  tags?: string[]
  cover_image?: string
}): Promise<Project> => {
  const response = await api.post('/projects/create', data)
  return response.data
}

export const getProject = async (projectId: string): Promise<Project> => {
  const response = await api.get(`/projects/${projectId}`)
  return response.data
}

export const listProjects = async (): Promise<Project[]> => {
  const response = await api.get('/projects/')
  return response.data
}

export const updateProject = async (
  projectId: string,
  data: Partial<Project>
): Promise<void> => {
  await api.put(`/projects/${projectId}`, data)
}

export const deleteProject = async (projectId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}`)
}

export const setProjectOntology = async (
  projectId: string,
  ontologyId: string
): Promise<void> => {
  await api.post(`/projects/${projectId}/set-ontology`, `"${ontologyId}"`, {
    headers: { 'Content-Type': 'application/json' }
  })
}

// ==================== 本体管理API ====================

export const createOntology = async (data: {
  project_id: string
  name: string
  description: string
  language: 'zh' | 'en'
  entity_types: string[]
  relation_types: string[]
  entity_attributes: Record<string, AttributeDefinition>
  relation_attributes: Record<string, AttributeDefinition>
}): Promise<OntologySpec> => {
  const response = await api.post('/ontology/create', data)
  return response.data
}

export const getOntology = async (ontologyId: string): Promise<OntologySpec> => {
  const response = await api.get(`/ontology/${ontologyId}`)
  return response.data
}

export const getProjectOntology = async (projectId: string): Promise<OntologySpec> => {
  const response = await api.get(`/ontology/project/${projectId}`)
  return response.data
}

export const updateOntology = async (
  ontologyId: string,
  data: Partial<OntologySpec>
): Promise<void> => {
  await api.put(`/ontology/${ontologyId}`, data)
}

export const deleteOntology = async (ontologyId: string): Promise<void> => {
  await api.delete(`/ontology/${ontologyId}`)
}

export const validateOntology = async (
  ontologyId: string
): Promise<ValidationResult> => {
  const response = await api.get(`/ontology/${ontologyId}/validate`)
  return response.data
}

// ==================== 实体丰富API ====================

export const enrichEntity = async (data: {
  entity_name: string
  ontology_id: string
  attribute_name?: string
  prompt?: string
  model?: 'llm' | 'vllm'
  image_url?: string
}): Promise<EnrichmentResult> => {
  const response = await api.post('/enrichment/entity', data)
  return response.data
}

export const enrichEntities = async (data: {
  entity_names: string[]
  ontology_id: string
  attribute_name?: string
  prompt?: string
}): Promise<EnrichmentResult[]> => {
  const response = await api.post('/enrichment/entities', data)
  return response.data
}

export const enrichEntityInBackground = async (data: {
  entity_name: string
  ontology_id: string
}): Promise<{ task_id: string }> => {
  const response = await api.post('/enrichment/entity/background', data)
  return response.data
}

export const getEnrichmentStatus = async (taskId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: any
}> => {
  const response = await api.get(`/enrichment/status/${taskId}`)
  return response.data
}

// ==================== 图谱查询API ====================

export const getGraph = async (projectId: string): Promise<{
  nodes: LightragNodeType[]
  edges: LightragEdgeType[]
}> => {
  const response = await api.get(`/graphs/${projectId}`)
  return response.data
}

export const getNode = async (nodeId: string): Promise<LightragNodeType> => {
  const response = await api.get(`/entities/${nodeId}`)
  return response.data
}

export const updateNode = async (
  nodeId: string,
  data: Partial<LightragNodeType>
): Promise<LightragNodeType> => {
  const response = await api.put(`/entities/${nodeId}`, data)
  return response.data
}

export const deleteNode = async (nodeId: string): Promise<void> => {
  await api.delete(`/entities/${nodeId}`)
}

export const searchNodes = async (params: {
  projectId: string
  query?: string
  entityTypes?: string[]
  attributes?: Record<string, any>
  limit?: number
}): Promise<LightragNodeType[]> => {
  const response = await api.get('/entities/search', { params })
  return response.data
}

// ==================== 多模态查询API ====================

export const queryWithImage = async (data: {
  query: string
  image_url?: string
  mode: QueryMode
  ontology_id?: string
  conversation_history?: Message[]
  stream?: boolean
}): Promise<QueryResponse> => {
  const response = await api.post('/query', data)
  return response.data
}
```

---

## 🖼 多模态支持

### 图片存储策略

**方案1：Base64编码**
- ✅ 简单，无需额外服务
- ✅ 适合小图片
- ❌ 数据库体积大
- ❌ 性能较差

**方案2：对象存储（推荐）**
- ✅ 性能好
- ✅ 支持CDN
- ✅ 可以缓存
- ❌ 需要额外配置

```typescript
// 图片上传流程
const uploadImage = async (file: File): Promise<string> => {
  // 1. 上传到对象存储（或本地存储）
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  // 2. 返回图片URL
  return response.data.url
}

// 图片使用
const nodeWithImage = {
  entity_name: '青铜鼎',
  entity_type: '文物',
  properties: {
    image_url: 'https://storage.example.com/images/bronze-ding.jpg',
    description: '商代青铜鼎，用于祭祀...'
  }
}
```

### 图片作为节点 vs 图片作为属性

#### 方案1：图片作为节点属性（推荐）

```typescript
// 文物节点包含图片属性
const artifactNode = {
  id: 'artifact_001',
  entity_name: '四羊方尊',
  entity_type: '青铜器',
  properties: {
    image_url: 'https://storage.example.com/images/siyang-fangzun.jpg',
    period: '商代晚期',
    material: '青铜',
    dimensions: '高58.3cm',
    description: '商代晚期青铜礼器，现存于中国国家博物馆...',
    excavation_location: '湖南宁月'
  }
}
```

#### 方案2：图片作为独立节点

```typescript
// 图片节点
const imageNode = {
  id: 'image_001',
  entity_name: '四羊方尊照片',
  entity_type: 'Image',
  properties: {
    url: 'https://storage.example.com/images/siyang-fangzun.jpg',
    format: 'jpg',
    width: 1920,
    height: 1080,
    file_size: '2.3MB'
  }
}

// 文物节点
const artifactNode = {
  id: 'artifact_001',
  entity_name: '四羊方尊',
  entity_type: '青铜器',
  properties: {
    period: '商代晚期'
  }
}

// 关系：文物 -> HAS_IMAGE -> 图片
const relationEdge = {
  id: 'rel_001',
  source: 'artifact_001',
  target: 'image_001',
  relation_type: 'HAS_IMAGE',
  properties: {}
}
```

**推荐方案1**，因为：
- 更简洁，节点数更少
- 更符合用户的认知习惯
- 查询和展示更直观

### 图片节点的可视化

```tsx
// 在图谱中渲染图片节点
const ImageNodeRenderer = ({ node }: { node: LightragNodeType }) => {
  const imageUrl = node.properties.image_url

  return (
    <g>
      {/* 图片背景 */}
      <image
        href={imageUrl}
        x={-20}
        y={-20}
        width={40}
        height={40}
        clipPath="circle(20px)"
      />

      {/* 节点边框 */}
      <circle
        r={20}
        fill="none"
        stroke={getEntityTypeColor(node.labels[0])}
        strokeWidth={2}
      />

      {/* 节点标签 */}
      <text y={30} textAnchor="middle" fontSize={12}>
        {node.properties.entity_name}
      </text>
    </g>
  )
}

// 在表格中渲染图片
const ImageColumn = ({ url }: { url: string }) => {
  return (
    <div className="w-16 h-16">
      <img
        src={url}
        alt="节点图片"
        className="w-full h-full object-cover rounded"
        loading="lazy"
      />
    </div>
  )
}
```

---

## 🗄 状态管理

### Store关系图

```
┌─────────────────┐
│  ProjectStore   │
│  - projects     │────┐
│  - currentProject│   │
└─────────────────┘   │
                      │
                      ▼
┌─────────────────┐   │    ┌─────────────────┐
│  OntologyStore  │◄──┴────│  GraphStore     │
│  - ontologies   │        │  - nodes        │
│  - current      │        │  - edges        │
└─────────────────┘        │  - selected     │
       │                   └─────────────────┘
       │
       ▼
┌─────────────────┐
│  UIStore        │
│  - theme        │
│  - viewMode     │
│  - dialogs      │
│  - toasts       │
└─────────────────┘
```

### 数据流示例

**场景：用户切换项目**

```
1. 用户点击项目卡片
   ↓
2. ProjectStore.setCurrentProject(project)
   ↓
3. 自动触发：
   - OntologyStore.fetchOntology(projectId)
   - GraphStore.fetchGraph(projectId)
   ↓
4. UI更新：
   - 显示项目名称、描述
   - 显示本体信息
   - 加载图谱数据
   - 更新URL路由
```

**场景：用户添加节点属性**

```
1. 用户点击"添加属性"按钮
   ↓
2. UIStore.openDialog('attributeEdit')
   ↓
3. 用户填写属性名称、选择LLM、输入提示词
   ↓
4. 点击"生成"按钮
   ↓
5. 调用 API：enrichEntity()
   ↓
6. 显示生成进度
   ↓
7. 生成完成后，用户点击"保存"
   ↓
8. 调用 API：updateNode()
   ↓
9. GraphStore.updateNode()
   ↓
10. UI更新：
    - 图谱节点属性更新
    - 表格行更新
    - 显示成功提示
```

---

## 🎨 样式与主题

### 颜色系统

```css
/* brand colors - 品牌色 */
--brand-primary: #8B5CF6; /* 紫色 - 文化底蕴 */
--brand-secondary: #EC4899; /* 粉色 - 现代 */

/* semantic colors - 语义色 */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;

/* entity type colors - 实体类型颜色 */
--entity-color-artifact: #8B5CF6; /* 文物 - 紫色 */
--entity-color-person: #3B82F6; /* 人物 - 蓝色 */
--entity-color-location: #10B981; /* 地点 - 绿色 */
--entity-color-event: #F59E0B; /* 事件 - 橙色 */
--entity-color-concept: #EC4899; /* 概念 - 粉色 */
--entity-color-other: #6B7280; /* 其他 - 灰色 */

/* relation type colors - 关系类型颜色 */
--relation-color-causal: #EF4444; /* 因果关系 - 红色 */
--relation-color-temporal: #3B82F6; /* 时间关系 - 蓝色 */
--relation-color-spatial: #10B981; /* 空间关系 - 绿色 */
--relation-color-hierarchical: #8B5CF6; /* 层级关系 - 紫色 */
```

### 组件样式规范

```tsx
// 卡片组件
const cardStyles = cva(
  'rounded-lg border bg-white shadow-sm transition-all',
  {
    variants: {
      variant: {
        default: 'border-gray-200',
        outlined: 'border-2 border-brand-primary',
        elevated: 'shadow-md'
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-md hover:border-brand-primary',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      interactive: false
    }
  }
)

// 按钮组件
const buttonStyles = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-brand-primary text-white hover:bg-brand-primary/90',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        ghost: 'hover:bg-gray-100',
        danger: 'bg-error text-white hover:bg-error/90'
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
)
```

### 暗色主题支持

```tsx
// tailwind.config.js
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 明确定义暗色主题的颜色
        dark: {
          bg: '#0F172A',
          surface: '#1E293B',
          border: '#334155',
          text: '#F1F5F9',
          muted: '#94A3B8'
        }
      }
    }
  }
}

// 在组件中使用
<div className="bg-white dark:bg-dark-bg dark:text-dark-text">
  内容
</div>
```

---

## 📅 开发计划

### 阶段1：基础框架（2周）

**Week 1: 项目搭建与路由**
- ✅ 搭建项目结构
- ✅ 配置路由系统
- ✅ 创建布局组件
- ✅ 集成Zustand stores

**Week 2: API集成**
- ✅ 封装API客户端
- ✅ 实现项目管理API
- ✅ 实现本体管理API
- ✅ 实现图谱查询API

### 阶段2：核心功能（4周）

**Week 3-4: 项目与本体管理**
- 📝 项目列表页面
- 📝 项目创建/编辑对话框
- 📝 本体编辑器
- 📝 实体/关系类型管理

**Week 5-6: 图谱可视化**
- 📝 扩展现有GraphViewer
- 📝 实现图片节点渲染
- 📝 实现节点属性面板
- 📝 实现图谱筛选功能

### 阶段3：高级功能（4周）

**Week 7-8: 表格视图**
- 📝 数据表格组件
- 📝 表格筛选器
- 📝 表格排序
- 📝 批量操作

**Week 9-10: 属性编辑与丰富**
- 📝 属性编辑对话框
- 📝 LLM/VLLM属性生成
- 📝 提示词模板管理
- 📝 批量属性操作

### 阶段4：多模态支持（3周）

**Week 11-12: 文档管理**
- 📝 多模态文档上传
- 📝 解析结果展示
- 📝 图片提取与预览
- 📝 文档预览组件

**Week 13: 多模态查询**
- 📝 图片上传到查询
- 📝 VLLM查询集成
- 📝 多模态结果展示

### 阶段5：优化与发布（2周）

**Week 14: 性能优化**
- 📝 代码分割
- 📝 图片懒加载
- 📝 虚拟滚动（长列表）
- 📝 缓存策略

**Week 15: 测试与发布**
- 📝 单元测试
- 📝 集成测试
- 📝 用户文档
- 📝 部署上线

---

## 📚 附录

### A. 类型定义文件

```typescript
// @/types/project.ts
export interface Project {
  project_id: string
  name: string
  description: string
  workspace: string
  ontology_id?: string
  created_at: string
  updated_at: string
  status: 'active' | 'archived'
  cover_image?: string
  tags?: string[]
  stats?: {
    document_count: number
    entity_count: number
    relation_count: number
    last_updated: string
  }
}

export interface CreateProjectDto {
  name: string
  description: string
  tags?: string[]
  cover_image?: string
}

export interface UpdateProjectDto {
  name?: string
  description?: string
  tags?: string[]
  cover_image?: string
  status?: 'active' | 'archived'
}
```

```typescript
// @/types/ontology.ts
export interface OntologySpec {
  ontology_id: string
  project_id: string
  name: string
  description: string
  version: string
  language: 'zh' | 'en'
  entity_types: string[]
  relation_types: string[]
  entity_attributes: Record<string, AttributeDefinition>
  relation_attributes: Record<string, AttributeDefinition>
  normalization_rules?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface AttributeDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'image' | 'array'
  required: boolean
  description: string
  enum_values?: string[]
  min_value?: number
  max_value?: number
}

export interface ValidationResult {
  is_valid: boolean
  error_message?: string
  warnings?: string[]
}
```

```typescript
// @/types/entity.ts
export interface Entity {
  id: string
  entity_name: string
  entity_type: string
  description?: string
  image_url?: string
  attributes: EntityAttribute[]
  created_at: string
  updated_at: string
}

export interface EntityAttribute {
  name: string
  value: any
  type: string
  description?: string
}

export interface EnrichmentResult {
  entity_name: string
  status: 'completed' | 'failed' | 'pending'
  original_data?: any
  enriched_data?: {
    [key: string]: any
  }
  error_message?: string
  processing_time?: number
}

export interface EnrichmentPrompt {
  name: string
  description: string
  template: string
  model: 'llm' | 'vllm'
  variables?: string[]
}
```

### B. 环境变量配置

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:9621
VITE_WS_BASE_URL=ws://localhost:9621
VITE_ENABLE_DEV_TOOLS=true

# .env.production
VITE_API_BASE_URL=https://api.example.com
VITE_WS_BASE_URL=wss://api.example.com
VITE_ENABLE_DEV_TOOLS=false
```

### C. 推荐的VS Code插件

- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Tailwind CSS IntelliSense** - Tailwind智能提示
- **TypeScript Vue Plugin (Volar)** - TypeScript支持
- **Import Cost** - 显示导入包的大小
- **Code Spell Checker** - 拼写检查

### D. 参考资源

- [React 19 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [Sigma.js 文档](https://www.sigmajs.org/)
- [Radix UI 文档](https://www.radix-ui.com/)
- [LightRAG API文档](http://localhost:9621/docs)

---

## 🎯 总结

这个设计说明文档详细描述了**文化基因库**前端系统的架构和实现方案。基于现有的LightRAG WebUI，我们：

1. ✅ **复用了70%的现有代码**：图谱查看器、文档管理、查询界面
2. ✅ **新增了核心功能**：项目管理、本体管理、表格视图、属性编辑
3. ✅ **支持多模态**：图片节点、图片上传、VLLM查询
4. ✅ **优化的用户体验**：美观的UI、流畅的交互、智能的属性生成

**预计开发时间**：15周
**技术难度**：中等
**可维护性**：高（模块化设计）
**扩展性**：强（基于组件和插件）

---

**下一步**：开始实施阶段1 - 基础框架搭建
