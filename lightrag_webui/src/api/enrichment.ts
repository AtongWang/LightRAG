import axios from 'axios'
import { backendBaseUrl } from '@/lib/constants'
import {
  EnrichmentRequest,
  BatchEnrichmentRequest,
  EnrichmentResult,
  BatchEnrichmentResult,
  EnrichmentStatusResponse,
  GenerationResult
} from '@/types/enrichment'

/**
 * Enrichment API 客户端
 */
export const enrichmentApi = {
  /**
   * 丰富单个实体（同步）
   */
  async enrichEntity(request: EnrichmentRequest): Promise<EnrichmentResult> {
    const response = await axios.post(
      `${backendBaseUrl}/api/enrichment/entity`,
      request
    )
    return response.data
  },

  /**
   * 批量丰富实体（同步）
   */
  async enrichEntities(request: BatchEnrichmentRequest): Promise<BatchEnrichmentResult> {
    const response = await axios.post(
      `${backendBaseUrl}/api/enrichment/entities`,
      request
    )
    return response.data
  },

  /**
   * 后台丰富单个实体
   */
  async enrichEntityBackground(request: EnrichmentRequest): Promise<EnrichmentStatusResponse> {
    const response = await axios.post(
      `${backendBaseUrl}/api/enrichment/entity/background`,
      request
    )
    return response.data
  },

  /**
   * 后台批量丰富实体
   */
  async enrichEntitiesBackground(request: BatchEnrichmentRequest): Promise<EnrichmentStatusResponse> {
    const response = await axios.post(
      `${backendBaseUrl}/api/enrichment/entities/background`,
      request
    )
    return response.data
  }
}

/**
 * 生成属性值（基于模板或自定义提示词）
 *
 * 注意：这个功能需要后端支持。如果后端尚未实现，
 * 需要扩展 enrichment API 或添加新的端点。
 */
export async function generateAttributeValue(
  entityName: string,
  modelType: 'llm' | 'vllm',
  template?: string,
  customPrompt?: string,
  attributeName?: string,
  imageUrl?: string,
  ontologyId?: string
): Promise<GenerationResult> {
  try {
    // 构建提示词
    const prompt = customPrompt || template || ''

    // 调用后端 API
    // 注意：这里假设后端有一个专门用于生成属性值的端点
    // 如果后端尚未实现，需要先实现后端功能
    const response = await axios.post(`${backendBaseUrl}/api/enrichment/generate`, {
      entity_name: entityName,
      model_type: modelType,
      prompt: prompt,
      attribute_name: attributeName,
      image_url: imageUrl,
      ontology_id: ontologyId
    })

    return {
      success: true,
      attribute_name: attributeName || 'generated_value',
      value: response.data.value,
      processing_time: response.data.processing_time
    }
  } catch (error) {
    console.error('Failed to generate attribute value:', error)
    return {
      success: false,
      attribute_name: attributeName || 'generated_value',
      error: error instanceof Error ? error.message : '生成失败'
    }
  }
}

/**
 * 使用 enrichment API 的包装函数
 *
 * 如果后端只有基本的 enrichment 端点，
 * 可以使用这个函数作为替代方案
 */
export async function generateWithEnrichmentAPI(
  entityName: string,
  ontologyId?: string
): Promise<GenerationResult> {
  try {
    const startTime = Date.now()

    // 调用现有的 enrichment API
    const result = await enrichmentApi.enrichEntity({
      entity_name: entityName,
      ontology_id: ontologyId
    })

    const processingTime = (Date.now() - startTime) / 1000

    if (result.status === 'completed' && result.enriched_data) {
      // 提取生成的描述或属性
      const { description, attributes } = result.enriched_data

      return {
        success: true,
        attribute_name: 'description',
        value: description || attributes,
        processing_time: processingTime
      }
    } else {
      return {
        success: false,
        attribute_name: 'description',
        error: result.error_message || '丰富失败'
      }
    }
  } catch (error) {
    console.error('Failed to generate with enrichment API:', error)
    return {
      success: false,
      attribute_name: 'description',
      error: error instanceof Error ? error.message : '生成失败'
    }
  }
}

/**
 * 更新实体属性
 *
 * 注意：这个功能需要图操作 API 支持
 */
export async function updateEntityAttributes(
  entityId: string,
  attributes: Record<string, any>
): Promise<void> {
  try {
    await axios.patch(`${backendBaseUrl}/api/graph/nodes/${entityId}`, {
      attributes
    })
  } catch (error) {
    console.error('Failed to update entity attributes:', error)
    throw error
  }
}

/**
 * 删除实体属性
 */
export async function deleteEntityAttribute(
  entityId: string,
  attributeName: string
): Promise<void> {
  try {
    await axios.delete(
      `${backendBaseUrl}/api/graph/nodes/${entityId}/attributes/${attributeName}`
    )
  } catch (error) {
    console.error('Failed to delete entity attribute:', error)
    throw error
  }
}
