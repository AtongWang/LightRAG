/**
 * 多模态图片显示组件
 * 支持从API加载图片并显示，带有加载状态和错误处理
 */

import { useState, useEffect, useCallback, memo } from 'react'
import { cn } from '@/lib/utils'
import { Image as ImageIcon, Loader2, AlertCircle, ZoomIn, ExternalLink } from 'lucide-react'
import { createAssetBlobUrl, getAssetUrl } from '@/api/multimodal'

interface MultimodalImageProps {
  /** 资源ID */
  assetId?: string
  /** 直接的图片URL */
  src?: string
  /** Base64图片数据 */
  base64Data?: string
  /** MIME类型 */
  mimeType?: string
  /** 图片描述/alt文本 */
  alt?: string
  /** 图片标题 */
  caption?: string
  /** 容器类名 */
  className?: string
  /** 图片类名 */
  imageClassName?: string
  /** 是否显示为缩略图模式 */
  thumbnail?: boolean
  /** 点击时的处理函数 */
  onClick?: () => void
  /** 是否可放大查看 */
  zoomable?: boolean
  /** 最大宽度 */
  maxWidth?: number | string
  /** 最大高度 */
  maxHeight?: number | string
}

export function MultimodalImage({
  assetId,
  src,
  base64Data,
  mimeType = 'image/jpeg',
  alt = '多模态图片',
  caption,
  className,
  imageClassName,
  thumbnail = false,
  onClick,
  zoomable = true,
  maxWidth,
  maxHeight = thumbnail ? 150 : 400,
}: MultimodalImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)

  // 加载图片
  useEffect(() => {
    let blobUrl: string | null = null

    const loadImage = async () => {
      // 如果有直接的src，使用它
      if (src) {
        setImageSrc(src)
        return
      }

      // 如果有base64数据，构建data URL
      if (base64Data) {
        setImageSrc(`data:${mimeType};base64,${base64Data}`)
        return
      }

      // 如果有assetId，从API加载
      if (assetId) {
        setLoading(true)
        setError(null)
        try {
          blobUrl = await createAssetBlobUrl(assetId)
          setImageSrc(blobUrl)
        } catch (e) {
          console.error('Failed to load image:', e)
          setError('加载图片失败')
        } finally {
          setLoading(false)
        }
      }
    }

    loadImage()

    // 清理blob URL
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [assetId, src, base64Data, mimeType])

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick()
    } else if (zoomable && imageSrc) {
      setIsZoomed(true)
    }
  }, [onClick, zoomable, imageSrc])

  const handleCloseZoom = useCallback(() => {
    setIsZoomed(false)
  }, [])

  // 加载状态
  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg',
          thumbnail ? 'w-24 h-24' : 'w-full h-48',
          className
        )}
      >
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4',
          thumbnail ? 'w-24 h-24' : 'w-full h-48',
          className
        )}
      >
        <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
        <span className="text-xs text-gray-500">{error}</span>
      </div>
    )
  }

  // 无图片
  if (!imageSrc) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg',
          thumbnail ? 'w-24 h-24' : 'w-full h-48',
          className
        )}
      >
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    )
  }

  return (
    <>
      <figure className={cn('relative group', className)}>
        <div
          className={cn(
            'relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700',
            zoomable && 'cursor-zoom-in hover:border-blue-400 transition-colors'
          )}
          style={{ maxWidth, maxHeight }}
          onClick={handleClick}
        >
          <img
            src={imageSrc}
            alt={alt}
            className={cn(
              'object-contain w-full h-full',
              imageClassName
            )}
            style={{ maxHeight }}
          />
          {zoomable && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>
          )}
        </div>
        {caption && (
          <figcaption className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
            {caption}
          </figcaption>
        )}
      </figure>

      {/* 放大预览模态框 */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={handleCloseZoom}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={imageSrc}
              alt={alt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {caption && (
              <p className="mt-4 text-white text-center">{caption}</p>
            )}
            <button
              className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              onClick={handleCloseZoom}
            >
              ✕
            </button>
            {assetId && (
              <a
                href={getAssetUrl(assetId)}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 left-2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// 使用 memo 优化，避免不必要的重新渲染
export default memo(MultimodalImage)
