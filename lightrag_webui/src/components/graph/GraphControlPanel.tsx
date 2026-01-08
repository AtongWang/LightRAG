/**
 * 图谱控制面板
 * 提供图谱布局、过滤器、样式等控制功能
 */

import { useState } from 'react'
import {
  Settings,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'

export interface GraphSettings {
  layout: 'force' | 'circular' | 'hierarchical' | 'random'
  nodeSize: number
  edgeWidth: number
  labelSize: number
  showLabels: boolean
  showImages: boolean
  minEdgeWeight: number
  maxNodes: number
}

interface GraphControlPanelProps {
  settings: GraphSettings
  onSettingsChange: (settings: GraphSettings) => void
  onRefresh?: () => void
  onExport?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
  loading?: boolean
}

export function GraphControlPanel({
  settings,
  onSettingsChange,
  onRefresh,
  onExport,
  onZoomIn,
  onZoomOut,
  onFitView,
  loading = false
}: GraphControlPanelProps) {
  const [showFilters, setShowFilters] = useState(false)

  const handleSettingChange = <K extends keyof GraphSettings>(
    key: K,
    value: GraphSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <div className="w-72 bg-white border-l overflow-y-auto">
      {/* 头部 */}
      <div className="p-4 border-b sticky top-0 bg-white z-10">
        <h3 className="font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          图谱控制
        </h3>
      </div>

      <div className="p-4 space-y-6">
        {/* 快捷操作 */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={onZoomIn}
            className="p-2 border rounded-lg hover:bg-gray-50 transition flex flex-col items-center gap-1"
            title="放大"
          >
            <ZoomIn className="w-5 h-5" />
            <span className="text-xs">放大</span>
          </button>
          <button
            onClick={onZoomOut}
            className="p-2 border rounded-lg hover:bg-gray-50 transition flex flex-col items-center gap-1"
            title="缩小"
          >
            <ZoomOut className="w-5 h-5" />
            <span className="text-xs">缩小</span>
          </button>
          <button
            onClick={onFitView}
            className="p-2 border rounded-lg hover:bg-gray-50 transition flex flex-col items-center gap-1"
            title="适应视图"
          >
            <Maximize2 className="w-5 h-5" />
            <span className="text-xs">适应</span>
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 border rounded-lg hover:bg-gray-50 transition flex flex-col items-center gap-1 disabled:opacity-50"
            title="刷新"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs">刷新</span>
          </button>
        </div>

        {/* 布局选择 */}
        <div>
          <label className="block text-sm font-medium mb-2">布局方式</label>
          <select
            value={settings.layout}
            onChange={(e) => handleSettingChange('layout', e.target.value as GraphSettings['layout'])}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="force">力导向布局</option>
            <option value="circular">环形布局</option>
            <option value="hierarchical">层次布局</option>
            <option value="random">随机布局</option>
          </select>
        </div>

        {/* 显示设置 */}
        <div>
          <h4 className="text-sm font-medium mb-3">显示设置</h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm">显示标签</span>
              <button
                onClick={() => handleSettingChange('showLabels', !settings.showLabels)}
                className={`p-1 rounded ${
                  settings.showLabels ? 'bg-brand-primary text-white' : 'bg-gray-200'
                }`}
              >
                {settings.showLabels ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm">显示图片</span>
              <button
                onClick={() => handleSettingChange('showImages', !settings.showImages)}
                className={`p-1 rounded ${
                  settings.showImages ? 'bg-brand-primary text-white' : 'bg-gray-200'
                }`}
              >
                {settings.showImages ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            </label>
          </div>
        </div>

        {/* 节点大小 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            节点大小: {settings.nodeSize}px
          </label>
          <input
            type="range"
            min="5"
            max="30"
            value={settings.nodeSize}
            onChange={(e) => handleSettingChange('nodeSize', Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* 边宽度 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            边宽度: {settings.edgeWidth}px
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={settings.edgeWidth}
            onChange={(e) => handleSettingChange('edgeWidth', Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* 标签大小 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            标签大小: {settings.labelSize}px
          </label>
          <input
            type="range"
            min="10"
            max="24"
            value={settings.labelSize}
            onChange={(e) => handleSettingChange('labelSize', Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* 过滤器 */}
        <div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition"
          >
            <span className="font-medium flex items-center gap-2">
              <Filter className="w-4 h-4" />
              高级过滤器
            </span>
            <span className="text-sm text-gray-500">{showFilters ? '收起' : '展开'}</span>
          </button>

          {showFilters && (
            <div className="mt-3 space-y-4 p-4 bg-gray-50 rounded-lg">
              {/* 最小边权重 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  最小边权重: {settings.minEdgeWeight}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.minEdgeWeight}
                  onChange={(e) => handleSettingChange('minEdgeWeight', Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* 最大节点数 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  最大节点数: {settings.maxNodes}
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={settings.maxNodes}
                  onChange={(e) => handleSettingChange('maxNodes', Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* 导出 */}
        {onExport && (
          <button
            onClick={onExport}
            className="w-full flex items-center justify-center gap-2 p-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition"
          >
            <Download className="w-4 h-4" />
            导出图谱
          </button>
        )}
      </div>
    </div>
  )
}
