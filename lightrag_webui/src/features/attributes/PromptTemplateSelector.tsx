import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  ChevronDown,
  FileText,
  Eye,
  History,
  Palette,
  Sparkles,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PromptTemplate,
  TemplateVariableValues,
  EnrichmentModelType
} from '@/types/enrichment'

interface PromptTemplateSelectorProps {
  templates: PromptTemplate[]
  selectedTemplate?: PromptTemplate
  modelType: EnrichmentModelType
  variableValues: TemplateVariableValues
  onTemplateSelect: (template: PromptTemplate) => void
  onVariableChange: (values: TemplateVariableValues) => void
  disabled?: boolean
}

/**
 * 预设模板数据
 */
const PRESET_TEMPLATES: PromptTemplate[] = [
  {
    id: 'history',
    name: '历史描述',
    description: '从历史学家的角度描述实体，注重历史背景和时代特征',
    category: 'history',
    model_type: 'llm',
    language: 'zh',
    template: `你是{朝代}的历史学家，专注于研究当时的人物、事件和文化。

请根据以下信息，为实体 "{entity_name}" 生成详细的历史描述：

实体类型：{entity_type}
当前描述：{description}

请从以下角度进行描述：
1. 历史背景：该实体在{朝代}的历史地位和重要性
2. 时代特征：体现了{朝代}的哪些时代特点
3. 历史影响：对当时及后世的影响
4. 史料价值：从历史研究的角度看其价值

要求：
- 语言客观、准确，符合史学规范
- 融入历史语境，体现时代特色
- 字数控制在200-400字`,
    variables: [
      {
        name: 'dynasty',
        type: 'text',
        description: '朝代名称',
        required: true,
        default_value: '唐朝'
      }
    ],
    example: '李白 - 盛唐时期最伟大的浪漫主义诗人...'
  },
  {
    id: 'culture',
    name: '文化解读',
    description: '从民众的视角解读实体，体现民间文化和生活智慧',
    category: 'culture',
    model_type: 'llm',
    language: 'zh',
    template: `你是{朝代}的普通民众，用朴实的语言讲述你眼中的 "{entity_name}"。

实体类型：{entity_type}
当前描述：{description}

请用通俗易懂的语言，从以下角度描述：
1. 民间印象：普通百姓如何看待这个实体
2. 生活联系：与日常生活的关系
3. 口口相传：在民间故事、传说中如何流传
4. 文化意义：在民俗文化中的地位

要求：
- 语言口语化，贴近民众
- 融入民间传说和故事
- 体现文化温度和人情味
- 字数控制在150-300字`,
    variables: [
      {
        name: 'dynasty',
        type: 'text',
        description: '朝代名称',
        required: true,
        default_value: '宋朝'
      }
    ],
    example: '苏东坡 - 在我们老百姓心中，他是个会写诗、会做菜的贴心官员...'
  },
  {
    id: 'art',
    name: '艺术分析',
    description: '从工匠和艺术家的视角分析实体的艺术价值',
    category: 'art',
    model_type: 'llm',
    language: 'zh',
    template: `你是{朝代}的工匠大师，精通各类艺术形式，对美有独特的见解。

请从艺术鉴赏的角度，为实体 "{entity_name}" 撰写艺术评析：

实体类型：{entity_type}
当前描述：{description}

请从以下维度进行分析：
1. 艺术特征：体现了{朝代}的哪些艺术风格和技法
2. 审美价值：从美学角度评价其艺术水准
3. 工艺技术：如果涉及器物，分析其工艺特色
4. 艺术影响：对后世艺术创作的影响

要求：
- 使用专业的艺术术语
- 注重审美体验和艺术感受
- 分析要具体、深入
- 字数控制在200-350字`,
    variables: [
      {
        name: 'dynasty',
        type: 'text',
        description: '朝代名称',
        required: true,
        default_value: '明朝'
      }
    ],
    example: '青花瓷 - 其釉色如蓝天白云，纹样繁复而不失章法...'
  },
  {
    id: 'modern',
    name: '现代视角',
    description: '从博物馆策展人的角度，用现代观点解读传统文化',
    category: 'modern',
    model_type: 'llm',
    language: 'zh',
    template: `你是博物馆的资深策展人，正在为 "{entity_name}" 策划一个专题展览。

实体类型：{entity_type}
当前描述：{description}

请为展览撰写专业的展品说明：

1. **文物概述**（100字）：
   - 基本信息：年代、出土地、收藏情况
   - 文物定级与重要性

2. **历史价值**（100字）：
   - 历史背景与时代意义
   - 对研究相关领域的贡献

3. **艺术特色**（100字）：
   - 艺术风格与审美特征
   - 工艺技术与创新之处

4. **现代意义**（100字）：
   - 当代价值与启示
   - 对文化传承的意义

要求：
- 语言专业、准确
- 既有学术深度又通俗易懂
- 体现现代博物馆的叙事方式
- 总字数约400字`,
    variables: [],
    example: '唐三彩骆驼载乐俑 - 这件盛唐时期的杰作，生动展现了丝绸之路的繁华...'
  },
  {
    id: 'vllm-artifact',
    name: '视觉文物分析',
    description: '使用VLLM分析文物图片，提取视觉特征和细节',
    category: 'art',
    model_type: 'vllm',
    language: 'zh',
    template: `你是文物鉴定专家，擅长通过视觉观察分析文物特征。

请仔细观察实体 "{entity_name}" 的图片，并提供详细分析：

实体类型：{entity_type}
当前描述：{description}

请从以下方面进行分析：

1. **视觉特征**：
   - 造型特点：整体形态、比例、结构
   - 色彩搭配：主色调、色彩关系
   - 纹饰细节：图案、装饰、工艺技法

2. **工艺判断**：
   - 材质识别：从视觉判断使用的材料
   - 制作工艺：推测的制作方法和技术
   - 时代特征：体现的时代风格

3. **保存状况**：
   - 完整性：是否有残缺、修复痕迹
   - 包浆痕迹：使用痕迹、岁月痕迹

4. **鉴赏价值**：
   - 艺术水准：工艺水平、审美价值
   - 稀缺性：同类文物的对比

要求：
- 详细描述观察到的视觉细节
- 基于视觉证据做出判断
- 体现专业性
- 字数控制在300-500字`,
    variables: [],
    example: '注意：此模板需要提供实体图片'
  }
]

/**
 * 获取分类图标
 */
const getCategoryIcon = (category: PromptTemplate['category']) => {
  switch (category) {
    case 'history':
      return History
    case 'culture':
      return User
    case 'art':
      return Palette
    case 'modern':
      return Sparkles
    default:
      return FileText
  }
}

/**
 * 获取分类颜色
 */
const getCategoryColor = (category: PromptTemplate['category']) => {
  switch (category) {
    case 'history':
      return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950'
    case 'culture':
      return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950'
    case 'art':
      return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950'
    case 'modern':
      return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950'
    default:
      return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950'
  }
}

/**
 * 提示词模板选择器组件
 */
const PromptTemplateSelector = ({
  templates = PRESET_TEMPLATES,
  selectedTemplate,
  modelType,
  variableValues,
  onTemplateSelect,
  onVariableChange,
  disabled = false
}: PromptTemplateSelectorProps) => {
  const { t } = useTranslation()
  const [showPreview, setShowPreview] = useState(false)
  const [customMode, setCustomMode] = useState(false)

  // 根据模型类型过滤模板
  const filteredTemplates = templates.filter(t => t.model_type === modelType)

  const handleTemplateSelect = (template: PromptTemplate) => {
    setCustomMode(false)
    onTemplateSelect(template)
    setShowPreview(true)
  }

  const handleCustomMode = () => {
    setCustomMode(true)
    const customTemplate: PromptTemplate = {
      id: 'custom',
      name: '自定义提示词',
      description: '使用您自己的提示词模板',
      category: 'custom',
      model_type: modelType,
      language: 'zh',
      template: variableValues.custom_prompt || '',
      variables: []
    }
    onTemplateSelect(customTemplate)
  }

  const handleVariableChange = (varName: string, value: any) => {
    onVariableChange({
      ...variableValues,
      [varName]: value
    })
  }

  return (
    <div className="space-y-4">
      {/* 模板选择 */}
      <div>
        <label className="block text-sm font-medium mb-2">
          选择提示词模板
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredTemplates.map((template) => {
            const Icon = getCategoryIcon(template.category)
            const isSelected = selectedTemplate?.id === template.id

            return (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                disabled={disabled}
                className={cn(
                  'relative p-4 text-left rounded-lg border-2 transition-all',
                  'hover:border-primary/50 hover:shadow-md',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    getCategoryColor(template.category)
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">
                        {template.name}
                      </h4>
                      {template.model_type === 'vllm' && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          VLLM
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {template.description}
                    </p>
                    {template.example && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        示例：{template.example.slice(0, 50)}...
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 自定义选项 */}
      {!customMode && (
        <button
          onClick={handleCustomMode}
          disabled={disabled}
          className="w-full p-3 text-sm text-left rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="font-medium">+ 自定义提示词</span>
          <p className="text-xs text-muted-foreground mt-1">
            编写您自己的提示词模板
          </p>
        </button>
      )}

      {/* 变量填充 */}
      {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && !customMode && (
        <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/20">
          <h4 className="text-sm font-medium">模板变量</h4>
          {selectedTemplate.variables.map((variable) => (
            <div key={variable.name}>
              <label className="block text-sm mb-1">
                {variable.description}
                {variable.required && <span className="text-destructive ml-1">*</span>}
              </label>
              {variable.type === 'select' && variable.options ? (
                <select
                  value={variableValues[variable.name] || variable.default_value || ''}
                  onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background disabled:opacity-50"
                >
                  {variable.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={variable.type === 'number' ? 'number' : 'text'}
                  value={variableValues[variable.name] || variable.default_value || ''}
                  onChange={(e) => handleVariableChange(
                    variable.name,
                    variable.type === 'number' ? parseFloat(e.target.value) : e.target.value
                  )}
                  disabled={disabled}
                  placeholder={variable.default_value}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background disabled:opacity-50"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 模板预览 */}
      {selectedTemplate && showPreview && !customMode && (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              提示词预览
            </h4>
            <button
              onClick={() => setShowPreview(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              隐藏
            </button>
          </div>
          <div className="text-sm whitespace-pre-wrap font-mono bg-background p-3 rounded border border-border max-h-60 overflow-y-auto">
            {selectedTemplate.template}
          </div>
        </div>
      )}

      {/* 隐藏时显示预览按钮 */}
      {selectedTemplate && !showPreview && !customMode && (
        <button
          onClick={() => setShowPreview(true)}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Eye className="h-4 w-4" />
          查看完整提示词
        </button>
      )}
    </div>
  )
}

export default PromptTemplateSelector
