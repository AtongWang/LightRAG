/**
 * 项目图谱可视化页面
 * 显示项目的知识图谱
 */

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useGraphStore } from '@/stores/graph'
import GraphViewer from '@/features/GraphViewer'
import { RefreshCw, BarChart3, X, Circle, Link2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProjectGraph() {
  const { projectId } = useParams<{ projectId: string }>()
  const rawGraph = useGraphStore.use.rawGraph()
  const [showStats, setShowStats] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Calculate stats from graph data
  const nodeCount = rawGraph?.nodes?.length || 0
  const edgeCount = rawGraph?.edges?.length || 0
  const avgDegree = nodeCount > 0 ? (edgeCount * 2 / nodeCount).toFixed(2) : '0.00'
  const density = nodeCount > 1 
    ? ((2 * edgeCount) / (nodeCount * (nodeCount - 1))).toFixed(4) 
    : '0.0000'

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      useGraphStore.getState().incrementGraphDataVersion()
      await new Promise(resolve => setTimeout(resolve, 500))
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--paper-warm))]">
      {/* 工具栏 */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white/50 dark:bg-[hsl(var(--card)/0.5)] border-b border-[hsl(var(--border))]">
        <h2 className="text-lg font-bold text-foreground">知识图谱</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-[hsl(var(--border))] bg-white dark:bg-[hsl(var(--card))] hover:bg-muted transition disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
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

      {/* 主内容区域 */}
      <div className="flex-1 relative overflow-hidden">
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
