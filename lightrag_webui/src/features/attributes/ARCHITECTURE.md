# 属性生成界面架构图

## 组件层次结构

```
┌─────────────────────────────────────────────────────────────────┐
│                     AttributeEditDialog                          │
│                  (主对话框 - 状态容器)                            │
│                                                                   │
│  Props:                                                          │
│  - isOpen: boolean                                               │
│  - onClose: () => void                                           │
│  - entity: EntityData                                            │
│  - onSave: (name, value) => Promise<void>                       │
│  - onDelete: (name) => Promise<void>                            │
│  - onGenerate: (config) => Promise<Result>                      │
│  - ontologyId?: string                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Tabs (标签页)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Manual Tab   │    │   LLM Tab     │    │   VLLM Tab    │
│  (手动添加)    │    │  (文本生成)    │    │  (视觉生成)    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        │                     ▼                     ▼
        │         ┌───────────────────────┐    ┌───────────────────────┐
        │         │  LLMEnrichmentPanel   │    │  LLMEnrichmentPanel   │
        │         │  (AI 生成面板)         │    │  (AI 生成面板)         │
        │         └───────────────────────┘    └───────────────────────┘
        │                     │                     │
        │                     ▼                     ▼
        │         ┌───────────────────────┐    ┌───────────────────────┐
        │         │ PromptTemplateSelector│    │ PromptTemplateSelector│
        │         │  (模板选择器)          │    │  (模板选择器)          │
        │         └───────────────────────┘    └───────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│      属性列表 + 添加表单              │
│  ┌─────────────────────────────┐   │
│  │  属性1: value               │   │
│  │  属性2: value               │   │
│  │  ...                       │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  属性名: [________]         │   │
│  │  属性值: [________]         │   │
│  │  [添加属性]                 │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 数据流向图

```
用户交互                组件状态                API 调用                后端
    │                     │                       │                       │
    ├─点击"编辑属性"       │                       │                       │
    │                     ├─setIsOpen(true)       │                       │
    │                     │                       │                       │
    ├─切换到"LLM生成"      │                       │                       │
    │                     ├─setActiveTab('llm')   │                       │
    │                     │                       │                       │
    ├─选择模板             │                       │                       │
    │                     ├─setSelectedTemplate() │                       │
    │                     │                       │                       │
    ├─填写变量/属性名      │                       │                       │
    │                     ├─setVariableValues()   │                       │
    │                     ├─setAttributeName()    │                       │
    │                     │                       │                       │
    ├─点击"生成属性"       │                       │                       │
    │                     ├─setIsGenerating(true) │                       │
    │                     │                       │                       │
    │                     ├─onGenerate(config) ───┼──POST /enrichment/───┼──►
    │                     │                       │   generate            │
    │                     │                       │◄──                    │
    │                     │                       │   {                  │
    │                     │                       │     value,            │
    │                     │                       │     processing_time   │
    │                     │                       │   }                  │
    │                     ├─setGeneratedResult()  │                       │
    │                     ├─setIsGenerating(false)│                       │
    │                     │                       │                       │
    ├─查看生成结果         │                       │                       │
    │                     │  (显示预览)            │                       │
    │                     │                       │                       │
    ├─点击"保存到实体"     │                       │                       │
    │                     ├─setIsSaving(true)     │                       │
    │                     │                       │                       │
    │                     ├─onSave(name, value) ───┼──PATCH /entities/───┼──►
    │                     │                       │   {id}/attributes     │
    │                     │                       │◄──                    │
    │                     │                       │   200 OK              │
    │                     ├─更新 entity.attributes │                       │
    │                     ├─setIsSaving(false)    │                       │
    │                     ├─切换回 Manual Tab     │                       │
    │                     │                       │                       │
    └─关闭对话框           │                       │                       │
                         │                       │                       │
```

## 状态管理图

```
┌─────────────────────────────────────────────────────────────┐
│                    AttributeEditDialog                       │
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Local State                                          │    │
│  │                                                      │    │
│  │  activeTab: 'manual' | 'llm' | 'vllm'              │    │
│  │  ├─ Controls which tab content to show              │    │
│  │                                                      │    │
│  │  Manual Tab State:                                   │    │
│  │  ├─ manualAttributeName: string                      │    │
│  │  └─ manualAttributeValue: string                     │    │
│  │                                                      │    │
│  │  AI Generation State (LLM/VLLM):                     │    │
│  │  ├─ attributeName: string                            │    │
│  │  ├─ selectedTemplate: PromptTemplate | undefined    │    │
│  │  ├─ variableValues: TemplateVariableValues          │    │
│  │  ├─ customPrompt: string                             │    │
│  │  ├─ isGenerating: boolean                           │    │
│  │  ├─ isSaving: boolean                               │    │
│  │  ├─ generatedResult: GenerationResult | null        │    │
│  │  └─ error: string | null                            │    │
│  └────────────────────────────────────────────────────┘    │
│                              │                               │
│                              ▼                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Props (External State)                              │    │
│  │                                                      │    │
│  │  entity: EntityData  [Input]                         │    │
│  │  ├─ entity_name: string                              │    │
│  │  ├─ entity_type: string                              │    │
│  │  ├─ description: string                              │    │
│  │  ├─ image_url: string (VLLM required)                │    │
│  │  └─ attributes: Record<string, any>                  │    │
│  │                                                      │    │
│  │  onSave: (name, value) => Promise<void>  [Callback] │    │
│  │  onDelete: (name) => Promise<void>  [Callback]      │    │
│  │  onGenerate: (config) => Promise<Result> [Callback] │    │
│  │  ontologyId: string  [Optional Input]                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 用户旅程图

### 旅程 1: 手动添加属性

```
开始
  │
  ├─ 用户点击实体上的"编辑属性"按钮
  │   └─ 对话框打开，显示 Manual Tab
  │
  ├─ 查看当前属性列表
  │   └─ 显示现有属性（如果有的话）
  │
  ├─ 输入属性名称
  │   └─ 验证：不能为空
  │
  ├─ 输入属性值
  │   └─ 验证：不能为空
  │
  ├─ 点击"添加属性"
  │   ├─ 调用 onSave 回调
  │   ├─ 显示加载状态
  │   ├─ 成功：清空输入框，属性出现在列表中
  │   └─ 失败：显示错误消息
  │
  ├─ （可选）删除现有属性
  │   ├─ 点击删除按钮
  │   ├─ 确认对话框
  │   └─ 属性从列表移除
  │
  └─ 点击"关闭"
      └─ 对话框关闭
```

### 旅程 2: LLM 生成属性

```
开始
  │
  ├─ 对话框打开
  │
  ├─ 切换到"LLM生成"标签
  │   └─ 显示 LLMEnrichmentPanel
  │
  ├─ 查看实体信息
  │   ├─ 实体名称
  │   ├─ 实体类型
  │   └─ 当前描述
  │
  ├─ 输入属性名称
  │   └─ 例如：historical_significance
  │
  ├─ 选择提示词模板
  │   ├─ 浏览预设模板（4个）
  │   ├─ 查看模板描述和示例
  │   ├─ 点击选择模板
  │   └─ （可选）填写模板变量（如朝代）
  │
  ├─ 或者选择"自定义提示词"
  │   └─ 在文本框中输入自定义提示词
  │
  ├─ 点击"生成属性"
  │   ├─ 显示加载状态
  │   ├─ 调用后端 API
  │   ├─ 等待响应
  │   └─ 显示结果或错误
  │
  ├─ 查看生成结果
  │   ├─ 属性名称
  │   ├─ 生成的值
  │   ├─ 处理耗时
  │   └─ 预览内容
  │
  ├─ 决策点
  │   ├─ 满意？
  │   │   ├─ 是：点击"保存到实体"
  │   │   │   ├─ 调用 onSave
  │   │   │   ├─ 显示加载状态
  │   │   │   └─ 成功后切换回 Manual Tab
  │   │   └─ 否：点击"重新生成"
  │   │       └─ 返回生成步骤
  │   └─
  │
  └─ 点击"关闭"或返回 Manual Tab
```

### 旅程 3: VLLM 图片分析

```
开始
  │
  ├─ 对话框打开
  │
  ├─ 切换到"VLLM生成"标签
  │   └─ 显示 VLLMEnrichmentPanel
  │
  ├─ 检查图片可用性
  │   ├─ 有 image_url？
  │   │   ├─ 是：继续
  │   │   └─ 否：显示"未提供图片"提示
  │   │
  │
  ├─ 输入属性名称
  │   └─ 例如：visual_analysis
  │
  ├─ 选择"视觉文物分析"模板
  │   └─ VLLM 专用模板
  │
  ├─ 点击"生成属性"
  │   ├─ 显示加载状态
  │   ├─ 发送 image_url 到后端
  │   ├─ VLLM 模型查看图片
  │   ├─ 提取视觉特征
  │   └─ 返回分析结果
  │
  ├─ 查看视觉分析结果
  │   ├─ 造型特点
  │   ├─ 色彩搭配
  │   ├─ 纹饰细节
  │   ├─ 工艺判断
  │   └─ 保存状况
  │
  ├─ 保存结果
  │   └─ 点击"保存到实体"
  │
  └─ 完成
```

## 组件通信图

```
┌──────────────────┐
│  Parent Component│
│  (e.g., GraphView)│
└────────┬─────────┘
         │
         │ 1. 传入 props
         │    - entity: EntityData
         │    - onSave: callback
         │    - onDelete: callback
         │    - onGenerate: callback
         ▼
┌──────────────────────────────┐
│   AttributeEditDialog        │
│   (管理状态和 UI)             │
└────────┬─────────────────────┘
         │
         │ 2. 渲染子组件
         │    - 传入处理后的 props
         ▼
┌──────────────────────────────┐
│   LLMEnrichmentPanel         │
│   (AI 生成逻辑)               │
└────────┬─────────────────────┘
         │
         │ 3. 渲染子组件
         │    - 传入选择逻辑
         ▼
┌──────────────────────────────┐
│   PromptTemplateSelector      │
│   (模板选择)                   │
└────────┬─────────────────────┘
         │
         │ 4. 用户交互
         │    - 选择模板
         │    - 填写变量
         ▼
┌──────────────────────────────┐
│   回调链                      │
│                              │
│   onTemplateSelect ──────────┼──► 更新 state
│   onVariableChange ──────────┼──► 更新 state
│   onGenerate ────────────────┼──► 调用父组件的 onGenerate
│                              │
└──────────────────────────────┘
         │
         │ 5. API 调用
         ▼
┌──────────────────────────────┐
│   API Layer                  │
│   (enrichment.ts)            │
│                              │
│   - generateAttributeValue() │
│   - updateEntityAttributes() │
│   - deleteEntityAttribute()  │
└────────┬─────────────────────┘
         │
         │ 6. HTTP 请求
         ▼
┌──────────────────────────────┐
│   Backend API                │
│                              │
│   POST /api/enrichment/...   │
└──────────────────────────────┘
```

## 类型关系图

```
┌─────────────────────────────────────────────────────────────┐
│                      Core Types                              │
│                                                               │
│  EntityData ──────────────────────────────────────┐         │
│  ├─ entity_name: string                           │         │
│  ├─ entity_type: string                           │         │
│  ├─ description?: string                          │         │
│  ├─ image_url?: string   ─────────────────────┐   │         │
│  └─ attributes?: Record<string, any>           │   │         │
│                                                │   │         │
│  EnrichmentModelType ──────────────────────┐   │   │         │
│  'llm' | 'vllm'                            │   │   │         │
│                                            │   │   │         │
│  PromptTemplate ───────────────────────┐   │   │   │         │
│  ├─ id: string                         │   │   │   │         │
│  ├─ name: string                       │   │   │   │         │
│  ├─ description: string                │   │   │   │         │
│  ├─ category: Category ◄──────────────┼───┼───┼───┼────┐   │
│  ├─ model_type: EnrichmentModelType ◄──┼───┼───┘   │    │   │
│  ├─ template: string                   │   │       │    │   │
│  ├─ variables?: TemplateVariable[]     │   │       │    │   │
│  └─ language: 'zh' | 'en'              │   │       │    │   │
│                                         │   │       │    │   │
│  GenerationResult ◄────────────────────┼───┘       │    │   │
│  ├─ success: boolean                   │           │    │   │
│  ├─ attribute_name: string             │           │    │   │
│  ├─ value: any                          │           │    │   │
│  ├─ error?: string                      │           │    │   │
│  └─ processing_time?: number            │           │    │   │
│                                                  │    │   │
│  Category                                        │    │   │
│  'history' | 'culture' | 'art' | 'modern' | 'custom' │   │
│                                                       │   │
│  TemplateVariable                                    │   │
│  ├─ name: string                                     │   │
│  ├─ type: 'text' | 'select' | ...                   │   │
│  ├─ description: string                             │   │
│  └─ required: boolean                               │   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

## API 端点映射

```
Frontend Component               Backend Endpoint                Method
────────────────────────────────────────────────────────────────────

PromptTemplateSelector      →   (无需端点 - 本地数据)
                                  - PRESET_TEMPLATES

LLMEnrichmentPanel          →   POST /api/enrichment/generate
                                  {
                                    entity_name,
                                    model_type,
                                    prompt,
                                    attribute_name,
                                    image_url?,
                                    ontology_id?
                                  }

AttributeEditDialog
  ├─ onSave                 →   PATCH /api/graph/nodes/{id}
                                  { attributes }

  ├─ onDelete               →   DELETE /api/graph/nodes/{id}
                                        /attributes/{name}

  └─ (可选) 使用现有的     →   POST /api/enrichment/entity
      enrichment API            {
                                  entity_name,
                                  ontology_id?
                                }
```

## 样式主题映射

```
Color Categories           Usage                      CSS Classes
────────────────────────────────────────────────────────────────────

Primary (Action)           按钮、链接                bg-primary
                          激活状态                  text-primary
                                                    border-primary

Secondary (Info)           描述文本                  text-muted-foreground
                          次要信息                  bg-muted

Destructive (Error)        错误消息                  text-destructive
                          删除按钮                  bg-destructive

Model Types                模型标识                  bg-purple (LLM)
                                                    bg-blue (VLLM)

Template Categories        模板分类标识              bg-amber (history)
                          - 历史描述                bg-green (culture)
                          - 文化解读                bg-purple (art)
                          - 艺术分析                bg-blue (modern)
                          - 现代视角                bg-gray (custom)

Borders                    分隔线                    border-border
                          输入框边框                border-input

Backgrounds                对话框背景               bg-background
                          卡片背景                 bg-card / bg-muted
```
