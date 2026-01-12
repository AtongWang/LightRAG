/**
 * 项目图谱可视化页面
 * 显示项目的知识图谱（按项目隔离）
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useGraphStore, RawGraph } from '@/stores/graph'
import GraphViewer from '@/features/GraphViewer'
import { RefreshCw, BarChart3, X, Circle, Link2, Zap, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProjectGraph } from '@/api/meme-lab'
import { getNodeColorByType } from '@/utils/graphColor'

export default function ProjectGraph() {
  const { projectId } = useParams<{ projectId: string }>()
  const rawGraph = useGraphStore.use.rawGraph()
  const graphDataVersion = useGraphStore.use.graphDataVersion()
  const [showStats, setShowStats] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate stats from graph data
  const nodeCount = rawGraph?.nodes?.length || 0
  const edgeCount = rawGraph?.edges?.length || 0
  const avgDegree = nodeCount > 0 ? (edgeCount * 2 / nodeCount).toFixed(2) : '0.00'
  const density = nodeCount > 1 
    ? ((2 * edgeCount) / (nodeCount * (nodeCount - 1))).toFixed(4) 
    : '0.0000'

  // 加载项目图谱数据
  const loadProjectGraph = useCallback(async () => {
    if (!projectId) return

    setIsLoading(true)
    setError(null)

    try {
      console.log(`Loading graph for project: ${projectId}`)
      const data = await getProjectGraph(projectId, {
        maxDepth: 3,
        maxNodes: 1000
      })

      if (!data.nodes || data.nodes.length === 0) {
        console.log('Project has no graph data')
        // 创建空的 RawGraph
        const emptyGraph = new RawGraph()
        useGraphStore.getState().setRawGraph(emptyGraph)
        useGraphStore.getState().setGraphIsEmpty(true)
        return
      }

      // 转换数据为 RawGraph 格式
      const rawGraph = new RawGraph()
      const nodeIdMap: Record<string, number> = {}
      const edgeIdMap: Record<string, number> = {}

      // 处理节点
      for (let i = 0; i < data.nodes.length; i++) {
        const node = data.nodes[i]
        const nodeId = node.id || node.entity_name || `node_${i}`
        nodeIdMap[nodeId] = i

        // 构造节点属性
        const properties: Record<string, any> = { ...node }
        delete properties.id
        delete properties.x
        delete properties.y
        delete properties.size
        delete properties.color
        delete properties.degree

        const processedNode = {
          id: nodeId,
          labels: [node.entity_type || 'Unknown'],
          properties,
          x: Math.random(),
          y: Math.random(),
          size: 10,
          color: getNodeColorByType(node.entity_type),
          degree: 0
        }
        rawGraph.nodes.push(processedNode as any)
      }

      // 处理边
      for (let i = 0; i < data.edges.length; i++) {
        const edge = data.edges[i]
        const source = edge.source || edge.src_id
        const target = edge.target || edge.tgt_id
        const edgeId = edge.id || `${source}-${target}`
        edgeIdMap[edgeId] = i

        // 更新节点度数
        const sourceIdx = nodeIdMap[source]
        const targetIdx = nodeIdMap[target]
        if (sourceIdx !== undefined) {
          rawGraph.nodes[sourceIdx].degree += 1
        }
        if (targetIdx !== undefined) {
          rawGraph.nodes[targetIdx].degree += 1
        }

        // 构造边属性
        const properties: Record<string, any> = { ...edge }
        delete properties.source
        delete properties.target
        delete properties.src_id
        delete properties.tgt_id
        delete properties.id

        const processedEdge = {
          id: edgeId,
          source,
          target,
          type: edge.relation_type || edge.type || 'RELATED_TO',
          properties,
          dynamicId: `${source}-${target}-${i}`
        }
        rawGraph.edges.push(processedEdge as any)
      }

      // 设置映射
      rawGraph.nodeIdMap = nodeIdMap
      rawGraph.edgeIdMap = edgeIdMap
      rawGraph.buildDynamicMap()

      // 根据度数调整节点大小
      const maxDegree = Math.max(...rawGraph.nodes.map(n => n.degree), 1)
      rawGraph.nodes.forEach(node => {
        node.size = 5 + (node.degree / maxDegree) * 15
      })

      console.log(`Loaded ${rawGraph.nodes.length} nodes, ${rawGraph.edges.length} edges for project ${projectId}`)
      
      // 更新 store
      useGraphStore.getState().setRawGraph(rawGraph)
      useGraphStore.getState().setGraphIsEmpty(rawGraph.nodes.length === 0)

    } catch (err) {
      console.error('Failed to load project graph:', err)
      setError('加载图谱失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // 初始加载和刷新时加载数据
  useEffect(() => {
    // 使用一个标志来防止组件卸载后还尝试更新状态
    let isMounted = true
    
    const load = async () => {
      if (isMounted) {
        await loadProjectGraph()
      }
    }
    
    load()
    
    return () => {
      isMounted = false
    }
  }, [loadProjectGraph, graphDataVersion])

  const handleRefresh = async () => {
    await loadProjectGraph()
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--paper-warm))]">
      {/* 工具栏 */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white/50 dark:bg-[hsl(var(--card)/0.5)] border-b border-[hsl(var(--border))]">
        <h2 className="text-lg font-bold text-foreground">知识图谱</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-[hsl(var(--border))] bg-white dark:bg-[hsl(var(--card))] hover:bg-muted transition disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            刷新
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition",
              showStats 
                ? 'bg-[hsl(var(--vermillion))] text-white' 
                : 'border border-[hsl(var(--border))] bg-white dark:bg-[hsl(var(--card))] hover:bg-muted'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            统计
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex-shrink-0 px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 relative overflow-hidden">
        {/* 加载状态 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-30">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[hsl(var(--vermillion))]" />
              <span className="text-sm text-muted-foreground">加载图谱数据...</span>
            </div>
          </div>
        )}

        {/* GraphViewer - 全屏显示 */}
        <div className="absolute inset-0">
          <GraphViewer />
        </div>

        {/* 统计面板 - 悬浮在右下角 */}
        {showStats && (
          <div className="absolute bottom-4 right-4 w-80 bg-white dark:bg-[hsl(var(--card))] rounded-xl shadow-xl border border-[hsl(var(--border))] z-20 overflow-hidden">
            {/* 面板头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] bg-gradient-to-r from-[hsl(var(--vermillion)/0.1)] to-transparent">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[hsl(var(--vermillion))]" />
                图谱统计
              </h3>
              <button
                onClick={() => setShowStats(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            
            {/* 统计内容 */}
            <div className="p-4 space-y-4">
              {/* 主要指标 */}
              <div className="grid grid-cols-2 gap-3">
                <StatItem 
                  icon={<Circle className="w-4 h-4" />} 
                  label="节点总数" 
                  value={nodeCount}
                  color="blue"
                />
                <StatItem 
                  icon={<Link2 className="w-4 h-4" />} 
                  label="边总数" 
                  value={edgeCount}
                  color="green"
                />
                <StatItem 
                  icon={<Zap className="w-4 h-4" />} 
                  label="平均度数" 
                  value={avgDegree}
                  color="purple"
                />
                <StatItem 
                  icon={<Zap className="w-4 h-4" />} 
                  label="网络密度" 
                  value={density}
                  color="orange"
                />
              </div>

              {/* 健康度 */}
              <div className="pt-3 border-t border-[hsl(var(--border))]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">图谱健康度</span>
                  <span className="text-sm text-[hsl(var(--jade))]">
                    {nodeCount > 0 ? '良好' : '空'}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-[hsl(var(--jade))] h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, nodeCount > 0 ? Math.min(nodeCount / 5, 100) : 0)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 统计项组件
function StatItem({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode
  label: string
  value: number | string
  color: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-[hsl(var(--jade)/0.1)] text-[hsl(var(--jade))]',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold-dark))]'
  }

  return (
    <div className={cn("p-3 rounded-lg", colors[color])}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs opacity-80">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}
