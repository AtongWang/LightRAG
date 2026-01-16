/**
 * 统一的多模态内容渲染组件
 * 根据内容类型自动选择合适的渲染方式
 */

import { cn } from '@/lib/utils'
import { MultimodalImage } from './MultimodalImage'
import { MultimodalTable } from './MultimodalTable'
import { MultimodalEquation } from './MultimodalEquation'
import type { MultimodalType, MultimodalChunkInfo, MultimodalQueryResult } from '@/types/multimodal'
import { MULTIMODAL_ICONS } from '@/types/multimodal'

interface MultimodalContentProps {
  /** 多模态内容类型 */
  type: MultimodalType
  /** 内容描述 */
  description?: string
  /** 资源ID（用于图片） */
  assetId?: string
  /** 资源URL */
  assetUrl?: string
  /** 缩略图URL */
  thumbnailUrl?: string
  /** Base64图片数据 */
  imageData?: string
  /** 表格HTML */
  tableHtml?: string
  /** 表格Markdown数据 */
  tableMarkdown?: string
  /** LaTeX公式 */
  equationLatex?: string
  /** 标题/描述 */
  caption?: string
  /** 来源文件 */
  sourceFile?: string
  /** 页码 */
  pageIndex?: number
  /** 容器类名 */
  className?: string
  /** 是否紧凑模式 */
  compact?: boolean
  /** 点击回调 */
  onClick?: () => void
}

export function MultimodalContent({
  type,
  description,
  assetId,
  assetUrl,
  thumbnailUrl: _thumbnailUrl,
  imageData,
  tableHtml,
  tableMarkdown,
  equationLatex,
  caption,
  sourceFile,
  pageIndex,
  className,
  compact = false,
  onClick,
}: MultimodalContentProps) {
  // 根据类型渲染对应内容
  const renderContent = () => {
    switch (type) {
      case 'image':
        return (
          <MultimodalImage
            assetId={assetId}
            src={assetUrl}
            base64Data={imageData}
            alt={caption || description}
            caption={caption}
            thumbnail={compact}
            onClick={onClick}
            maxHeight={compact ? 150 : 400}
          />
        )

      case 'table':
        return (
          <MultimodalTable
            htmlData={tableHtml}
            markdownData={tableMarkdown}
            caption={caption}
            expandable={!compact}
            maxHeight={compact ? 200 : 400}
          />
        )

      case 'equation':
        return (
          <MultimodalEquation
            latex={equationLatex}
            text={description}
            caption={caption}
          />
        )

      default:
        // 通用/未知类型
        return (
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center mb-2">
              <span className="text-xl mr-2">{MULTIMODAL_ICONS[type] || '📎'}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {caption || `${type}内容`}
              </span>
            </div>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        )
    }
  }

  return (
    <div className={cn('relative', className)}>
      {renderContent()}
      
      {/* 来源信息 */}
      {(sourceFile || pageIndex !== undefined) && !compact && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
          {sourceFile && <span>来源: {sourceFile}</span>}
          {pageIndex !== undefined && <span>第 {pageIndex + 1} 页</span>}
        </div>
      )}
    </div>
  )
}

/**
 * 从 MultimodalChunkInfo 渲染内容
 */
export function MultimodalChunkContent({
  chunk,
  className,
  compact = false,
}: {
  chunk: MultimodalChunkInfo
  className?: string
  compact?: boolean
}) {
  return (
    <MultimodalContent
      type={chunk.content_type}
      description={chunk.description}
      assetId={chunk.asset_id}
      assetUrl={chunk.asset_url}
      thumbnailUrl={chunk.thumbnail_url}
      tableHtml={chunk.table_html}
      tableMarkdown={chunk.table_data}
      equationLatex={chunk.equation_latex}
      caption={chunk.entity_name}
      sourceFile={chunk.source_file}
      pageIndex={chunk.page_index}
      className={className}
      compact={compact}
    />
  )
}

/**
 * 从 MultimodalQueryResult 渲染内容
 */
export function MultimodalQueryResultContent({
  result,
  className,
  compact = false,
}: {
  result: MultimodalQueryResult
  className?: string
  compact?: boolean
}) {
  return (
    <MultimodalContent
      type={result.content_type}
      description={result.description}
      assetUrl={result.asset_url}
      thumbnailUrl={result.thumbnail_url}
      imageData={result.image_data}
      tableHtml={result.table_html}
      tableMarkdown={result.table_markdown}
      equationLatex={result.equation_latex}
      sourceFile={result.source_file}
      pageIndex={result.page_index}
      className={className}
      compact={compact}
    />
  )
}

/**
 * 多模态内容卡片
 */
export function MultimodalCard({
  type,
  title,
  description,
  assetUrl,
  thumbnailUrl,
  onClick,
  className,
}: {
  type: MultimodalType
  title: string
  description?: string
  assetUrl?: string
  thumbnailUrl?: string
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700',
        'hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800/50',
        'transition-colors cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* 缩略图/图标 */}
      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {thumbnailUrl || assetUrl ? (
          <img
            src={thumbnailUrl || assetUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl">{MULTIMODAL_ICONS[type]}</span>
        )}
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {title}
        </div>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
            {description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {type}
          </span>
        </div>
      </div>
    </div>
  )
}

export default MultimodalContent
