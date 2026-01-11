/**
 * Enrichment API wrapper
 *
 * This file provides wrapper functions for the enrichment API that work with
 * the AttributeEditDialog component. It uses the meme-lab API client for
 * proper authentication and endpoint handling.
 */

import * as api from './meme-lab'
import type {
  EnrichmentRequest,
  GenerationResult,
  EnrichmentModelType
} from '@/types/enrichment'

/**
 * 生成属性值（基于模板或自定义提示词）
 *
 * This function is used by AttributeEditDialog's onGenerate callback.
 * It calls the enrichment API with the specified parameters.
 */
export async function generateAttributeValue(
  entityName: string,
  modelType: EnrichmentModelType,
  template?: string,
  customPrompt?: string,
  attributeName?: string,
  imageUrl?: string,
  ontologyId?: string
): Promise<GenerationResult> {
  try {
    const startTime = Date.now()

    // Build the enrichment request
    const request: EnrichmentRequest = {
      entity_name: entityName,
      ontology_id: ontologyId,
      // Use custom prompt or template if provided
      prompt: customPrompt || template,
      // Map model_type to the correct API parameter
      model: modelType,
      // Specify attribute name if targeting a specific attribute
      attribute_name: attributeName,
      // Include image URL for VLLM models
      image_url: imageUrl
    }

    // Call the enrichment API (with authentication via meme-lab client)
    const result = await api.enrichEntity(request)

    const processingTime = (Date.now() - startTime) / 1000

    if (result.status === 'completed' && result.enriched_data) {
      const { description, attributes } = result.enriched_data

      // If a specific attribute was requested, return its value
      if (attributeName && attributes?.[attributeName] !== undefined) {
        return {
          success: true,
          attribute_name: attributeName,
          value: attributes[attributeName],
          processing_time: processingTime
        }
      }

      // Otherwise, return the enriched data (description or all attributes)
      return {
        success: true,
        attribute_name: attributeName || 'enriched_data',
        value: description || attributes,
        processing_time: processingTime
      }
    } else {
      return {
        success: false,
        attribute_name: attributeName || 'enriched_data',
        value: null,
        error: result.error_message || '丰富失败'
      }
    }
  } catch (error) {
    console.error('Failed to generate attribute value:', error)
    return {
      success: false,
      attribute_name: attributeName || 'enriched_data',
      value: null,
      error: error instanceof Error ? error.message : '生成失败'
    }
  }
}

/**
 * 使用 enrichment API 的包装函数
 *
 * This is an alternative function that uses the basic enrichment endpoint.
 */
export async function generateWithEnrichmentAPI(
  entityName: string,
  ontologyId?: string
): Promise<GenerationResult> {
  return generateAttributeValue(entityName, 'llm', undefined, undefined, undefined, undefined, ontologyId)
}

/**
 * 更新实体属性
 *
 * Note: This function requires the entity CRUD API to be implemented.
 * Uses the entity update endpoint from meme-lab API.
 */
export async function updateEntityAttributes(
  entityId: string,
  attributes: Record<string, any>
): Promise<void> {
  try {
    await api.updateNode(entityId, { attributes })
  } catch (error) {
    console.error('Failed to update entity attributes:', error)
    throw error
  }
}

/**
 * 删除实体属性
 *
 * Note: This function requires the entity CRUD API to be implemented.
 * For now, this function will update the entity with the attribute removed.
 */
export async function deleteEntityAttribute(
  entityId: string,
  attributeName: string
): Promise<void> {
  try {
    // Get the current entity data
    const entity = await api.getNode(entityId)

    // Remove the attribute
    const { [attributeName]: removed, ...remainingAttributes } = entity.attributes || {}

    // Update the entity with remaining attributes
    await api.updateNode(entityId, { attributes: remainingAttributes })
  } catch (error) {
    console.error('Failed to delete entity attribute:', error)
    throw error
  }
}

/**
 * Re-export the enrichment API for direct use
 */
export { api as enrichmentApi }
