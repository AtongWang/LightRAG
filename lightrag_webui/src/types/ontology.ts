/**
 * 本体管理相关类型定义
 */

export interface OntologySpec {
  ontology_id: string
  project_id: string
  name: string
  description: string
  version: string
  language: 'zh' | 'en'
  entity_types: string[]
  relation_types: string[]
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
}

export interface UpdateOntologyDto {
  name?: string
  description?: string
  entity_types?: string[]
  relation_types?: string[]
}

export interface ValidationResult {
  is_valid: boolean
  error_message?: string
  warnings?: string[]
}
