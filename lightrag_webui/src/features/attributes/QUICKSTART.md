# 属性生成功能快速开始指南

## 5分钟快速集成

### 步骤 1: 导入组件

```tsx
import AttributeEditDialog from '@/features/attributes/AttributeEditDialog'
import { EntityData } from '@/types/enrichment'
```

### 步骤 2: 准备实体数据

```tsx
const entity: EntityData = {
  entity_name: '李白',
  entity_type: '人物',
  description: '唐朝著名诗人',
  image_url: '/images/libai.jpg',  // 可选，用于 VLLM
  attributes: {
    dynasty: '唐朝',
    birth_year: '701'
  }
}
```

### 步骤 3: 实现回调函数

```tsx
// 保存属性
const handleSave = async (attributeName: string, value: any) => {
  await updateEntityAttributes(entity.entity_name, {
    [attributeName]: value
  })
}

// 删除属性
const handleDelete = async (attributeName: string) => {
  await deleteEntityAttribute(entity.entity_name, attributeName)
}

// 生成属性
const handleGenerate = async (config) => {
  return await generateAttributeValue(
    config.entity_name,
    config.model_type,
    config.template?.template,
    config.custom_prompt,
    config.attribute_name
  )
}
```

### 步骤 4: 使用组件

```tsx
function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)

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

## 常见使用场景

### 场景 1: 图节点属性编辑

```tsx
// 在图可视化组件中
<GraphView
  onNodeClick={(node) => {
    setSelectedEntity({
      entity_name: node.id,
      entity_type: node.type,
      description: node.description,
      attributes: node.attributes
    })
    setIsDialogOpen(true)
  }}
/>
```

### 场景 2: 仅使用手动编辑

```tsx
<AttributeEditDialog
  entity={entity}
  onSave={handleSave}
  // 不提供 onGenerate，AI 功能将显示"未实现"提示
/>
```

### 场景 3: 仅使用 LLM 生成

```tsx
// 在打开对话框前，设置要使用的模型类型
const handleOpen = () => {
  setIsDialogOpen(true)
  // 可以在 UI 中直接切换到 LLM 标签
}
```

### 场景 4: 使用本体指导

```tsx
<AttributeEditDialog
  entity={entity}
  ontologyId="ontology_123"  // 传入本体 ID
  onGenerate={handleGenerate}
/>
```

## 提示词模板使用

### 使用预设模板

1. 点击"LLM生成"或"VLLM生成"标签
2. 查看预设模板列表
3. 点击选择一个模板
4. 如有变量，填写变量值（如朝代）
5. 点击"生成属性"

### 使用自定义模板

1. 选择"自定义提示词"选项
2. 在文本框中输入提示词
3. 可用变量：
   - `{entity_name}` - 实体名称
   - `{entity_type}` - 实体类型
   - `{description}` - 当前描述

示例：
```
你是博物馆讲解员，请用通俗易懂的语言为 "{entity_name}" 撰写讲解词。

实体类型：{entity_type}
背景信息：{description}

要求：口语化，有趣味性，适合普通观众。
```

## LLM vs VLLM 选择

### 选择 LLM 当：
- ✅ 只需要基于文本信息生成
- ✅ 生成描述、摘要等文本内容
- ✅ 实体没有图片或图片不重要

### 选择 VLLM 当：
- ✅ 需要分析实体图片
- ✅ 提取视觉特征（颜色、纹饰、造型）
- ✅ 生成视觉描述
- ⚠️ 必须确保实体有 `image_url` 字段

## 错误处理

### 网络错误
```tsx
const handleSave = async (name, value) => {
  try {
    await updateEntityAttributes(entity.entity_name, { [name]: value })
    alert('保存成功')
  } catch (error) {
    alert('保存失败: ' + error.message)
    throw error  // 重新抛出让对话框显示错误
  }
}
```

### 验证错误
对话框会自动验证：
- 属性名称不能为空
- 属性值不能为空
- 生成前必须选择模板或输入自定义提示词

## API 集成

### 后端要求

确保后端实现以下端点：

```python
# 已实现
POST /api/enrichment/entity
POST /api/enrichment/entities

# 需要实现（用于自定义提示词）
POST /api/enrichment/generate
```

### 使用现有 API

如果后端只有基本 enrichment 端点：

```tsx
import { generateWithEnrichmentAPI } from '@/api/enrichment'

const handleGenerate = async (config) => {
  return await generateWithEnrichmentAPI(
    config.entity_name,
    config.ontology_id
  )
}
```

## 样式定制

### 覆盖默认样式

```css
/* 在你的全局 CSS 中 */
.attribute-edit-dialog {
  max-width: 900px;
}

.template-card {
  transition: all 0.2s;
}
```

### 使用 className prop

```tsx
<AttributeEditDialog
  entity={entity}
  onSave={handleSave}
  className="my-custom-class"
/>
```

## 最佳实践

### 1. 实体数据完整性
```tsx
// ✅ 好的做法
const entity = {
  entity_name: '李白',
  entity_type: '人物',
  description: '...',  // 提供描述
  image_url: '...',    // 如果可能，提供图片
  attributes: {}       // 始终包含 attributes 对象
}

// ❌ 不好的做法
const entity = {
  entity_name: '李白'
  // 缺少其他字段
}
```

### 2. 错误处理
```tsx
// ✅ 好的做法
const handleSave = async (name, value) => {
  try {
    await api.save(name, value)
    // 成功反馈
  } catch (error) {
    // 错误处理
    throw error  // 让对话框显示错误
  }
}

// ❌ 不好的做法
const handleSave = async (name, value) => {
  await api.save(name, value)  // 没有错误处理
}
```

### 3. 状态更新
```tsx
// ✅ 好的做法 - 保存后更新本地状态
const handleSave = async (name, value) => {
  await api.save(name, value)
  setEntity({
    ...entity,
    attributes: {
      ...entity.attributes,
      [name]: value
    }
  })
}

// ❌ 不好的做法 - 不更新状态
const handleSave = async (name, value) => {
  await api.save(name, value)
  // 界面不会更新
}
```

## 调试技巧

### 1. 查看生成配置
```tsx
const handleGenerate = async (config) => {
  console.log('生成配置:', config)
  // ...
}
```

### 2. 检查实体数据
```tsx
console.log('实体数据:', entity)
console.log('图片 URL:', entity.image_url)
console.log('现有属性:', entity.attributes)
```

### 3. 监控 API 调用
在浏览器开发者工具中：
- 打开 Network 标签
- 筛选 XHR 请求
- 查看 `/api/enrichment/*` 请求

## 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 生成按钮禁用 | 属性名为空 | 输入属性名称 |
| VLLM 显示"未提供图片" | 缺少 image_url | 确保实体有 image_url 字段 |
| 保存失败 | 后端 API 错误 | 检查网络请求和控制台错误 |
| 生成失败 | 未实现生成端点 | 实现后端 `/api/enrichment/generate` 端点 |
| 模板不显示 | 模型类型不匹配 | LLM 标签只能看 LLM 模板 |

## 下一步

- 📖 阅读完整文档: `README.md`
- 💡 查看使用示例: `USAGE_EXAMPLE.tsx`
- 🔧 了解类型定义: `types/enrichment.ts`
- 🌐 API 文档: `api/enrichment.ts`
