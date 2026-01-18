/**
 * 多模态内容类型定义
 * 支持图片、表格、公式等多模态内容在知识图谱和问答中的展示
 */

// 多模态内容类型
export type MultimodalType = 'image' | 'table' | 'equation' | 'audio' | 'video' | 'generic'

/**
 * 多模态元数据
 * 用于标识节点或chunk是否包含多模态内容
 */
export interface MultimodalMetadata {
  /** 是否包含多模态内容 */
  is_multimodal: boolean
  /** 多模态内容类型 */
  modal_type?: MultimodalType
  /** 资源ID（用于获取实际文件） */
  asset_id?: string
  /** 原始文件路径 */
  asset_path?: string
  /** 缩略图路径 */
  thumbnail_path?: string
  /** MIME类型 */
  mime_type?: string
  /** 图片描述/标题 */
  image_caption?: string
  /** 表格数据（Markdown或CSV格式） */
  table_data?: string
  /** 表格HTML（用于渲染） */
  table_html?: string
  /** LaTeX公式 */
  equation_latex?: string
  /** 公式文本 */
  equation_text?: string
  /** 源文档中的页码 */
  page_index?: number
  /** 源文档 */
  source_document?: string
  /** AI增强描述 */
  enhanced_description?: string
}

/**
 * 多模态资源
 * 存储的实际文件信息
 */
export interface MultimodalAsset {
  /** 资源唯一ID */
  asset_id: string
  /** 多模态类型 */
  modal_type: MultimodalType
  /** 存储路径 */
  file_path: string
  /** 原始文件名 */
  original_filename?: string
  /** MIME类型 */
  mime_type: string
  /** 文件大小（字节） */
  file_size: number
  /** 图片宽度 */
  width?: number
  /** 图片高度 */
  height?: number
  /** 缩略图路径 */
  thumbnail_path?: string
  /** 创建时间 */
  created_at: string
  /** 额外元数据 */
  metadata: Record<string, unknown>
}

/**
 * 多模态资源响应
 */
export interface AssetMetadataResponse {
  asset_id: string
  modal_type: string
  original_filename?: string
  mime_type: string
  file_size: number
  width?: number
  height?: number
  created_at: string
  asset_url: string
  thumbnail_url?: string
  metadata: Record<string, unknown>
}

/**
 * 资源列表响应
 */
export interface AssetListResponse {
  assets: AssetMetadataResponse[]
  total: number
  limit: number
  offset: number
}

/**
 * 存储统计响应
 */
export interface StorageStatsResponse {
  total_assets: number
  total_size_bytes: number
  total_size_mb: number
  assets_by_type: Record<string, number>
  storage_path: string
}

/**
 * 多模态Chunk信息
 */
export interface MultimodalChunkInfo {
  /** Chunk ID */
  chunk_id: string
  /** 内容类型 */
  content_type: MultimodalType
  /** 描述文本 */
  description: string
  /** 关联的资源ID */
  asset_id?: string
  /** 资源访问URL */
  asset_url?: string
  /** 缩略图URL */
  thumbnail_url?: string
  /** 表格HTML内容 */
  table_html?: string
  /** 表格Markdown数据 */
  table_data?: string
  /** LaTeX公式 */
  equation_latex?: string
  /** 源文件 */
  source_file?: string
  /** 页码 */
  page_index?: number
  /** 实体名称（如 Figure_1, Table_2） */
  entity_name?: string
}

/**
 * 多模态实体信息
 * 知识图谱中代表多模态内容的实体
 */
export interface MultimodalEntityInfo {
  /** 实体ID */
  entity_id: string
  /** 实体名称 */
  entity_name: string
  /** 实体类型 (image, table, figure, equation等) */
  entity_type: string
  /** 描述 */
  description: string
  /** 来源chunk ID */
  source_id: string
  /** 源文件路径 */
  file_path: string
  /** 多模态元数据 */
  multimodal?: MultimodalMetadata
}

/**
 * 查询中的多模态结果
 * 用于在问答响应中展示多模态内容
 */
export interface MultimodalQueryResult {
  /** 内容类型 */
  content_type: MultimodalType
  /** 内容ID */
  content_id: string
  /** 资源ID */
  asset_id?: string
  /** 文本描述 */
  description: string
  /** 资源访问URL */
  asset_url?: string
  /** 缩略图URL */
  thumbnail_url?: string
  /** Base64图片数据（用于内联显示） */
  image_data?: string
  /** 完整的Data URL */
  data_url?: string
  /** HTML表格 */
  table_html?: string
  /** Markdown表格 */
  table_markdown?: string
  /** LaTeX公式 */
  equation_latex?: string
  /** 源文件 */
  source_file?: string
  /** 页码 */
  page_index?: number
  /** 相关性分数 */
  relevance_score?: number
}

/**
 * 增强的知识图谱节点（包含多模态信息）
 */
export interface MultimodalNodeType {
  id: string
  labels: string[]
  properties: Record<string, unknown>
  /** 是否为多模态节点 */
  is_multimodal?: boolean
  /** 多模态类型 */
  modal_type?: MultimodalType
  /** 缩略图URL（用于图谱中显示） */
  thumbnail_url?: string
  /** 完整资源URL */
  asset_url?: string
}

/**
 * 检查节点是否为多模态节点
 */
export function isMultimodalNode(node: { properties?: Record<string, unknown> }): boolean {
  if (!node.properties) return false
  
  const props = node.properties
  const meta = (props.multimodal_meta && typeof props.multimodal_meta === 'object')
    ? (props.multimodal_meta as Record<string, unknown>)
    : null
  
  // 检查显式的多模态标记
  if (props.is_multimodal === true || meta?.is_multimodal === true) return true
  
  // 检查显式的多模态类型
  if (props.modal_type || meta?.modal_type) return true
  
  // 检查常见多模态字段
  if (
    props.asset_id || props.asset_path || props.img_path ||
    props.table_html || props.table_body || props.table_data || props.table_markdown ||
    props.equation_latex || props.equation_text ||
    meta?.asset_id || meta?.asset_path || meta?.img_path ||
    meta?.table_html || meta?.table_body || meta?.table_data || meta?.table_markdown ||
    meta?.equation_latex || meta?.equation_text
  ) {
    return true
  }
  
  // 检查实体类型
  const entityType = (props.entity_type as string || '').toLowerCase()
  if (['image', 'table', 'figure', 'equation', 'chart', 'diagram'].includes(entityType)) {
    return true
  }
  
  // 检查实体名称模式
  const entityName = (props.entity_name as string || props.id as string || '').toLowerCase()
  const multimodalPrefixes = ['figure_', 'table_', 'image_', 'equation_', 'chart_', 'diagram_']
  if (multimodalPrefixes.some(prefix => entityName.startsWith(prefix))) {
    return true
  }
  
  return false
}

/**
 * 获取多模态节点的类型
 */
export function getMultimodalNodeType(node: { properties?: Record<string, unknown> }): MultimodalType | null {
  if (!node.properties || !isMultimodalNode(node)) return null
  
  const props = node.properties
  const meta = (props.multimodal_meta && typeof props.multimodal_meta === 'object')
    ? (props.multimodal_meta as Record<string, unknown>)
    : null
  const entityType = (props.entity_type as string || '').toLowerCase()
  const entityName = (props.entity_name as string || props.id as string || '').toLowerCase()
  
  // 优先使用显式的多模态类型
  const explicitType = (props.modal_type || meta?.modal_type) as MultimodalType | undefined
  if (explicitType) return explicitType
  
  // 基于内容字段判断
  if (
    props.table_html || props.table_body || props.table_data || props.table_markdown ||
    meta?.table_html || meta?.table_body || meta?.table_data || meta?.table_markdown
  ) {
    return 'table'
  }
  if (props.equation_latex || props.equation_text || meta?.equation_latex || meta?.equation_text) {
    return 'equation'
  }
  if (props.asset_id || props.asset_path || props.img_path || meta?.asset_id || meta?.asset_path || meta?.img_path) {
    return 'image'
  }
  
  // 基于实体类型判断
  if (entityType === 'image' || entityType === 'figure') return 'image'
  if (entityType === 'table') return 'table'
  if (entityType === 'equation') return 'equation'
  if (entityType === 'chart' || entityType === 'diagram') return 'image'
  
  // 基于名称模式判断
  if (entityName.startsWith('figure_') || entityName.startsWith('image_')) return 'image'
  if (entityName.startsWith('table_')) return 'table'
  if (entityName.startsWith('equation_')) return 'equation'
  if (entityName.startsWith('chart_') || entityName.startsWith('diagram_')) return 'image'
  
  return 'generic'
}

/**
 * 多模态节点的显示图标映射
 */
export const MULTIMODAL_ICONS: Record<MultimodalType, string> = {
  image: '🖼️',
  table: '📊',
  equation: '📐',
  audio: '🔊',
  video: '🎬',
  generic: '📎',
}

/**
 * 多模态节点的颜色映射
 */
export const MULTIMODAL_COLORS: Record<MultimodalType, string> = {
  image: '#4CAF50',    // 绿色
  table: '#2196F3',    // 蓝色
  equation: '#9C27B0', // 紫色
  audio: '#FF9800',    // 橙色
  video: '#F44336',    // 红色
  generic: '#607D8B',  // 灰色
}
