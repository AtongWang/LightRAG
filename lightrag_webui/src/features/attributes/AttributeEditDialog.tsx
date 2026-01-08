import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import LLMEnrichmentPanel from './LLMEnrichmentPanel'
import {
  EntityData,
  EnrichmentModelType
} from '@/types/enrichment'

interface AttributeEditDialogProps {
  isOpen: boolean
  onClose: () => void
  entity: EntityData
  onSave?: (attributeName: string, value: any) => Promise<void>
  onDelete?: (attributeName: string) => Promise<void>
  onGenerate?: (config: {
    entity_name: string
    model_type: EnrichmentModelType
    template?: any
    custom_prompt?: string
    attribute_name: string
    image_url?: string
    ontology_id?: string
  }) => Promise<any>
  ontologyId?: string
  isSubmitting?: boolean
  errorMessage?: string | null
}

/**
 * 属性编辑对话框
 * 支持手动添加属性和AI生成属性
 */
const AttributeEditDialog = ({
  isOpen,
  onClose,
  entity,
  onSave,
  onDelete,
  onGenerate,
  ontologyId,
  isSubmitting = false,
  errorMessage = null
}: AttributeEditDialogProps) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'manual' | 'llm' | 'vllm'>('manual')

  // 手动添加属性的状态
  const [manualAttributeName, setManualAttributeName] = useState('')
  const [manualAttributeValue, setManualAttributeValue] = useState('')

  // 当对话框打开时重置状态
  useEffect(() => {
    if (isOpen) {
      setActiveTab('manual')
      setManualAttributeName('')
      setManualAttributeValue('')
    }
  }, [isOpen, entity])

  /**
   * 处理手动保存
   */
  const handleManualSave = async () => {
    if (!manualAttributeName.trim()) {
      return
    }

    if (onSave) {
      await onSave(manualAttributeName.trim(), manualAttributeValue)
      // 保存成功后清空输入
      setManualAttributeName('')
      setManualAttributeValue('')
    }
  }

  /**
   * 处理删除属性
   */
  const handleDeleteAttribute = async (attributeName: string) => {
    if (onDelete) {
      await onDelete(attributeName)
    }
  }

  /**
   * 处理AI生成保存
   */
  const handleAIGenerateSave = async (attributeName: string, value: any) => {
    if (onSave) {
      await onSave(attributeName, value)
      // 保存成功后切换回手动标签页
      setActiveTab('manual')
    }
  }

  /**
   * 渲染当前属性列表
   */
  const renderAttributesList = () => {
    const attributes = entity.attributes || {}

    if (Object.keys(attributes).length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          该实体暂无属性
        </div>
      )
    }

    return (
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {Object.entries(attributes).map(([key, value]) => (
          <div
            key={key}
            className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/20 group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{key}</span>
                <span className="text-xs text-muted-foreground">
                  {typeof value === 'string' ? '文本' : '数据'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {typeof value === 'string'
                  ? value
                  : JSON.stringify(value, null, 2)
                }
              </div>
            </div>
            {onDelete && (
              <button
                onClick={() => handleDeleteAttribute(key)}
                disabled={isSubmitting}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded text-destructive disabled:opacity-50"
                title="删除属性"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  /**
   * 渲染手动添加标签页
   */
  const renderManualTab = () => (
    <div className="space-y-4">
      {/* 当前属性列表 */}
      <div>
        <h4 className="text-sm font-medium mb-3">当前属性</h4>
        {renderAttributesList()}
      </div>

      {/* 添加新属性 */}
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-medium mb-3">添加新属性</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1.5">
              属性名称 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={manualAttributeName}
              onChange={(e) => setManualAttributeName(e.target.value)}
              disabled={isSubmitting}
              placeholder="例如：period（朝代）"
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5">
              属性值 <span className="text-destructive">*</span>
            </label>
            <textarea
              value={manualAttributeValue}
              onChange={(e) => setManualAttributeValue(e.target.value)}
              disabled={isSubmitting}
              placeholder="输入属性值..."
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background disabled:opacity-50"
            />
          </div>

          {/* 错误提示 */}
          {errorMessage && (
            <div className="rounded-md bg-destructive/15 text-destructive px-3 py-2 text-sm">
              {errorMessage}
            </div>
          )}

          {/* 保存按钮 */}
          <div className="flex justify-end">
            <Button
              onClick={handleManualSave}
              disabled={isSubmitting || !manualAttributeName.trim() || !manualAttributeValue.trim()}
            >
              <Plus className="mr-2 h-4 w-4" />
              添加属性
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  /**
   * 渲染AI生成标签页
   */
  const renderAITab = (modelType: EnrichmentModelType) => (
    <LLMEnrichmentPanel
      entity={entity}
      modelType={modelType}
      ontologyId={ontologyId}
      onGenerate={onGenerate || (async () => ({ success: false, error: '未实现生成功能' }))}
      onSave={handleAIGenerateSave}
      onCancel={() => setActiveTab('manual')}
      disabled={isSubmitting}
    />
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>编辑实体属性</DialogTitle>
          <DialogDescription>
            为实体 "{entity.entity_name}" 管理属性，支持手动添加或使用AI生成
          </DialogDescription>
        </DialogHeader>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              手动添加
            </TabsTrigger>
            <TabsTrigger value="llm" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              LLM生成
            </TabsTrigger>
            <TabsTrigger value="vllm" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              VLLM生成
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[calc(90vh-180px)]">
            <TabsContent value="manual" className="mt-0">
              {renderManualTab()}
            </TabsContent>

            <TabsContent value="llm" className="mt-0">
              {renderAITab('llm')}
            </TabsContent>

            <TabsContent value="vllm" className="mt-0">
              {renderAITab('vllm')}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AttributeEditDialog
