/**
 * 通用加载状态组件
 */

import { Loader2 } from 'lucide-react'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

export function Loading({ size = 'md', text, fullScreen = false }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`animate-spin text-brand-primary ${sizeClasses[size]}`} />
      {text && <p className={`text-muted-foreground ${textSizeClasses[size]}`}>{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        {content}
      </div>
    )
  }

  return <div className="flex items-center justify-center py-12">{content}</div>
}
