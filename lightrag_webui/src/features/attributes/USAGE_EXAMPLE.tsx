/**
 * 属性编辑功能使用示例
 *
 * 本文件演示如何在现有组件中集成属性编辑功能
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AttributeEditDialog from '@/features/attributes/AttributeEditDialog'
import { EntityData, EnrichmentModelType } from '@/types/enrichment'
import { generateAttributeValue, updateEntityAttributes, deleteEntityAttribute } from '@/api/enrichment'

// ============================================================================
// 示例 1: 基础用法 - 在图组件中集成属性编辑
// ============================================================================

export function GraphNodeWithAttributes() {
  const { t } = useTranslation()
  const [selectedEntity, setSelectedEntity] = useState<EntityData | null>(null)
  const [isAttributeDialogOpen, setIsAttributeDialogOpen] = useState(false)

  // 处理节点点击
  const handleNodeClick = (nodeData: any) => {
    const entity: EntityData = {
      entity_name: nodeData.id,
      entity_type: nodeData.labels[0] || 'Unknown',
      description: nodeData.properties.description || '',
      image_url: nodeData.properties.image_url,
      attributes: nodeData.properties.attributes || {}
    }
    setSelectedEntity(entity)
    setIsAttributeDialogOpen(true)
  }

  // 保存属性
  const handleSaveAttribute = async (attributeName: string, value: any) => {
    if (!selectedEntity) return

    try {
      await updateEntityAttributes(selectedEntity.entity_name, {
        [attributeName]: value
      })

      // 更新本地状态
      setSelectedEntity({
        ...selectedEntity,
        attributes: {
          ...selectedEntity.attributes,
          [attributeName]: value
        }
      })

      console.log(`属性 ${attributeName} 保存成功`)
    } catch (error) {
      console.error('保存属性失败:', error)
      throw error
    }
  }

  // 删除属性
  const handleDeleteAttribute = async (attributeName: string) => {
    if (!selectedEntity) return

    try {
      await deleteEntityAttribute(selectedEntity.entity_name, attributeName)

      // 更新本地状态
      const newAttributes = { ...selectedEntity.attributes }
      delete newAttributes[attributeName]

      setSelectedEntity({
        ...selectedEntity,
        attributes: newAttributes
      })

      console.log(`属性 ${attributeName} 删除成功`)
    } catch (error) {
      console.error('删除属性失败:', error)
      throw error
    }
  }

  // 生成属性
  const handleGenerateAttribute = async (config: {
    entity_name: string
    model_type: EnrichmentModelType
    template?: any
    custom_prompt?: string
    attribute_name: string
    image_url?: string
    ontology_id?: string
  }) => {
    try {
      const result = await generateAttributeValue(
        config.entity_name,
        config.model_type,
        config.template?.template,
        config.custom_prompt,
        config.attribute_name,
        config.image_url,
        config.ontology_id
      )

      return result
    } catch (error) {
      console.error('生成属性失败:', error)
      throw error
    }
  }

  return (
    <div>
      {/* 图可视化组件 */}
      <div onClick={handleNodeClick}>
        {/* 你的图组件 */}
        <button>点击节点编辑属性</button>
      </div>

      {/* 属性编辑对话框 */}
      {selectedEntity && (
        <AttributeEditDialog
          isOpen={isAttributeDialogOpen}
          onClose={() => setIsAttributeDialogOpen(false)}
          entity={selectedEntity}
          onSave={handleSaveAttribute}
          onDelete={handleDeleteAttribute}
          onGenerate={handleGenerateAttribute}
        />
      )}
    </div>
  )
}

// ============================================================================
// 示例 2: 在实体列表中添加属性编辑按钮
// ============================================================================

export function EntityListWithAttributeEdit() {
  const [selectedEntity, setSelectedEntity] = useState<EntityData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 假设这是从 API 获取的实体列表
  const entities: EntityData[] = [
    {
      entity_name: '李白',
      entity_type: '人物',
      description: '唐朝著名诗人',
      attributes: {
        dynasty: '唐朝',
        birth_year: '701',
        death_year: '762'
      }
    },
    {
      entity_name: '杜甫',
      entity_type: '人物',
      description: '唐朝现实主义诗人',
      attributes: {
        dynasty: '唐朝',
        birth_year: '712'
      }
    }
  ]

  const handleEditAttributes = (entity: EntityData) => {
    setSelectedEntity(entity)
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">实体列表</h2>

      {entities.map((entity) => (
        <div
          key={entity.entity_name}
          className="p-4 border border-border rounded-lg"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{entity.entity_name}</h3>
              <p className="text-sm text-muted-foreground">{entity.description}</p>
              <div className="mt-2 flex gap-2 flex-wrap">
                {Object.entries(entity.attributes || {}).map(([key, value]) => (
                  <span
                    key={key}
                    className="px-2 py-1 text-xs rounded bg-muted"
                  >
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleEditAttributes(entity)}
              className="px-3 py-1 text-sm rounded border border-border hover:bg-accent"
            >
              编辑属性
            </button>
          </div>
        </div>
      ))}

      {selectedEntity && (
        <AttributeEditDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          entity={selectedEntity}
          onSave={async (name, value) => {
            console.log('保存属性:', name, value)
          }}
          onDelete={async (name) => {
            console.log('删除属性:', name)
          }}
          onGenerate={async (config) => {
            console.log('生成属性:', config)
            return { success: true, attribute_name: config.attribute_name, value: '生成的值' }
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// 示例 3: 使用本体指导的属性生成
// ============================================================================

export function OntologyGuidedAttributeGeneration() {
  const [selectedEntity, setSelectedEntity] = useState<EntityData | null>(null)
  const [currentOntologyId, setCurrentOntologyId] = useState<string>('ontology_123')

  const handleGenerateWithOntology = async (config: any) => {
    // 使用本体 ID 进行生成
    const result = await generateAttributeValue(
      config.entity_name,
      config.model_type,
      config.template?.template,
      config.custom_prompt,
      config.attribute_name,
      config.image_url,
      currentOntologyId  // 传入本体 ID
    )

    return result
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        本体指导的属性生成
      </h2>

      <button
        onClick={() => {
          setSelectedEntity({
            entity_name: '唐三彩骆驼载乐俑',
            entity_type: '文物',
            description: '唐朝三彩釉陶器',
            image_url: '/images/artifact.jpg',
            attributes: {}
          })
        }}
      >
        选择实体
      </button>

      {selectedEntity && (
        <AttributeEditDialog
          isOpen={!!selectedEntity}
          onClose={() => setSelectedEntity(null)}
          entity={selectedEntity}
          ontologyId={currentOntologyId}
          onSave={async (name, value) => {
            console.log('保存:', name, value)
          }}
          onGenerate={handleGenerateWithOntology}
        />
      )}
    </div>
  )
}

// ============================================================================
// 示例 4: VLLM 图片分析功能
// ============================================================================

export function VLLMImageAnalysisExample() {
  const [selectedEntity, setSelectedEntity] = useState<EntityData | null>(null)

  // 一个带图片的文物实体
  const artifactEntity: EntityData = {
    entity_name: '青花瓷缠枝莲纹瓶',
    entity_type: '文物',
    description: '明代青花瓷器',
    image_url: 'https://example.com/blue-white-vase.jpg',
    attributes: {
      period: '明代',
      material: '瓷',
      technique: '青花'
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        VLLM 图片分析示例
      </h2>

      <button
        onClick={() => setSelectedEntity(artifactEntity)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        使用 VLLM 分析文物图片
      </button>

      {selectedEntity && (
        <AttributeEditDialog
          isOpen={!!selectedEntity}
          onClose={() => setSelectedEntity(null)}
          entity={selectedEntity}
          onSave={async (name, value) => {
            console.log('保存分析结果:', name, value)
          }}
          onGenerate={async (config) => {
            console.log('使用 VLLM 分析图片:', config.image_url)
            // VLLM 会查看 entity.image_url 并生成视觉分析
            return {
              success: true,
              attribute_name: config.attribute_name,
              value: '从视觉上看，这件青花瓷瓶造型优美，釉色纯正...'
            }
          }}
        />
      )}

      <div className="mt-4 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">VLLM 功能说明</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>需要实体包含 image_url 字段</li>
          <li>VLLM 模型会"看"图片并提取视觉特征</li>
          <li>适用于文物图片分析、艺术特征提取</li>
          <li>可生成颜色、纹饰、工艺等视觉描述</li>
        </ul>
      </div>
    </div>
  )
}

// ============================================================================
// 示例 5: 自定义提示词模板
// ============================================================================

export function CustomPromptTemplateExample() {
  const [customPrompt, setCustomPrompt] = useState('')

  // 自定义提示词示例
  const exampleCustomPrompt = `你是文化遗产保护专家，正在为文物建立数字档案。

请为实体 "{entity_name}" 撰写专业的保护建议：

实体类型：{entity_type}
当前描述：{description}

请从以下方面提供建议：
1. **保存环境**：温度、湿度、光照要求
2. **防护措施**：防震、防火、防潮措施
3. **修复建议**：如有损坏，修复原则和方法
4. **展示要求**：展览时的注意事项

要求：
- 专业术语准确
- 具体可操作
- 字数 300-500 字`

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">自定义提示词示例</h2>

      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">模板变量说明</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>{'{'}`{entity_name}`{'}'} - 实体名称</li>
          <li>{'{'}`{entity_type}`{'}'} - 实体类型</li>
          <li>{'{'}`{description}`{'}'} - 当前描述</li>
          <li>其他自定义变量...</li>
        </ul>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          自定义提示词模板
        </label>
        <textarea
          value={customPrompt || exampleCustomPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          rows={12}
          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background font-mono"
          placeholder="输入自定义提示词模板..."
        />
      </div>

      <button className="px-4 py-2 bg-primary text-primary-foreground rounded">
        保存为自定义模板
      </button>
    </div>
  )
}

// ============================================================================
// 示例 6: 错误处理和加载状态
// ============================================================================

export function WithErrorHandlingExample() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (attributeName: string, value: any) => {
    setIsLoading(true)
    setError(null)

    try {
      await updateEntityAttributes('entity_name', { [attributeName]: value })
      console.log('保存成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败'
      setError(message)
      console.error('保存错误:', err)
      // 重新抛出错误，让对话框显示
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerate = async (config: any) => {
    setError(null)

    try {
      const result = await generateAttributeValue(
        config.entity_name,
        config.model_type,
        config.template?.template,
        config.custom_prompt,
        config.attribute_name
      )

      if (!result.success) {
        setError(result.error || '生成失败')
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败'
      setError(message)
      console.error('生成错误:', err)
      throw err
    }
  }

  return (
    <div>
      <AttributeEditDialog
        isOpen={true}
        onClose={() => {}}
        entity={{
          entity_name: '测试实体',
          entity_type: '测试',
          attributes: {}
        }}
        onSave={handleSave}
        onGenerate={handleGenerate}
        isSubmitting={isLoading}
        errorMessage={error}
      />
    </div>
  )
}
