/**
 * 多模态消息渲染组件
 * 用于在聊天中展示包含图片、表格、公式等多模态内容的消息
 */

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { cn } from '@/lib/utils'
import { MultimodalImage, MultimodalTable, MultimodalEquation } from '@/components/multimodal'
import type { MultimodalQueryResult, MultimodalChunkInfo } from '@/types/multimodal'
import { MULTIMODAL_ICONS } from '@/types/multimodal'
import 'katex/dist/katex.min.css'

interface MultimodalMessageProps {
  /** 消息内容 (Markdown格式) */
  content: string
  /** 关联的多模态内容 */
  multimodalContent?: MultimodalQueryResult[]
  /** 是否为用户消息 */
  isUser?: boolean
  /** 额外的CSS类名 */
  className?: string
}

/**
 * 从Markdown内容中提取多模态引用
 */
function extractMultimodalReferences(content: string): {
  type: 'image' | 'table' | 'equation'
  id: string
  placeholder: string
}[] {
  const refs: { type: 'image' | 'table' | 'equation'; id: string; placeholder: string }[] = []
  
  // 匹配 ![Figure_X](asset:xxx) 格式的图片引用
  const imageRegex = /!\[([^\]]*)\]\(asset:([a-zA-Z0-9_-]+)\)/g
  let match
  while ((match = imageRegex.exec(content)) !== null) {
    refs.push({
      type: 'image',
      id: match[2],
      placeholder: match[0],
    })
  }
  
  // 匹配 [Table: xxx](table:xxx) 格式
  const tableRegex = /\[Table[:\s]*([^\]]*)\]\(table:([a-zA-Z0-9_-]+)\)/gi
  while ((match = tableRegex.exec(content)) !== null) {
    refs.push({
      type: 'table',
      id: match[2],
      placeholder: match[0],
    })
  }
  
  // 匹配 [Equation: xxx](equation:xxx) 格式
  const eqRegex = /\[Equation[:\s]*([^\]]*)\]\(equation:([a-zA-Z0-9_-]+)\)/gi
  while ((match = eqRegex.exec(content)) !== null) {
    refs.push({
      type: 'equation',
      id: match[2],
      placeholder: match[0],
    })
  }
  
  return refs
}

/**
 * 多模态内容卡片
 */
function MultimodalContentCard({
  item,
  compact = false,
}: {
  item: MultimodalQueryResult | MultimodalChunkInfo
  compact?: boolean
}) {
  const type = 'content_type' in item ? item.content_type : 'generic'
  
  return (
    <div className={cn(
      "my-3 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden",
      "bg-gray-50 dark:bg-gray-800/50"
    )}>
      {/* 标题栏 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-lg">{MULTIMODAL_ICONS[type] || '📎'}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {type === 'image' ? '图片' : type === 'table' ? '表格' : type === 'equation' ? '公式' : '附件'}
        </span>
        {('source_file' in item && item.source_file) && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            来源: {item.source_file}
          </span>
        )}
      </div>
      
      {/* 内容区域 */}
      <div className="p-3">
        {type === 'image' && (
          <MultimodalImage
            assetId={'asset_id' in item ? item.asset_id : undefined}
            src={'asset_url' in item ? item.asset_url : undefined}
            base64Data={'image_data' in item ? item.image_data : undefined}
            alt={item.description}
            thumbnail={compact}
            maxHeight={compact ? 150 : 300}
          />
        )}
        
        {type === 'table' && (
          <MultimodalTable
            htmlData={'table_html' in item ? item.table_html : undefined}
            markdownData={'table_markdown' in item ? item.table_markdown : ('table_data' in item ? item.table_data : undefined)}
            maxHeight={compact ? 150 : 300}
            expandable={!compact}
          />
        )}
        
        {type === 'equation' && (
          <MultimodalEquation
            latex={'equation_latex' in item ? item.equation_latex : undefined}
          />
        )}
        
        {/* 描述文本 */}
        {item.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {item.description.length > 200 && compact
              ? `${item.description.slice(0, 200)}...`
              : item.description}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * 多模态消息渲染组件
 */
export function MultimodalMessage({
  content,
  multimodalContent,
  isUser: _isUser = false,
  className,
}: MultimodalMessageProps) {
  // 检测内容中是否有多模态引用
  const references = useMemo(() => extractMultimodalReferences(content), [content])
  
  // 如果没有多模态内容，使用普通Markdown渲染
  if ((!multimodalContent || multimodalContent.length === 0) && references.length === 0) {
    return (
      <div className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "text-sm leading-relaxed",
        "prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
        "prose-pre:my-2 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800",
        "prose-code:text-[hsl(var(--vermillion))] prose-code:bg-[hsl(var(--muted))]",
        "prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-code:before:content-none prose-code:after:content-none",
        className
      )}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* 渲染主要文本内容 */}
      <div className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "text-sm leading-relaxed",
        "prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
        "prose-pre:my-2 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800",
        "prose-code:text-[hsl(var(--vermillion))] prose-code:bg-[hsl(var(--muted))]",
        "prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-code:before:content-none prose-code:after:content-none",
      )}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {content}
        </ReactMarkdown>
      </div>
      
      {/* 渲染附带的多模态内容 */}
      {multimodalContent && multimodalContent.length > 0 && (
        <div className="space-y-2 mt-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            相关多模态内容:
          </div>
          {multimodalContent.map((item, index) => (
            <MultimodalContentCard
              key={`${item.content_id}-${index}`}
              item={item}
              compact={multimodalContent.length > 2}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 简化的多模态内容预览
 */
export function MultimodalPreview({
  items,
  maxItems = 3,
  onViewAll,
}: {
  items: (MultimodalQueryResult | MultimodalChunkInfo)[]
  maxItems?: number
  onViewAll?: () => void
}) {
  const displayItems = items.slice(0, maxItems)
  const hasMore = items.length > maxItems
  
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {displayItems.map((item, index) => {
          const type = 'content_type' in item ? item.content_type : 'generic'
          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg",
                "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                "hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
              )}
            >
              <span className="text-xl">{MULTIMODAL_ICONS[type]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {type === 'image' ? '图片' : type === 'table' ? '表格' : type === 'equation' ? '公式' : '附件'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {item.description?.slice(0, 50) || '无描述'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {hasMore && onViewAll && (
        <button
          onClick={onViewAll}
          className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
        >
          查看全部 {items.length} 项多模态内容 →
        </button>
      )}
    </div>
  )
}

export default MultimodalMessage
