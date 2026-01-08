/**
 * 项目表格视图页面
 * 以表格形式显示实体和关系
 */

import { useState } from 'react'
import { TableView } from '@/features/table'

export default function ProjectTable() {
  const [viewMode, setViewMode] = useState<'entities' | 'relations'>('entities')

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
            onClick={() => setViewMode('entities')}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === 'entities'
                ? 'bg-brand-primary text-white'
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            实体视图
          </button>
          <button
            onClick={() => setViewMode('relations')}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === 'relations'
                ? 'bg-brand-primary text-white'
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            关系视图
          </button>
        </div>
      </div>

      {/* 表格内容 */}
      <div className="flex-1 bg-white rounded-lg border overflow-hidden">
        <TableView viewMode={viewMode} />
      </div>
    </div>
  )
}
