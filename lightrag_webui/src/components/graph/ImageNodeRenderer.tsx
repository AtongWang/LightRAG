import React, { useState, useRef, useEffect } from 'react'
import { useSigma } from '@react-sigma/core'
import { useTranslation } from 'react-i18next'

interface ImageNodeRendererProps {
  /**
   * Node ID to render
   */
  nodeId: string
  /**
   * Image URL to display
   */
  imageUrl: string
  /**
   * Alternative text for the image
   */
  alt?: string
  /**
   * Size of the node (in sigma coordinates)
   */
  size?: number
  /**
   * Border color based on entity type
   */
  borderColor?: string
  /**
   * Border width
   */
  borderWidth?: number
}

/**
 * ImageNodeRenderer - Component for rendering image nodes in the knowledge graph
 *
 * Features:
 * - Circular clipping for images
 * - Border based on entity type
 * - Fallback handling for image load failures
 * - Tooltip with node label
 */
function ImageNodeRenderer({
  nodeId,
  imageUrl,
  alt,
  size = 10,
  borderColor = '#F57F17',
  borderWidth = 2
}: ImageNodeRendererProps) {
  const sigma = useSigma()
  const { t } = useTranslation()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const handleLoad = () => {
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
      setImageLoaded(true)
    }

    const handleError = () => {
      console.error(`Failed to load image for node ${nodeId}:`, imageUrl)
      setImageError(true)
    }

    img.addEventListener('load', handleLoad)
    img.addEventListener('error', handleError)

    // Check if already loaded
    if (img.complete) {
      handleLoad()
    }

    return () => {
      img.removeEventListener('load', handleLoad)
      img.removeEventListener('error', handleError)
    }
  }, [imageUrl, nodeId])

  // Get node label from sigma graph
  const getNodeLabel = () => {
    try {
      const graph = sigma.getGraph()
      if (graph.hasNode(nodeId)) {
        return graph.getNodeAttribute(nodeId, 'label') || nodeId
      }
    } catch (error) {
      console.error('Error getting node label:', error)
    }
    return nodeId
  }

  const nodeLabel = getNodeLabel()

  // Calculate circular dimensions
  const nodeRadius = size / 2
  const borderWidthScaled = borderWidth * 0.2 // Scale border width for sigma

  return (
    <>
      {/* Hidden image element for preloading */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt={alt || nodeLabel}
        className="hidden"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />

      {/* Render instructions - actual rendering is done by sigma */}
      {imageError && (
        <div className="text-xs text-red-500">
          {t('graphPanel.imageNode.loadError', 'Failed to load image')}
        </div>
      )}
    </>
  )
}

/**
 * Custom rendering function for image nodes in Sigma.js
 * This should be used with a custom node program
 */
export const renderImageNode = (
  context: CanvasRenderingContext2D,
  data: {
    x: number
    y: number
    size: number
    color: string
    borderColor?: string
    image?: HTMLImageElement
    label?: string
  },
  settings: any
) => {
  const { x, y, size, borderColor, image, label } = data

  // Draw circular border
  if (borderColor) {
    context.beginPath()
    context.arc(x, y, size / 2 + 1, 0, 2 * Math.PI)
    context.fillStyle = borderColor
    context.fill()
  }

  // Draw circular image
  if (image) {
    context.save()
    context.beginPath()
    context.arc(x, y, size / 2, 0, 2 * Math.PI)
    context.clip()

    // Draw image centered in the circle
    const aspectRatio = image.width / image.height
    let drawWidth = size
    let drawHeight = size

    if (aspectRatio > 1) {
      drawHeight = size / aspectRatio
    } else {
      drawWidth = size * aspectRatio
    }

    context.drawImage(
      image,
      x - drawWidth / 2,
      y - drawHeight / 2,
      drawWidth,
      drawHeight
    )
    context.restore()
  } else {
    // Fallback: draw colored circle
    context.beginPath()
    context.arc(x, y, size / 2, 0, 2 * Math.PI)
    context.fillStyle = data.color || '#999999'
    context.fill()
  }
}

/**
 * Hook to preload and cache images for nodes
 */
export const useImageCache = () => {
  const [imageCache, setImageCache] = useState<Map<string, HTMLImageElement>>(new Map())
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())

  const loadImage = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      // Check cache first
      if (imageCache.has(url)) {
        resolve(imageCache.get(url)!)
        return
      }

      // Check if already loading
      if (loadingImages.has(url)) {
        // Wait for existing load to complete
        const checkInterval = setInterval(() => {
          if (imageCache.has(url) || !loadingImages.has(url)) {
            clearInterval(checkInterval)
            resolve(imageCache.get(url) || null)
          }
        }, 100)
        return
      }

      // Mark as loading
      setLoadingImages((prev) => new Set(prev).add(url))

      const img = new Image()
      img.onload = () => {
        setImageCache((prev) => new Map(prev).set(url, img))
        setLoadingImages((prev) => {
          const next = new Set(prev)
          next.delete(url)
          return next
        })
        resolve(img)
      }
      img.onerror = () => {
        setLoadingImages((prev) => {
          const next = new Set(prev)
          next.delete(url)
          return next
        })
        resolve(null)
      }
      img.src = url
    })
  }

  return { imageCache, loadImage }
}

export default ImageNodeRenderer
export { ImageNodeRenderer }
