/**
 * 多模态API客户端
 * 提供与后端多模态资源交互的功能
 */

import axios from 'axios'
import { backendBaseUrl } from '@/lib/constants'
import type {
  MultimodalType,
  AssetMetadataResponse,
  AssetListResponse,
  StorageStatsResponse,
  MultimodalChunkInfo,
  MultimodalEntityInfo,
} from '@/types/multimodal'

// Axios实例
const axiosInstance = axios.create({
  baseURL: backendBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 添加请求拦截器以自动附加认证token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('LIGHTRAG-API-TOKEN')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * 资源上传响应
 */
export interface AssetUploadResponse {
  status: string
  asset_id: string
  modal_type: string
  file_size: number
  asset_url: string
  thumbnail_url?: string
}

/**
 * 上传多模态资源
 */
export async function uploadAsset(
  file: File,
  modalType?: MultimodalType
): Promise<AssetUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  
  const params = new URLSearchParams()
  if (modalType) {
    params.append('modal_type', modalType)
  }
  
  const url = `/multimodal/assets/upload${params.toString() ? `?${params.toString()}` : ''}`
  
  const response = await axiosInstance.post<AssetUploadResponse>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response.data
}

/**
 * 获取资源元数据
 */
export async function getAssetMetadata(assetId: string): Promise<AssetMetadataResponse> {
  const response = await axiosInstance.get<AssetMetadataResponse>(
    `/multimodal/assets/${assetId}/metadata`
  )
  return response.data
}

/**
 * 获取资源的Base64数据
 */
export async function getAssetBase64(assetId: string): Promise<{
  asset_id: string
  mime_type: string
  data: string
  data_url: string
}> {
  const response = await axiosInstance.get(`/multimodal/assets/${assetId}/base64`)
  return response.data
}

/**
 * 获取资源URL（用于直接在img标签中使用）
 */
export function getAssetUrl(assetId: string): string {
  const baseUrl = `${backendBaseUrl}/multimodal/assets/${assetId}`
  // 如果需要认证，可以通过其他方式处理（如使用blob URL）
  return baseUrl
}

/**
 * 获取缩略图URL
 */
export function getThumbnailUrl(assetId: string): string {
  return `${backendBaseUrl}/multimodal/assets/${assetId}/thumbnail`
}

/**
 * 删除资源
 */
export async function deleteAsset(assetId: string): Promise<{ status: string; message: string }> {
  const response = await axiosInstance.delete(`/multimodal/assets/${assetId}`)
  return response.data
}

/**
 * 列出所有资源
 */
export async function listAssets(params?: {
  modal_type?: MultimodalType
  limit?: number
  offset?: number
}): Promise<AssetListResponse> {
  const queryParams = new URLSearchParams()
  if (params?.modal_type) queryParams.append('modal_type', params.modal_type)
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset) queryParams.append('offset', params.offset.toString())
  
  const url = `/multimodal/assets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const response = await axiosInstance.get<AssetListResponse>(url)
  return response.data
}

/**
 * 获取存储统计信息
 */
export async function getStorageStats(): Promise<StorageStatsResponse> {
  const response = await axiosInstance.get<StorageStatsResponse>('/multimodal/stats')
  return response.data
}

/**
 * 获取多模态chunks
 */
export async function getMultimodalChunks(params?: {
  limit?: number
  offset?: number
  content_type?: MultimodalType
}): Promise<{
  chunks: MultimodalChunkInfo[]
  total: number
  limit: number
  offset: number
}> {
  const queryParams = new URLSearchParams()
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset) queryParams.append('offset', params.offset.toString())
  if (params?.content_type) queryParams.append('content_type', params.content_type)
  
  const url = `/multimodal/chunks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const response = await axiosInstance.get(url)
  return response.data
}

/**
 * 获取多模态实体
 */
export async function getMultimodalEntities(params?: {
  limit?: number
  offset?: number
}): Promise<{
  entities: MultimodalEntityInfo[]
  total: number
  limit: number
  offset: number
}> {
  const queryParams = new URLSearchParams()
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset) queryParams.append('offset', params.offset.toString())
  
  const url = `/multimodal/entities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const response = await axiosInstance.get(url)
  return response.data
}

/**
 * 从资源URL加载图片为Blob（用于需要认证的情况）
 */
export async function loadAssetAsBlob(assetId: string): Promise<Blob> {
  const response = await axiosInstance.get(`/multimodal/assets/${assetId}`, {
    responseType: 'blob',
  })
  return response.data
}

/**
 * 创建Blob URL用于显示（需要在使用后revoke）
 */
export async function createAssetBlobUrl(assetId: string): Promise<string> {
  const blob = await loadAssetAsBlob(assetId)
  return URL.createObjectURL(blob)
}

/**
 * 解析多模态内容从Markdown文本
 * 用于从查询响应中提取多模态引用
 */
export function parseMultimodalReferences(text: string): {
  type: MultimodalType
  id: string
  caption?: string
}[] {
  const results: { type: MultimodalType; id: string; caption?: string }[] = []
  
  // 匹配图片引用: ![caption](asset:asset_id) 或 [Image: caption](asset:asset_id)
  const imagePattern = /!\[([^\]]*)\]\(asset:([a-f0-9-]+)\)/gi
  let match
  while ((match = imagePattern.exec(text)) !== null) {
    results.push({
      type: 'image',
      id: match[2],
      caption: match[1] || undefined,
    })
  }
  
  // 匹配表格引用: [Table: caption](table:chunk_id)
  const tablePattern = /\[Table:\s*([^\]]*)\]\(table:([a-f0-9-]+)\)/gi
  while ((match = tablePattern.exec(text)) !== null) {
    results.push({
      type: 'table',
      id: match[2],
      caption: match[1] || undefined,
    })
  }
  
  // 匹配公式引用: [Equation: caption](equation:chunk_id)
  const equationPattern = /\[Equation:\s*([^\]]*)\]\(equation:([a-f0-9-]+)\)/gi
  while ((match = equationPattern.exec(text)) !== null) {
    results.push({
      type: 'equation',
      id: match[2],
      caption: match[1] || undefined,
    })
  }
  
  return results
}
