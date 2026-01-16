/**
 * 多模态表格显示组件
 * 支持渲染Markdown表格、HTML表格和CSV数据
 */

import { useState, useMemo, memo } from 'react'
import { cn } from '@/lib/utils'
import { Table2, Copy, Check, Maximize2, X } from 'lucide-react'
import { toast } from 'sonner'

interface MultimodalTableProps {
  /** 表格Markdown数据 */
  markdownData?: string
  /** 表格HTML */
  htmlData?: string
  /** CSV数据 */
  csvData?: string
  /** 表格标题 */
  caption?: string
  /** 容器类名 */
  className?: string
  /** 是否可展开全屏 */
  expandable?: boolean
  /** 最大高度 */
  maxHeight?: number | string
  /** 是否可点击弹窗查看 */
  zoomable?: boolean
}

/**
 * 解析Markdown表格为二维数组
 */
function parseMarkdownTable(markdown: string): { headers: string[]; rows: string[][] } {
  const lines = markdown.trim().split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    return { headers: [], rows: [] }
  }
  
  // 解析表头
  const headerLine = lines[0]
  const headers = headerLine
    .split('|')
    .map(cell => cell.trim())
    .filter(cell => cell)
  
  // 跳过分隔行 (---|---|---)
  const dataLines = lines.slice(2)
  
  // 解析数据行
  const rows = dataLines.map(line =>
    line
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell)
  )
  
  return { headers, rows }
}

/**
 * 解析CSV为二维数组
 */
function parseCSV(csv: string): { headers: string[]; rows: string[][] } {
  const lines = csv.trim().split('\n')
  
  if (lines.length < 1) {
    return { headers: [], rows: [] }
  }
  
  // 简单CSV解析（不处理引号内的逗号）
  const parseRow = (line: string) => line.split(',').map(cell => cell.trim())
  
  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(parseRow)
  
  return { headers, rows }
}

export function MultimodalTable({
  markdownData,
  htmlData,
  csvData,
  caption,
  className,
  expandable = true,
  maxHeight = 400,
  zoomable = true,
}: MultimodalTableProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)

  const htmlFromMarkdown = useMemo(() => {
    if (htmlData) return htmlData
    if (!markdownData) return undefined
    const trimmed = markdownData.trim()
    if (!trimmed) return undefined
    if (trimmed.startsWith('<table') || /<\s*table[\s>]/i.test(trimmed)) {
      return trimmed
    }
    return undefined
  }, [htmlData, markdownData])

  const markdownForParse = htmlFromMarkdown ? undefined : markdownData

  // 解析表格数据
  const tableData = useMemo(() => {
    if (markdownForParse) {
      return parseMarkdownTable(markdownForParse)
    }
    if (csvData) {
      return parseCSV(csvData)
    }
    return { headers: [], rows: [] }
  }, [markdownForParse, csvData])

  const handleOpenZoom = () => {
    if (zoomable) setIsZoomed(true)
  }

  const handleCloseZoom = () => {
    setIsZoomed(false)
  }

  // 复制表格数据
  const handleCopy = async () => {
    const textToCopy = markdownData || csvData || ''
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      toast.success('表格数据已复制')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const renderTrigger = (label?: string) => (
    <div className={cn('relative group', className)}>
      {caption && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
          <Table2 className="w-4 h-4 mr-2 text-blue-500" />
          {caption}
        </div>
      )}
      <div
        className="flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-6 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
        onClick={handleOpenZoom}
      >
        <div className="text-center">
          <Table2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {label || '点击查看表格内容'}
          </p>
        </div>
      </div>
    </div>
  )

  const TableContent = () => (
    <table className="w-full text-sm border border-gray-200 dark:border-gray-700 border-collapse">
      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
        <tr>
          {tableData.headers.map((header, index) => (
            <th
              key={index}
              className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
        {tableData.rows.map((row, rowIndex) => (
          <tr
            key={rowIndex}
            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            {row.map((cell, cellIndex) => (
              <td
                key={cellIndex}
                className="px-4 py-3 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )

  const HtmlTableContent = ({ compact }: { compact?: boolean }) => (
    <div
      className={cn(
        'overflow-auto rounded-lg border border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-900',
        '[&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-gray-200 dark:[&_table]:border-gray-700',
        '[&_th]:border [&_th]:border-gray-200 dark:[&_th]:border-gray-700 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left',
        '[&_td]:border [&_td]:border-gray-200 dark:[&_td]:border-gray-700 [&_td]:px-4 [&_td]:py-2',
        compact ? 'max-h-full' : ''
      )}
      style={{ maxHeight: compact ? 'none' : (isExpanded ? 'none' : maxHeight) }}
      dangerouslySetInnerHTML={{ __html: htmlFromMarkdown || '' }}
    />
  )

  // 统一使用弹窗查看
  if (htmlFromMarkdown) {
    return (
      <>
        {renderTrigger()}
        {isZoomed && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={handleCloseZoom}
          >
            <div className="relative max-w-[92vw] max-h-[90vh] w-full">
              {caption && (
                <p className="mb-4 text-white text-center">{caption}</p>
              )}
              <div
                className="bg-white dark:bg-gray-900 rounded-lg p-2 max-h-[80vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <HtmlTableContent compact />
              </div>
              <button
                className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                onClick={handleCloseZoom}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // 渲染解析后的表格
  if (tableData.headers.length === 0) {
    return renderTrigger('无表格数据')
  }

  return (
    <>
      {renderTrigger()}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={handleCloseZoom}
        >
          <div className="relative max-w-[92vw] max-h-[90vh] w-full">
            {caption && (
              <p className="mb-4 text-white text-center">{caption}</p>
            )}
            <div
              className="bg-white dark:bg-gray-900 rounded-lg p-2 max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <TableContent />
            </div>
            <button
              className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              onClick={handleCloseZoom}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// 使用 memo 优化，避免不必要的重新渲染
export default memo(MultimodalTable)
