/**
 * 图谱统计面板
 * 显示图谱的统计信息和指标
 */

import { Circle, Link, Zap } from 'lucide-react'

interface GraphStats {
  nodeCount: number
  edgeCount: number
  avgDegree: number
  density: number
  clusters?: number
  diameter?: number
}

interface GraphStatsPanelProps {
  stats: GraphStats
}

export function GraphStatsPanel({ stats }: GraphStatsPanelProps) {
  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals)
  }

  const statItems = [
    {
      icon: Circle,
      label: '节点总数',
      value: stats.nodeCount,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Link,
      label: '边总数',
      value: stats.edgeCount,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: Zap,
      label: '平均度数',
      value: formatNumber(stats.avgDegree),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Zap,
      label: '网络密度',
      value: formatNumber(stats.density),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold">图谱统计</h3>

      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item, index) => {
          const Icon = item.icon
          return (
            <div
              key={index}
              className={`p-3 rounded-lg ${item.bgColor}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
              <div className={`text-2xl font-bold ${item.color}`}>
                {item.value}
              </div>
            </div>
          )
        })}
      </div>

      {(stats.clusters !== undefined || stats.diameter !== undefined) && (
        <div className="pt-3 border-t">
          <h4 className="text-sm font-medium mb-2">高级指标</h4>
          <div className="space-y-2">
            {stats.clusters !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">聚类数量</span>
                <span className="font-medium">{stats.clusters}</span>
              </div>
            )}
            {stats.diameter !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">网络直径</span>
                <span className="font-medium">{stats.diameter}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-3 border-t">
        <h4 className="text-sm font-medium mb-2">健康度</h4>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{
              width: `${Math.min(100, (stats.nodeCount / 100) * 100)}%`
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {stats.nodeCount > 0 ? '图谱状态良好' : '图谱为空'}
        </p>
      </div>
    </div>
  )
}
