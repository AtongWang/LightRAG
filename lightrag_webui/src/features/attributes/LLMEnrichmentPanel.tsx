import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Play,
  Save,
  Sparkles,
  Wand2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import PromptTemplateSelector from './PromptTemplateSelector'
import {
  EnrichmentModelType,
  PromptTemplate,
  TemplateVariableValues,
  GenerationResult,
  EntityData
} from '@/types/enrichment'

interface LLMEnrichmentPanelProps {
  entity: EntityData
  modelType: EnrichmentModelType
  ontologyId?: string
  onGenerate: (config: {
    entity_name: string
    model_type: EnrichmentModelType
    template?: PromptTemplate
    custom_prompt?: string
    attribute_name: string
    image_url?: string
    ontology_id?: string
  }) => Promise<GenerationResult>
  onSave: (attributeName: string, value: any) => Promise<void>
  onCancel: () => void
  disabled?: boolean
}

/**
 * LLM/VLLM 属性生成面板
 */
const LLMEnrichmentPanel = ({
  entity,
  modelType,
  ontologyId,
  onGenerate,
  onSave,
  onCancel,
  disabled = false
}: LLMEnrichmentPanelProps) => {
  const { t } = useTranslation()
  const [attributeName, setAttributeName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | undefined>()
  const [variableValues, setVariableValues] = useState<TemplateVariableValues>({})
  const [customPrompt, setCustomPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generatedResult, setGeneratedResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 重置状态
  useEffect(() => {
    setAttributeName('')
    setSelectedTemplate(undefined)
    setVariableValues({})
    setCustomPrompt('')
    setGeneratedResult(null)
    setError(null)
  }, [entity, modelType])

  /**
   * 处理生成
   */
  const handleGenerate = async () => {
    if (!attributeName.trim()) {
      setError('请输入属性名称')
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      const result = await onGenerate({
        entity_name: entity.entity_name,
        model_type: modelType,
        template: selectedTemplate,
        custom_prompt: customPrompt || undefined,
        attribute_name: attributeName.trim(),
        image_url: entity.image_url,
        ontology_id: ontologyId
      })

      setGeneratedResult(result)

      if (!result.success) {
        setError(result.error || '生成失败')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成过程中发生错误'
      setError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * 处理保存
   */
  const handleSave = async () => {
    if (!generatedResult?.success || !attributeName.trim()) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave(attributeName.trim(), generatedResult.value)
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存过程中发生错误'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * 获取模型类型说明
   */
  const getModelTypeDescription = () => {
    if (modelType === 'vllm') {
      return {
        title: '视觉语言模型 (VLLM)',
        description: '支持图片分析，可以从实体图片中提取视觉特征和细节',
        icon: ImageIcon,
        color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950'
      }
    }
    return {
      title: '文本语言模型 (LLM)',
      description: '基于文本信息生成属性内容',
      icon: Wand2,
      color: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950'
    }
  }

  const modelInfo = getModelTypeDescription()
  const ModelIcon = modelInfo.icon

  /**
   * 渲染生成结果
   */
  const renderResult = () => {
    if (!generatedResult) return null

    if (!generatedResult.success) {
      return (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-destructive">生成失败</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {generatedResult.error || '未知错误'}
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              生成结果
            </h4>
            {generatedResult.processing_time && (
              <p className="text-xs text-muted-foreground mt-1">
                耗时 {generatedResult.processing_time.toFixed(2)}s
              </p>
            )}
          </div>
        </div>

        {/* 结果预览 */}
        <div className="bg-background rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              属性：{generatedResult.attribute_name}
            </span>
            <span className="text-xs text-muted-foreground">
              {typeof generatedResult.value === 'string' ? '文本' : '数据'}
            </span>
          </div>

          {typeof generatedResult.value === 'string' ? (
            <div className="text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
              {generatedResult.value}
            </div>
          ) : (
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
              {JSON.stringify(generatedResult.value, null, 2)}
            </pre>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving || disabled}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存到实体
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setGeneratedResult(null)}
            disabled={isSaving}
          >
            重新生成
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题和说明 */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className={cn('p-2 rounded-lg', modelInfo.color)}>
            <ModelIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{modelInfo.title}</h3>
            <p className="text-sm text-muted-foreground">
              {modelInfo.description}
            </p>
          </div>
        </div>
      </div>

      {/* 当前实体信息 */}
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <h4 className="text-sm font-medium mb-3">当前实体</h4>
        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="text-muted-foreground w-20 shrink-0">名称：</span>
            <span className="font-medium">{entity.entity_name}</span>
          </div>
          <div className="flex">
            <span className="text-muted-foreground w-20 shrink-0">类型：</span>
            <span>{entity.entity_type}</span>
          </div>
          {entity.description && (
            <div className="flex">
              <span className="text-muted-foreground w-20 shrink-0">描述：</span>
              <span className="line-clamp-2">{entity.description}</span>
            </div>
          )}
          {modelType === 'vllm' && entity.image_url && (
            <div className="flex">
              <span className="text-muted-foreground w-20 shrink-0">图片：</span>
              <span className="text-primary">已提供</span>
            </div>
          )}
        </div>
      </div>

      {!generatedResult ? (
        <>
          {/* 属性名称输入 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              属性名称 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={attributeName}
              onChange={(e) => setAttributeName(e.target.value)}
              disabled={disabled || isGenerating}
              placeholder="例如：historical_significance（历史意义）"
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              建议使用英文字段名，便于程序处理
            </p>
          </div>

          {/* 提示词模板选择 */}
          <PromptTemplateSelector
            modelType={modelType}
            selectedTemplate={selectedTemplate}
            variableValues={variableValues}
            onTemplateSelect={setSelectedTemplate}
            onVariableChange={setVariableValues}
            disabled={disabled || isGenerating}
          />

          {/* 自定义提示词 */}
          {selectedTemplate?.id === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                自定义提示词
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={disabled || isGenerating}
                placeholder="输入您的自定义提示词..."
                rows={8}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background disabled:opacity-50 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                可以使用变量：{'{entity_name}'}, {'{entity_type}'}, {'{description}'}
              </p>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={disabled || isGenerating || !attributeName.trim()}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  生成属性
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isGenerating}
            >
              取消
            </Button>
          </div>
        </>
      ) : (
        renderResult()
      )}
    </div>
  )
}

export default LLMEnrichmentPanel
