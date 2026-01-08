/**
 * 项目管理相关类型定义
 */

export interface Project {
  project_id: string
  name: string
  description: string
  workspace: string
  ontology_id?: string
  created_at: string
  updated_at: string
  status: 'active' | 'archived'
  cover_image?: string
  tags?: string[]
  stats?: {
    document_count: number
    entity_count: number
    relation_count: number
    last_updated: string
  }
}

export interface CreateProjectDto {
  name: string
  description: string
  tags?: string[]
  cover_image?: string
}

export interface UpdateProjectDto {
  name?: string
  description?: string
  tags?: string[]
  cover_image?: string
  status?: 'active' | 'archived'
}

export interface ProjectListResponse {
  projects: Project[]
  total: number
  page: number
  page_size: number
}
