/**
 * 多模态公式显示组件
 * 使用 react-katex 官方组件，避免 DOM 操作问题
 */

import { useState, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Calculator, Copy, Check, Maximize2 } from 'lucide-react'
import { toast } from 'sonner'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

interface MultimodalEquationProps {
  /** LaTeX公式 */
  latex?: string
  /** 纯文本公式 */
  text?: string
  /** 公式标题/描述 */
  caption?: string
  /** 容器类名 */
  className?: string
  /** 是否为行内显示 */
  inline?: boolean
  /** 是否显示原始LaTeX */
  showSource?: boolean
}

export function MultimodalEquation({
  latex,
  text,
  caption,
  className,
  inline = false,
  showSource = false,
}: MultimodalEquationProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showLatex, setShowLatex] = useState(showSource)

  // 公式内容（清理掉外层数学模式包裹，避免 KaTeX 报错）
  const sanitizeLatex = (value?: string) => {
    if (!value) return value
    const trimmed = value.trim()
    if (
      (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) ||
      (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length > 2) ||
      (trimmed.startsWith('\\(') && trimmed.endsWith('\\)') && trimmed.length > 4) ||
      (trimmed.startsWith('\\[') && trimmed.endsWith('\\]') && trimmed.length > 4)
    ) {
      const stripLen = trimmed.startsWith('$$') ? 2 : 1
      if (trimmed.startsWith('\\(') || trimmed.startsWith('\\[')) {
        return trimmed.slice(2, -2).trim()
      }
      return trimmed.slice(stripLen, -stripLen).trim()
    }
    return trimmed
  }

  const safeLatex = sanitizeLatex(latex)
  const equationContent = safeLatex || text || ''

  // 处理展开
  const handleExpand = () => {
    setIsVisible(true)
  }

  // 处理收起
  const handleCollapse = () => {
    setIsVisible(false)
  }

  // 复制公式
  const handleCopy = async () => {
    await navigator.clipboard.writeText(equationContent)
    setCopied(true)
    toast.success(t('multimodal.equation.copySuccess'))
    setTimeout(() => setCopied(false), 2000)
  }

  // 无公式内容
  if (!equationContent) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4',
          className
        )}
      >
        <Calculator className="w-6 h-6 text-gray-400 mr-2" />
        <span className="text-gray-500">{t('multimodal.equation.noContent')}</span>
      </div>
    )
  }

  // 行内公式 - 始终渲染
  if (inline) {
    return (
      <span className={cn('inline-flex items-center', className)}>
        {safeLatex && typeof safeLatex === 'string' && safeLatex.trim() ? (
          <span className="mx-1">
            <InlineMath
              math={safeLatex}
              renderError={() => (
                <span className="text-red-500 text-sm">{t('multimodal.equation.renderFailed')}</span>
              )}
            />
          </span>
        ) : (
          <code className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-sm font-mono">
            {text}
          </code>
        )}
      </span>
    )
  }

  // 块级公式 - 添加折叠功能
  // 如果内容不可见，显示折叠按钮
  if (!isVisible) {
    return (
      <div className={cn('relative group', className)}>
        {caption && (
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <Calculator className="w-4 h-4 mr-2 text-purple-500" />
            {caption}
          </div>
        )}
        <div
          className="flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-6 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
          onClick={handleExpand}
        >
          <div className="text-center">
            <Calculator className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('multimodal.equation.viewContent')}</p>
          </div>
        </div>
      </div>
    )
  }

  // 显示公式内容
  return (
    <div className={cn('relative group', className)}>
      {caption && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
          <Calculator className="w-4 h-4 mr-2 text-purple-500" />
          {caption}
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* 渲染的公式 - 使用 ReactKatex 官方组件 */}
        <div className="p-4 flex items-center justify-center min-h-[60px]">
          {safeLatex && typeof safeLatex === 'string' && safeLatex.trim() ? (
            <BlockMath
              math={safeLatex}
              renderError={(error) => (
                <div className="text-center">
                  <p className="text-red-500 text-sm mb-1">{t('multimodal.equation.renderFailed')}</p>
                  <code className="text-xs text-gray-500 break-all">{error.message}</code>
                  <p className="text-xs text-gray-400 mt-2">{t('multimodal.equation.latexLabel')}: {safeLatex.slice(0, 100)}...</p>
                </div>
              )}
            />
          ) : (
            <code className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-mono text-lg">
              {text}
            </code>
          )}
        </div>

        {/* LaTeX源码（可选显示） */}
        {(showLatex || showSource) && safeLatex && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 p-3">
            <div className="text-xs text-gray-500 mb-1">{t('multimodal.equation.latexSource')}:</div>
            <code className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
              {safeLatex}
            </code>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1.5 bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md shadow-sm"
          onClick={handleCopy}
          title={t('multimodal.equation.copyTitle')}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
        {safeLatex && (
          <button
            className={cn(
              'p-1.5 rounded-md shadow-sm transition-colors',
              showLatex
                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400'
                : 'bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            )}
            onClick={() => setShowLatex(!showLatex)}
            title={showLatex ? t('multimodal.equation.hideSource') : t('multimodal.equation.showSource')}
          >
            <span className="text-xs font-mono">TeX</span>
          </button>
        )}
        <button
          className="p-1.5 bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md shadow-sm"
          onClick={handleCollapse}
          title={t('multimodal.equation.collapse')}
        >
          <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  )
}

// 使用 memo 优化，避免不必要的重新渲染
export default memo(MultimodalEquation)
