/**
 * 解析结果查看器
 * 显示文档解析后的实体和关系提取结果
 */

import { useState } from 'react'
import { FileText, Users, Link2, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'

interface Entity {
  id: string
  name: string
  type: string
  description?: string
  attributes?: Record<string, any>
}

interface Relation {
  id: string
  source: string
  target: string
  relation_type: string
  attributes?: Record<string, any>
}

interface ParseResult {
  file_id: string
  filename: string
  parse_time: string
  status: 'success' | 'partial' | 'failed'
  entity_count: number
  relation_count: number
  entities: Entity[]
  relations: Relation[]
  error_message?: string
}

export function ParseResultViewer({ result }: { result: ParseResult }) {
  const [activeTab, setActiveTab] = useState<'entities' | 'relations'>('entities')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const entityTypes = Array.from(new Set(result.entities.map(e => e.type)))

  const filteredEntities = result.entities.filter(entity => {
    const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || entity.type === typeFilter
    return matchesSearch && matchesType
  })

  const filteredRelations = result.relations.filter(relation => {
    const query = searchQuery.toLowerCase()
    return relation.source.toLowerCase().includes(query) ||
           relation.target.toLowerCase().includes(query) ||
           relation.relation_type.toLowerCase().includes(query)
  })

  return (
    <div className="space-y-6">
      {/* 文档信息 */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-primary/10 rounded-lg">
              <FileText className="w-6 h-6 text-brand-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{result.filename}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                解析时间：{new Date(result.parse_time).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-primary">{result.entity_count}</div>
              <div className="text-xs text-muted-foreground">实体</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-secondary">{result.relation_count}</div>
              <div className="text-xs text-muted-foreground">关系</div>
            </div>
          </div>
        </div>
      </div>

      {/* 选项卡 */}
      <div className="border-b">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('entities')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
              activeTab === 'entities'
                ? 'border-brand-primary text-brand-primary font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            实体 ({result.entities.length})
          </button>
          <button
            onClick={() => setActiveTab('relations')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
              activeTab === 'relations'
                ? 'border-brand-primary text-brand-primary font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Link2 className="w-4 h-4" />
            关系 ({result.relations.length})
          </button>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={activeTab === 'entities' ? '搜索实体...' : '搜索关系...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        {activeTab === 'entities' && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="all">全部类型</option>
            {entityTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        )}
      </div>

      {/* 实体列表 */}
      {activeTab === 'entities' && (
        <div className="space-y-3">
          {filteredEntities.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">
                {searchQuery || typeFilter !== 'all' ? '没有找到匹配的实体' : '暂无实体数据'}
              </p>
            </div>
          ) : (
            filteredEntities.map(entity => (
              <div key={entity.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{entity.name}</h4>
                      <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded text-xs">
                        {entity.type}
                      </span>
                    </div>
                    {entity.description && (
                      <p className="text-sm text-gray-600 mb-2">{entity.description}</p>
                    )}
                    {entity.attributes && Object.keys(entity.attributes).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(entity.attributes).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                        {Object.keys(entity.attributes).length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{Object.keys(entity.attributes).length - 3} 更多
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 关系列表 */}
      {activeTab === 'relations' && (
        <div className="space-y-3">
          {filteredRelations.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <Link2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">
                {searchQuery ? '没有找到匹配的关系' : '暂无关系数据'}
              </p>
            </div>
          ) : (
            filteredRelations.map(relation => (
              <div key={relation.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition">
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-right">
                    <div className="font-medium">{relation.source}</div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-brand-secondary/10 rounded-lg">
                    <span className="text-brand-secondary font-medium">{relation.relation_type}</span>
                    <Link2 className="w-4 h-4 text-brand-secondary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{relation.target}</div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                {relation.attributes && Object.keys(relation.attributes).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(relation.attributes).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
