/**
 * 实体和属性相关类型定义
 */

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
  id: string
  name: string
  description: string
  template: string
  model: 'llm' | 'vllm'
  variables?: string[]
}

export interface EnrichmentRequest {
  entity_name: string
  ontology_id: string
  attribute_name?: string
  prompt?: string
  model?: 'llm' | 'vllm'
  image_url?: string
}

export interface UpdateEntityRequest {
  entity_id: string
  attributes: Record<string, any>
}

export interface EntitySearchFilter {
  entity_types?: string[]
  attributes?: Record<string, any>
  search_query?: string
  limit?: number
  offset?: number
}
