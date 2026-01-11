/**
 * 文档预览组件
 * 支持 PDF、图片、文本等多种文件格式的预览
 */

import { useState, useEffect, useRef } from 'react'
import { FileText, Download, X, Loader2, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface DocumentViewerProps {
  doc: {
    doc_id: string
    filename: string
    file_type: string
    content_length: number
    content: string
    content_type: 'text' | 'pdf' | 'image' | 'document' | 'binary'
    is_full_content: boolean
    created_at: string
    status: string
  }
  previewUrl: string
  onClose: () => void
  onDownload: () => void
}

export default function DocumentViewer({ doc, previewUrl, onClose, onDownload }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 加载PDF文件
  useEffect(() => {
    if (doc.content_type === 'pdf') {
      setLoading(true)
      setError(null)
      
      // 使用 fetch 获取 PDF blob 然后创建 blob URL
      fetch(previewUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.blob()
        })
        .then(blob => {
          const url = URL.createObjectURL(blob)
          setPdfDataUrl(url)
          setLoading(false)
        })
        .catch(err => {
          console.error('Failed to load PDF:', err)
          setError('无法加载PDF文件')
          setLoading(false)
        })
      
      return () => {
        if (pdfDataUrl) {
          URL.revokeObjectURL(pdfDataUrl)
        }
      }
    } else {
      setLoading(false)
    }
  }, [previewUrl, doc.content_type])

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === '+' || e.key === '=') {
        setScale(s => Math.min(s + 0.25, 3))
      } else if (e.key === '-') {
        setScale(s => Math.max(s - 0.25, 0.5))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 3))
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.5))
  const handleRotate = () => setRotation(r => (r + 90) % 360)
  const handleResetView = () => {
    setScale(1)
    setRotation(0)
  }

  // 渲染文本内容
  const renderTextContent = () => (
    <div className="h-full overflow-auto p-4">
      <pre className="whitespace-pre-wrap break-words text-sm font-mono bg-white dark:bg-gray-800 p-6 rounded-lg shadow-inner min-h-full">
        {doc.content}
      </pre>
      {!doc.is_full_content && (
        <div className="text-center py-4 text-amber-600 dark:text-amber-400 text-sm">
          ⚠️ 内容已截断，显示前 {doc.content_length} 字符
        </div>
      )}
    </div>
  )

  // 渲染PDF内容 - 使用 iframe 嵌入浏览器原生PDF查看器
  const renderPdfContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto text-[hsl(var(--vermillion))] animate-spin mb-4" />
            <p className="text-muted-foreground">加载PDF文件中...</p>
          </div>
        </div>
      )
    }

    if (error || !pdfDataUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">{error || '无法预览PDF文件'}</p>
            <p className="text-sm text-muted-foreground mb-4">请尝试下载后使用专业PDF阅读器查看</p>
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-[hsl(var(--vermillion))] text-white rounded-lg hover:bg-[hsl(var(--vermillion)/0.8)] transition flex items-center gap-2 mx-auto"
            >
              <Download className="w-4 h-4" />
              下载PDF文件
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="h-full w-full relative">
        <iframe
          ref={iframeRef}
          src={`${pdfDataUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          className="w-full h-full border-0 rounded-lg"
          title={doc.filename}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        />
      </div>
    )
  }

  // 渲染图片内容
  const renderImageContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 text-[hsl(var(--vermillion))] animate-spin" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-[hsl(var(--vermillion))] text-white rounded-lg hover:bg-[hsl(var(--vermillion)/0.8)] transition"
            >
              下载图片
            </button>
          </div>
        </div>
      )
    }

    return (
      <div 
        ref={containerRef}
        className="h-full w-full flex items-center justify-center overflow-auto p-4"
      >
        <img
          src={previewUrl}
          alt={doc.filename}
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg transition-transform duration-200"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            setError('无法加载图片')
          }}
        />
      </div>
    )
  }

  // 渲染不支持预览的文档
  const renderUnsupportedContent = () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <FileText className="w-20 h-20 mx-auto text-muted-foreground mb-6" />
        <h3 className="text-lg font-medium mb-2">{doc.filename}</h3>
        <p className="text-muted-foreground mb-2">
          {doc.content_type === 'document' ? '文档类型' : '二进制文件'}
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          此文件类型不支持在线预览，请下载后使用专业软件打开
        </p>
        <button
          onClick={onDownload}
          className="px-6 py-3 bg-[hsl(var(--vermillion))] text-white rounded-lg hover:bg-[hsl(var(--vermillion)/0.8)] transition flex items-center gap-2 mx-auto"
        >
          <Download className="w-5 h-5" />
          下载文件
        </button>
      </div>
    </div>
  )

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[95vw] h-[95vh] max-w-7xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-5 h-5 text-[hsl(var(--vermillion))] flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate">{doc.filename}</h3>
              <p className="text-xs text-muted-foreground">
                {doc.file_type} · {doc.content_type === 'text' ? `${doc.content_length} 字符` : `${(doc.content_length / 1024).toFixed(2)} KB`}
                {!doc.is_full_content && ' · 部分内容'}
              </p>
            </div>
          </div>

          {/* 工具栏 */}
          <div className="flex items-center gap-1">
            {(doc.content_type === 'pdf' || doc.content_type === 'image') && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                  title="缩小 (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-muted-foreground px-2 min-w-[4rem] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                  title="放大 (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                <button
                  onClick={handleRotate}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                  title="旋转"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetView}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                  title="重置"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
              </>
            )}
            <button
              onClick={onDownload}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
              title="下载"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition ml-1"
              title="关闭 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-950">
          {doc.content_type === 'text' && renderTextContent()}
          {doc.content_type === 'pdf' && renderPdfContent()}
          {doc.content_type === 'image' && renderImageContent()}
          {(doc.content_type === 'document' || doc.content_type === 'binary') && renderUnsupportedContent()}
        </div>

        {/* 底部信息栏 */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-muted-foreground">
          <span>
            上传于 {formatDistanceToNow(new Date(doc.created_at), {
              addSuffix: true,
              locale: zhCN
            })}
          </span>
          <span className="text-xs">
            按 <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd> 关闭 · 
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs ml-1">+</kbd>/<kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">-</kbd> 缩放
          </span>
        </div>
      </div>
    </div>
  )
}
