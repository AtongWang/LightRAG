/**
 * 迷你地图组件
 * 显示图谱的缩略图和当前可视区域
 */

import { useState, useEffect, useRef } from 'react'

interface MiniMapProps {
  width?: number
  height?: number
  graphBounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  viewportBounds?: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  nodes: Array<{
    x: number
    y: number
    color?: string
  }>
  onViewportChange?: (bounds: MiniMapProps['viewportBounds']) => void
}

export function MiniMap({
  width = 200,
  height = 150,
  graphBounds,
  viewportBounds,
  nodes,
  onViewportChange
}: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, width, height)

    // 计算缩放比例
    const scaleX = width / (graphBounds.maxX - graphBounds.minX)
    const scaleY = height / (graphBounds.maxY - graphBounds.minY)
    const scale = Math.min(scaleX, scaleY)

    // 绘制节点
    nodes.forEach(node => {
      const x = (node.x - graphBounds.minX) * scale
      const y = (node.y - graphBounds.minY) * scale

      ctx.beginPath()
      ctx.arc(x, y, 2, 0, 2 * Math.PI)
      ctx.fillStyle = node.color || '#999'
      ctx.fill()
    })

    // 绘制视口矩形
    if (viewportBounds) {
      const viewportX = (viewportBounds.minX - graphBounds.minX) * scale
      const viewportY = (viewportBounds.minY - graphBounds.minY) * scale
      const viewportWidth = (viewportBounds.maxX - viewportBounds.minX) * scale
      const viewportHeight = (viewportBounds.maxY - viewportBounds.minY) * scale

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
      ctx.lineWidth = 2
      ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight)

      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
      ctx.fillRect(viewportX, viewportY, viewportWidth, viewportHeight)
    }
  }, [width, height, graphBounds, viewportBounds, nodes])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onViewportChange || !viewportBounds) return

    setIsDragging(true)
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !onViewportChange || !viewportBounds) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const dx = x - dragStart.x
    const dy = y - dragStart.y

    const scaleX = (graphBounds.maxX - graphBounds.minX) / width
    const scaleY = (graphBounds.maxY - graphBounds.minY) / height

    const viewportWidth = viewportBounds.maxX - viewportBounds.minX
    const viewportHeight = viewportBounds.maxY - viewportBounds.minY

    const newBounds = {
      minX: viewportBounds.minX + dx * scaleX,
      maxX: viewportBounds.maxX + dx * scaleX,
      minY: viewportBounds.minY + dy * scaleY,
      maxY: viewportBounds.maxY + dy * scaleY
    }

    onViewportChange(newBounds)
    setDragStart({ x, y })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className="relative bg-white border rounded-lg shadow-sm">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="cursor-crosshair"
      />
      <div className="absolute bottom-1 right-1 text-xs text-gray-500 bg-white/80 px-1 rounded">
        迷你地图
      </div>
    </div>
  )
}
