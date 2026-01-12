/**
 * 项目表格视图页面
 * 以表格形式显示实体和关系（按项目隔离）
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { TableView } from '@/features/table'
import { useGraphStore, RawGraph } from '@/stores/graph'
import { getProjectGraph } from '@/api/meme-lab'
import { getNodeColorByType } from '@/utils/graphColor'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProjectTable() {
  const { projectId } = useParams<{ projectId: string }>()
  const [viewMode, setViewMode] = useState<'entities' | 'relations'>('entities')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rawGraph = useGraphStore.use.rawGraph()
  const graphDataVersion = useGraphStore.use.graphDataVersion()

  // 加载项目图谱数据（如果还没有加载）
  const loadProjectGraph = useCallback(async () => {
    if (!projectId) return

    // 如果已经有数据了，不重新加载（除非是刷新）
    if (rawGraph && rawGraph.nodes.length > 0) return

    setIsLoading(true)
    setError(null)

    try {
      console.log(`[ProjectTable] Loading graph for project: ${projectId}`)
      const data = await getProjectGraph(projectId, {
        maxDepth: 3,
        maxNodes: 1000
      })

      if (!data.nodes || data.nodes.length === 0) {
        console.log('[ProjectTable] Project has no graph data')
        const emptyGraph = new RawGraph()
        useGraphStore.getState().setRawGraph(emptyGraph)
        useGraphStore.getState().setGraphIsEmpty(true)
        return
      }

      // 转换数据为 RawGraph 格式
      const newRawGraph = new RawGraph()
      const nodeIdMap: Record<string, number> = {}
      const edgeIdMap: Record<string, number> = {}

      for (let i = 0; i < data.nodes.length; i++) {
        const node = data.nodes[i]
        const nodeId = node.id || node.entity_name || `node_${i}`
        nodeIdMap[nodeId] = i

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
        newRawGraph.nodes.push(processedNode as any)
      }

      for (let i = 0; i < data.edges.length; i++) {
        const edge = data.edges[i]
        const source = edge.source || edge.src_id
        const target = edge.target || edge.tgt_id
        const edgeId = edge.id || `${source}-${target}`
        edgeIdMap[edgeId] = i

        const sourceIdx = nodeIdMap[source]
        const targetIdx = nodeIdMap[target]
        if (sourceIdx !== undefined) {
          newRawGraph.nodes[sourceIdx].degree += 1
        }
        if (targetIdx !== undefined) {
          newRawGraph.nodes[targetIdx].degree += 1
        }

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
        newRawGraph.edges.push(processedEdge as any)
      }

      newRawGraph.nodeIdMap = nodeIdMap
      newRawGraph.edgeIdMap = edgeIdMap
      newRawGraph.buildDynamicMap()

      const maxDegree = Math.max(...newRawGraph.nodes.map(n => n.degree), 1)
      newRawGraph.nodes.forEach(node => {
        node.size = 5 + (node.degree / maxDegree) * 15
      })

      console.log(`[ProjectTable] Loaded ${newRawGraph.nodes.length} nodes, ${newRawGraph.edges.length} edges`)
      
      useGraphStore.getState().setRawGraph(newRawGraph)
      useGraphStore.getState().setGraphIsEmpty(newRawGraph.nodes.length === 0)

    } catch (err) {
      console.error('[ProjectTable] Failed to load project graph:', err)
      setError('加载数据失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, rawGraph])

  // 初始加载
  useEffect(() => {
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
    // 强制重新加载
    useGraphStore.getState().setRawGraph(null)
    await loadProjectGraph()
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">表格视图</h2>
          <p className="text-sm text-muted-foreground mt-1">
            以表格形式浏览和管理实体与关系
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg transition bg-white border hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={() => setViewMode('entities')}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === 'entities'
                ? 'bg-brand-primary text-white'
                : 'bg-white border hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
            }`}
          >
            实体视图
          </button>
          <button
            onClick={() => setViewMode('relations')}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === 'relations'
                ? 'bg-brand-primary text-white'
                : 'bg-white border hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
            }`}
          >
            关系视图
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[hsl(var(--vermillion))]" />
            <span className="text-sm text-muted-foreground">加载数据...</span>
          </div>
        </div>
      )}

      {/* 表格内容 */}
      {!isLoading && (
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
          <TableView viewMode={viewMode} />
        </div>
      )}
    </div>
  )
}
