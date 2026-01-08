/**
 * Enrichment API 相关类型定义
 */

/**
 * 丰富状态
 */
export type EnrichmentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'

/**
 * 模型类型
 */
export type EnrichmentModelType = 'llm' | 'vllm'

/**
 * 单个实体的丰富结果
 */
export interface EnrichmentResult {
  entity_name: string
  status: EnrichmentStatus
  original_data?: EntityData
  enriched_data?: EntityData
  error_message?: string
  processing_time?: number
}

/**
 * 批量丰富结果
 */
export interface BatchEnrichmentResult {
  total_entities: number
  succeeded: number
  failed: number
  skipped: number
  results: EnrichmentResult[]
  total_time: number
}

/**
 * 实体数据
 */
export interface EntityData {
  entity_name: string
  entity_type: string
  description?: string
  image_url?: string
  attributes?: Record<string, any>
  [key: string]: any
}

/**
 * 丰富请求参数
 */
export interface EnrichmentRequest {
  entity_name: string
  ontology_id?: string
  attribute_name?: string
  prompt?: string
  model_type?: EnrichmentModelType
  image_url?: string
}

/**
 * 批量丰富请求参数
 */
export interface BatchEnrichmentRequest {
  entity_names: string[]
  ontology_id?: string
}

/**
 * 后台任务状态响应
 */
export interface EnrichmentStatusResponse {
  task_id: string
  status: EnrichmentStatus
  message: string
}

/**
 * 提示词模板
 */
export interface PromptTemplate {
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

/**
 * 模板变量
 */
export interface TemplateVariable {
  name: string
  type: 'text' | 'select' | 'entity_type' | 'number'
  description: string
  required: boolean
  default_value?: any
  options?: string[] // For select type
}

/**
 * 自定义提示词
 */
export interface CustomPrompt {
  name: string
  content: string
  model_type: EnrichmentModelType
  attribute_name?: string
}

/**
 * 生成属性配置
 */
export interface AttributeGenerationConfig {
  entity_name: string
  entity_type: string
  model_type: EnrichmentModelType
  template?: PromptTemplate
  custom_prompt?: string
  attribute_name: string
  image_url?: string
  ontology_id?: string
}

/**
 * 生成结果
 */
export interface GenerationResult {
  success: boolean
  attribute_name: string
  value: any
  error?: string
  processing_time?: number
}

/**
 * 预设模板变量值
 */
export interface TemplateVariableValues {
  dynasty?: string
  entity_name?: string
  entity_type?: string
  description?: string
  [key: string]: any
}

/**
 * LLM/VLLM 模型配置
 */
export interface ModelConfig {
  type: EnrichmentModelType
  supports_vision: boolean
  max_tokens: number
  description: string
}
