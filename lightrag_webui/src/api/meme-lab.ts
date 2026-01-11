/**
 * 文化基因库API客户端
 * 扩展LightRAG的API功能，添加项目、本体、实体丰富等API
 */

import axios from 'axios'
import { backendBaseUrl } from '@/lib/constants'
import type {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  OntologySpec,
  CreateOntologyDto,
  UpdateOntologyDto,
  ValidationResult,
  EnrichmentRequest,
  EnrichmentResult
} from '@/types'

// 创建axios实例
const api = axios.create({
  baseURL: backendBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('LIGHTRAG-API-TOKEN')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期，需要刷新或重新登录
      localStorage.removeItem('LIGHTRAG-API-TOKEN')
      window.location.href = '/#/'
    }
    return Promise.reject(error)
  }
)

// ==================== 项目管理API ====================

/**
 * 获取所有项目
 */
export const getProjects = async (): Promise<Project[]> => {
  const response = await api.get('/projects/')
  return response.data
}

/**
 * 获取单个项目
 */
export const getProject = async (projectId: string): Promise<Project> => {
  const response = await api.get(`/projects/${projectId}`)
  return response.data
}

/**
 * 创建项目
 */
export const createProject = async (data: CreateProjectDto): Promise<Project> => {
  const response = await api.post('/projects/create', data)
  return response.data
}

/**
 * 更新项目
 */
export const updateProject = async (
  projectId: string,
  data: UpdateProjectDto
): Promise<void> => {
  await api.put(`/projects/${projectId}`, data)
}

/**
 * 删除项目
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}`)
}

/**
 * 设置项目本体
 */
export const setProjectOntology = async (
  projectId: string,
  ontologyId: string
): Promise<void> => {
  await api.post(`/projects/${projectId}/set-ontology`, `"${ontologyId}"`, {
    headers: { 'Content-Type': 'application/json' }
  })
}

// ==================== 本体管理API ====================

/**
 * 获取本体
 */
export const getOntology = async (ontologyId: string): Promise<OntologySpec> => {
  const response = await api.get(`/ontology/${ontologyId}`)
  return response.data
}

/**
 * 获取项目的本体
 */
export const getProjectOntology = async (projectId: string): Promise<OntologySpec> => {
  const response = await api.get(`/ontology/project/${projectId}`)
  return response.data
}

/**
 * 创建本体
 */
export const createOntology = async (data: CreateOntologyDto): Promise<OntologySpec> => {
  const response = await api.post('/ontology/create', data)
  return response.data
}

/**
 * 更新本体
 */
export const updateOntology = async (
  ontologyId: string,
  data: UpdateOntologyDto
): Promise<void> => {
  await api.put(`/ontology/${ontologyId}`, data)
}

/**
 * 删除本体
 */
export const deleteOntology = async (ontologyId: string): Promise<void> => {
  await api.delete(`/ontology/${ontologyId}`)
}

/**
 * 验证本体
 */
export const validateOntology = async (ontologyId: string): Promise<ValidationResult> => {
  const response = await api.get(`/ontology/${ontologyId}/validate`)
  return response.data
}

// ==================== 实体丰富API ====================

/**
 * 丰富单个实体
 */
export const enrichEntity = async (data: EnrichmentRequest): Promise<EnrichmentResult> => {
  const response = await api.post('/enrichment/entity', data)
  return response.data
}

/**
 * 批量丰富实体
 */
export const enrichEntities = async (
  entityNames: string[],
  ontologyId: string
): Promise<EnrichmentResult[]> => {
  const response = await api.post('/enrichment/entities', {
    entity_names: entityNames,
    ontology_id: ontologyId
  })
  return response.data
}

/**
 * 后台丰富实体
 */
export const enrichEntityInBackground = async (data: EnrichmentRequest): Promise<{ task_id: string }> => {
  const response = await api.post('/enrichment/entity/background', data)
  return response.data
}

/**
 * 后台批量丰富实体
 */
export const enrichEntitiesInBackground = async (
  entityNames: string[],
  ontologyId: string
): Promise<{ task_id: string }> => {
  const response = await api.post('/enrichment/entities/background', {
    entity_names: entityNames,
    ontology_id: ontologyId
  })
  return response.data
}

// ==================== 图谱查询API ====================

/**
 * 获取项目图谱数据
 */
export const getProjectGraph = async (projectId: string, options?: {
  maxDepth?: number
  maxNodes?: number
}): Promise<{
  nodes: any[]
  edges: any[]
}> => {
  const params = new URLSearchParams()
  if (options?.maxDepth) params.set('max_depth', String(options.maxDepth))
  if (options?.maxNodes) params.set('max_nodes', String(options.maxNodes))

  const queryString = params.toString()
  const url = `/graphs/project/${projectId}${queryString ? `?${queryString}` : ''}`
  const response = await api.get(url)
  return response.data
}

/**
 * 获取节点详情
 */
export const getNode = async (nodeId: string): Promise<any> => {
  const response = await api.get(`/entities/${nodeId}`)
  return response.data
}

/**
 * 更新节点
 */
export const updateNode = async (
  nodeId: string,
  data: Record<string, any>
): Promise<void> => {
  await api.put(`/entities/${nodeId}`, data)
}

/**
 * 删除节点
 */
export const deleteNode = async (nodeId: string): Promise<void> => {
  await api.delete(`/entities/${nodeId}`)
}

/**
 * 搜索节点
 */
export const searchNodes = async (params: {
  projectId?: string
  query?: string
  entityTypes?: string[]
  limit?: number
}): Promise<any[]> => {
  const response = await api.get('/entities/search', { params })
  return response.data
}

// ==================== 导出API对象 ====================

export const projectApi = {
  list: getProjects,
  get: getProject,
  create: createProject,
  update: updateProject,
  delete: deleteProject,
  setOntology: setProjectOntology
}

export const ontologyApi = {
  get: getOntology,
  getByProject: getProjectOntology,
  create: createOntology,
  update: updateOntology,
  delete: deleteOntology,
  validate: validateOntology
}

export const enrichmentApi = {
  enrichEntity,
  enrichEntities,
  enrichEntityInBackground: enrichEntityInBackground,
  enrichEntitiesInBackground: enrichEntitiesInBackground
}

export const graphApi = {
  getProjectGraph,
  getNode,
  updateNode,
  deleteNode,
  searchNodes
}

export default api
