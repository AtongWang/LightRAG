/**
 * 本体管理相关类型定义
 */

export interface AttributeDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'image' | 'array'
  required: boolean
  description: string
  enum_values?: string[]
  min_value?: number
  max_value?: number
}

export interface OntologySpec {
  ontology_id: string
  project_id: string
  name: string
  description: string
  version: string
  language: 'zh' | 'en'
  entity_types: string[]
  relation_types: string[]
  entity_attributes: Record<string, AttributeDefinition>
  relation_attributes: Record<string, AttributeDefinition>
  normalization_rules?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateOntologyDto {
  project_id: string
  name: string
  description: string
  language: 'zh' | 'en'
  entity_types: string[]
  relation_types: string[]
  entity_attributes: Record<string, AttributeDefinition>
  relation_attributes: Record<string, AttributeDefinition>
  normalization_rules?: Record<string, any>
}

export interface UpdateOntologyDto {
  name?: string
  description?: string
  entity_types?: string[]
  relation_types?: string[]
  entity_attributes?: Record<string, AttributeDefinition>
  relation_attributes?: Record<string, AttributeDefinition>
  normalization_rules?: Record<string, any>
}

export interface ValidationResult {
  is_valid: boolean
  error_message?: string
  warnings?: string[]
}

export interface EntityType {
  name: string
  description?: string
  attributes: Record<string, AttributeDefinition>
}

export interface RelationType {
  name: string
  description?: string
  attributes: Record<string, AttributeDefinition>
}
