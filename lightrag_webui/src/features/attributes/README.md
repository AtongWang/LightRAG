# LLM/VLLM 属性生成界面设计文档

## 概述

本设计为 LightRAG WebUI 提供了完整的实体属性管理界面，支持手动添加属性和使用 AI（LLM/VLLM）生成属性内容。

## 架构设计

### 文件结构

```
lightrag_webui/src/
├── types/
│   └── enrichment.ts                           # 类型定义
├── api/
│   └── enrichment.ts                           # API 客户端
└── features/attributes/
    ├── AttributeEditDialog.tsx                 # 主对话框
    ├── LLMEnrichmentPanel.tsx                  # AI 生成面板
    ├── PromptTemplateSelector.tsx              # 提示词模板选择器
    └── README.md                               # 本文档
```

### 组件层次

```
AttributeEditDialog (主对话框)
├── Tabs (标签页切换)
│   ├── Tab 1: Manual (手动添加)
│   │   ├── 属性列表显示
│   │   └── 手动添加表单
│   ├── Tab 2: LLM (文本模型生成)
│   │   └── LLMEnrichmentPanel
│   │       └── PromptTemplateSelector
│   └── Tab 3: VLLM (视觉模型生成)
│       └── LLMEnrichmentPanel
│           └── PromptTemplateSelector
```

## 核心功能

### 1. AttributeEditDialog（属性编辑对话框）

**文件**: `AttributeEditDialog.tsx`

**功能**:
- 主对话框容器，管理所有属性编辑功能
- 三个标签页：手动添加、LLM 生成、VLLM 生成
- 显示实体当前属性列表
- 支持删除已有属性
- 集成手动添加和 AI 生成功能

**Props**:
```typescript
interface AttributeEditDialogProps {
  isOpen: boolean              // 对话框是否打开
  onClose: () => void          // 关闭回调
  entity: EntityData           // 当前实体数据
  onSave?: (attributeName: string, value: any) => Promise<void>  // 保存回调
  onDelete?: (attributeName: string) => Promise<void>            // 删除回调
  onGenerate?: (config) => Promise<any>                          // 生成回调
  ontologyId?: string          // 本体 ID
  isSubmitting?: boolean       // 是否正在提交
  errorMessage?: string | null // 错误消息
}
```

**使用示例**:
```tsx
import AttributeEditDialog from '@/features/attributes/AttributeEditDialog'

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)
  const [entity, setEntity] = useState<EntityData>({
    entity_name: '李白',
    entity_type: '人物',
    description: '唐朝诗人',
    attributes: { dynasty: '唐朝' }
  })

  const handleSave = async (name: string, value: any) => {
    // 保存逻辑
    await updateEntityAttributes(entity.entity_name, { [name]: value })
  }

  const handleDelete = async (name: string) => {
    // 删除逻辑
    await deleteEntityAttribute(entity.entity_name, name)
  }

  const handleGenerate = async (config) => {
    // AI 生成逻辑
    return await generateAttributeValue(
      config.entity_name,
      config.model_type,
      config.template?.template,
      config.custom_prompt,
      config.attribute_name
    )
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)}>编辑属性</button>
      <AttributeEditDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        entity={entity}
        onSave={handleSave}
        onDelete={handleDelete}
        onGenerate={handleGenerate}
      />
    </>
  )
}
```

### 2. LLMEnrichmentPanel（AI 生成面板）

**文件**: `LLMEnrichmentPanel.tsx`

**功能**:
- 属性名称输入
- 提示词模板选择
- 自定义提示词输入
- 生成进度显示
- 生成结果预览
- 保存到实体

**关键特性**:
- 区分 LLM 和 VLLM 模式
- VLLM 模式显示图片可用性
- 实时错误处理
- 生成耗时统计
- 结果预览和确认保存

**Props**:
```typescript
interface LLMEnrichmentPanelProps {
  entity: EntityData           // 当前实体
  modelType: 'llm' | 'vllm'   // 模型类型
  ontologyId?: string          // 本体 ID
  onGenerate: (config) => Promise<GenerationResult>  // 生成回调
  onSave: (attributeName: string, value: any) => Promise<void>      // 保存回调
  onCancel: () => void         // 取消回调
  disabled?: boolean           // 是否禁用
}
```

### 3. PromptTemplateSelector（提示词模板选择器）

**文件**: `PromptTemplateSelector.tsx`

**功能**:
- 预设模板展示和选择
- 模板分类（历史、文化、艺术、现代）
- 模板变量填充
- 模板预览
- 自定义模板支持

**预设模板**:

#### 历史描述模板
- **角色**: 历史学家
- **视角**: 注重历史背景和时代特征
- **变量**: 朝代
- **示例**: "李白 - 盛唐时期最伟大的浪漫主义诗人..."

#### 文化解读模板
- **角色**: 普通民众
- **视角**: 体现民间文化和生活智慧
- **变量**: 朝代
- **示例**: "苏东坡 - 在我们老百姓心中，他是个会写诗、会做菜的贴心官员..."

#### 艺术分析模板
- **角色**: 工匠大师
- **视角**: 分析艺术价值和工艺技法
- **变量**: 朝代
- **示例**: "青花瓷 - 其釉色如蓝天白云，纹样繁复而不失章法..."

#### 现代视角模板
- **角色**: 博物馆策展人
- **视角**: 用现代观点解读传统文化
- **变量**: 无
- **示例**: "唐三彩骆驼载乐俑 - 这件盛唐时期的杰作，生动展现了丝绸之路的繁华..."

#### 视觉文物分析模板（VLLM 专用）
- **角色**: 文物鉴定专家
- **视角**: 通过视觉观察分析文物特征
- **支持**: VLLM 模型
- **要求**: 需要提供实体图片

**Props**:
```typescript
interface PromptTemplateSelectorProps {
  templates: PromptTemplate[]              // 模板列表
  selectedTemplate?: PromptTemplate        // 已选择的模板
  modelType: 'llm' | 'vllm'               // 模型类型
  variableValues: TemplateVariableValues   // 变量值
  onTemplateSelect: (template: PromptTemplate) => void    // 选择回调
  onVariableChange: (values: TemplateVariableValues) => void  // 变量变更回调
  disabled?: boolean                       // 是否禁用
}
```

## 类型系统

### enrichment.ts 类型定义

```typescript
// 核心类型
type EnrichmentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
type EnrichmentModelType = 'llm' | 'vllm'

// 实体数据
interface EntityData {
  entity_name: string
  entity_type: string
  description?: string
  image_url?: string
  attributes?: Record<string, any>
}

// 提示词模板
interface PromptTemplate {
  id: string
  name: string
  description: string
  category: 'history' | 'culture' | 'art' | 'modern' | 'custom'
  model_type: EnrichmentModelType
  template: string
  variables?: TemplateVariable[]
  language: 'zh' | 'en'
  example?: string
}

// 生成结果
interface GenerationResult {
  success: boolean
  attribute_name: string
  value: any
  error?: string
  processing_time?: number
}
```

## API 集成

### enrichment.ts API 客户端

**提供的函数**:

1. **enrichmentApi.enrichEntity()**
   - 同步丰富单个实体
   - 端点: `POST /api/enrichment/entity`

2. **enrichmentApi.enrichEntities()**
   - 同步批量丰富实体
   - 端点: `POST /api/enrichment/entities`

3. **generateAttributeValue()**
   - 生成单个属性值
   - 端点: `POST /api/enrichment/generate`（需要后端实现）

4. **generateWithEnrichmentAPI()**
   - 使用现有 enrichment API 的包装函数
   - 作为备用方案

**使用示例**:
```typescript
import { enrichmentApi, generateAttributeValue } from '@/api/enrichment'

// 使用现有 API
const result = await enrichmentApi.enrichEntity({
  entity_name: '李白',
  ontology_id: 'ontology_123'
})

// 生成属性值（需要后端支持）
const generated = await generateAttributeValue(
  '李白',
  'llm',
  template.template,
  undefined,
  'historical_significance'
)
```

## 后端 API 要求

### 当前已实现的端点

根据 `lightrag/api/routers/enrichment_routes.py`，以下端点已实现：

- `POST /api/enrichment/entity` - 同步丰富单个实体
- `POST /api/enrichment/entities` - 同步批量丰富实体
- `POST /api/enrichment/entity/background` - 后台丰富单个实体
- `POST /api/enrichment/entities/background` - 后台批量丰富实体

### 需要扩展的端点

为了支持前端的自定义提示词功能，建议添加以下端点：

```python
@router.post("/generate")
async def generate_attribute_value(request: GenerateAttributeRequest):
    """使用自定义提示词生成属性值

    Args:
        entity_name: 实体名称
        model_type: 'llm' | 'vllm'
        prompt: 提示词
        attribute_name: 属性名称
        image_url: 图片 URL（VLLM 模式）
        ontology_id: 本体 ID（可选）

    Returns:
        {
            "value": any,              # 生成的值
            "processing_time": float   # 处理时间
        }
    """
    pass
```

### LLM vs VLLM 的区别

**LLM（Large Language Model）**:
- 仅处理文本
- 基于实体的文本描述生成内容
- 适用于：描述生成、属性提取、文本分析

**VLLM（Vision-Language Model）**:
- 支持图片和文本
- 可以查看实体图片并提取视觉特征
- 适用于：文物图片分析、艺术特征提取、视觉描述

## 用户体验设计

### 工作流程

1. **打开对话框**
   - 用户点击"编辑属性"按钮
   - 显示实体当前属性列表

2. **手动添加属性**
   - 输入属性名称和值
   - 点击"添加属性"
   - 属性立即保存并显示在列表中

3. **AI 生成属性（LLM）**
   - 切换到"LLM生成"标签
   - 输入属性名称
   - 选择预设模板或自定义提示词
   - 点击"生成属性"
   - 查看生成结果
   - 确认保存或重新生成

4. **AI 生成属性（VLLM）**
   - 切换到"VLLM生成"标签
   - 确认实体有图片
   - 选择视觉分析模板
   - 生成并保存

### 交互特点

- **渐进式披露**: 默认显示手动添加，AI 功能在标签页中
- **即时反馈**: 生成进度、错误提示、成功确认
- **防误操作**: 生成前需要输入属性名称，保存前可以预览
- **灵活性**: 支持预设模板和完全自定义

## 样式和主题

### 颜色系统

```typescript
// 分类颜色
const categoryColors = {
  history: 'amber',    // 历史描述 - 琥珀色
  culture: 'green',    // 文化解读 - 绿色
  art: 'purple',       // 艺术分析 - 紫色
  modern: 'blue',      // 现代视角 - 蓝色
  custom: 'gray'       // 自定义 - 灰色
}

// 模型类型颜色
const modelColors = {
  llm: 'purple',       // LLM - 紫色
  vllm: 'blue'         // VLLM - 蓝色
}
```

### 响应式设计

- **移动端**: 单列布局，模板垂直堆叠
- **平板**: 2列网格布局
- **桌面**: 2-3列网格布局，最大宽度约束

### 暗色模式

所有组件支持暗色模式，使用 Tailwind CSS 的 `dark:` 前缀。

## 可访问性

- 键盘导航支持
- 语义化 HTML
- ARIA 标签
- 焦点管理
- 屏幕阅读器友好

## 国际化

所有文本支持 i18n，使用 `react-i18next`：

```typescript
const { t } = useTranslation()

// 使用翻译
t('attributes.edit')
t('attributes.generate')
```

## 性能优化

- **懒加载**: 组件按需加载
- **防抖**: 输入框防抖处理
- **缓存**: 模板和实体数据缓存
- **虚拟滚动**: 大量属性时使用虚拟列表

## 错误处理

- **网络错误**: 显示友好提示，支持重试
- **验证错误**: 实时表单验证
- **API 错误**: 详细错误消息展示
- **超时处理**: 合理的超时设置

## 测试建议

### 单元测试

```typescript
describe('PromptTemplateSelector', () => {
  it('should filter templates by model type', () => {})
  it('should call onTemplateSelect when template is clicked', () => {})
  it('should handle variable changes', () => {})
})

describe('LLMEnrichmentPanel', () => {
  it('should call onGenerate with correct config', () => {})
  it('should display error message on generation failure', () => {})
  it('should reset state when entity changes', () => {})
})
```

### 集成测试

```typescript
describe('AttributeEditDialog Integration', () => {
  it('should complete full manual add workflow', () => {})
  it('should complete full LLM generation workflow', () => {})
  it('should handle API errors gracefully', () => {})
})
```

### E2E 测试

使用 Playwright 或 Cypress：

```typescript
test('complete enrichment workflow', async ({ page }) => {
  // 1. 打开对话框
  await page.click('[data-testid="edit-attributes"]')

  // 2. 切换到 LLM 标签
  await page.click('[data-testid="tab-llm"]')

  // 3. 选择模板
  await page.click('[data-testid="template-history"]')

  // 4. 输入属性名
  await page.fill('[data-testid="attribute-name"]', 'significance')

  // 5. 生成
  await page.click('[data-testid="generate-button"]')

  // 6. 验证结果
  await expect(page.locator('[data-testid="generation-result"]')).toBeVisible()

  // 7. 保存
  await page.click('[data-testid="save-button"]')
})
```

## 未来扩展

### 功能增强

1. **批量操作**: 批量生成多个实体的属性
2. **模板管理**: 用户自定义模板保存和管理
3. **历史记录**: 查看生成历史和版本对比
4. **智能推荐**: 基于实体类型推荐合适的属性
5. **导入导出**: 属性模板的导入导出

### 技术改进

1. **流式生成**: 支持流式显示生成内容
2. **本地缓存**: 浏览器本地存储生成历史
3. **离线模式**: 支持离线编辑，在线同步
4. **协作功能**: 多用户同时编辑冲突处理

## 故障排除

### 常见问题

**Q: VLLM 标签显示"未提供图片"**
- A: 确保实体数据中包含 `image_url` 字段

**Q: 生成失败，提示"未实现生成功能"**
- A: 需要在后端实现 `/api/enrichment/generate` 端点

**Q: 自定义提示词不生效**
- A: 确保选择了"自定义提示词"选项，并且在输入框中填写了内容

**Q: 生成的结果无法保存**
- A: 检查 `onSave` 回调是否正确实现，以及后端 API 是否可用

### 调试技巧

1. 打开浏览器控制台查看网络请求
2. 检查 `onGenerate`、`onSave` 等回调的返回值
3. 验证后端 API 端点是否正确配置
4. 查看实体数据结构是否符合预期

## 参考资源

- [LightRAG 文档](../../../CLAUDE.md)
- [Enrichment API 源码](../../../lightrag/api/routers/enrichment_routes.py)
- [Enrichment Service 源码](../../../lightrag/enrichment/service.py)
- [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)
- [Radix UI Tabs](https://www.radix-ui.com/primitives/docs/components/tabs)

## 总结

本设计提供了一个完整的、用户友好的实体属性管理界面，支持手动编辑和 AI 辅助生成。通过模块化的组件设计、完善的类型系统和灵活的 API 集成，可以轻松集成到 LightRAG WebUI 中。

关键特性：
- ✅ 完整的 TypeScript 类型支持
- ✅ 模块化组件设计
- ✅ LLM 和 VLLM 双模式支持
- ✅ 预设模板 + 自定义提示词
- ✅ 良好的用户体验
- ✅ 错误处理和加载状态
- ✅ 国际化和可访问性
- ✅ 响应式设计和暗色模式
