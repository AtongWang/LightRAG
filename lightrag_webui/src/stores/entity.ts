/**
 * 实体管理状态管理
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import * as api from '@/api/meme-lab'

export interface EntityNode {
  entity_id: string
  entity_name: string
  entity_type: string
  description?: string
  image_url?: string
  attributes?: Record<string, any>
  source_id?: string
  created_at?: string
  updated_at?: string
}

interface EntityStore {
  // 状态
  entities: Record<string, EntityNode> // entityId -> entity
  currentEntity: EntityNode | null
  loading: boolean
  error: string | null
  searchResults: EntityNode[]
  searchLoading: boolean

  // 操作
  getEntity: (entityId: string) => Promise<EntityNode>
  updateEntity: (entityId: string, data: Partial<EntityNode>) => Promise<void>
  deleteEntity: (entityId: string) => Promise<void>
  searchEntities: (params: {
    projectId?: string
    query?: string
    entityTypes?: string[]
    limit?: number
  }) => Promise<EntityNode[]>
  clearSearchResults: () => void
  setCurrentEntity: (entity: EntityNode | null) => void
  clearError: () => void
}

export const useEntityStore = create<EntityStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      entities: {},
      currentEntity: null,
      loading: false,
      error: null,
      searchResults: [],
      searchLoading: false,

      // 获取单个实体
      getEntity: async (entityId: string) => {
        set({ loading: true, error: null })
        try {
          const entity = await api.getNode(entityId)

          // Normalize the response to match our EntityNode interface
          const normalizedEntity: EntityNode = {
            entity_id: entity.entity_id || entity.id || entityId,
            entity_name: entity.entity_name || entity.name || entity.properties?.entity_name || entityId,
            entity_type: entity.entity_type || entity.type || entity.properties?.entity_type || 'Unknown',
            description: entity.description || entity.properties?.description,
            image_url: entity.image_url || entity.properties?.image_url,
            attributes: entity.attributes || entity.properties || {},
            source_id: entity.source_id,
            created_at: entity.created_at,
            updated_at: entity.updated_at
          }

          set(state => ({
            entities: { ...state.entities, [entityId]: normalizedEntity },
            currentEntity: normalizedEntity,
            loading: false
          }))

          return normalizedEntity
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取实体失败',
            loading: false
          })
          throw error
        }
      },

      // 更新实体
      updateEntity: async (entityId: string, data: Partial<EntityNode>) => {
        set({ loading: true, error: null })
        try {
          // Prepare the update data - only send fields that the backend accepts
          const updateData: Record<string, any> = {}
          if (data.entity_type !== undefined) updateData.entity_type = data.entity_type
          if (data.description !== undefined) updateData.description = data.description
          if (data.attributes !== undefined) updateData.attributes = data.attributes
          if (data.source_id !== undefined) updateData.source_id = data.source_id

          await api.updateNode(entityId, updateData)

          // Update local state
          set(state => {
            const existingEntity = state.entities[entityId]
            const updatedEntity = existingEntity
              ? { ...existingEntity, ...data, updated_at: new Date().toISOString() }
              : null

            return {
              entities: updatedEntity
                ? { ...state.entities, [entityId]: updatedEntity }
                : state.entities,
              currentEntity: state.currentEntity?.entity_id === entityId
                ? updatedEntity
                : state.currentEntity,
              loading: false
            }
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '更新实体失败',
            loading: false
          })
          throw error
        }
      },

      // 删除实体
      deleteEntity: async (entityId: string) => {
        set({ loading: true, error: null })
        try {
          await api.deleteNode(entityId)

          set(state => {
            const newEntities = { ...state.entities }
            delete newEntities[entityId]

            return {
              entities: newEntities,
              currentEntity: state.currentEntity?.entity_id === entityId
                ? null
                : state.currentEntity,
              loading: false
            }
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '删除实体失败',
            loading: false
          })
          throw error
        }
      },

      // 搜索实体
      searchEntities: async (params) => {
        set({ searchLoading: true, error: null })
        try {
          const results = await api.searchNodes(params)

          // Normalize search results
          const normalizedResults: EntityNode[] = results.map(entity => ({
            entity_id: entity.entity_id || entity.id || entity.properties?.entity_id || String(entity.id),
            entity_name: entity.entity_name || entity.name || entity.properties?.entity_name || String(entity.id),
            entity_type: entity.entity_type || entity.type || entity.properties?.entity_type || 'Unknown',
            description: entity.description || entity.properties?.description,
            image_url: entity.image_url || entity.properties?.image_url,
            attributes: entity.attributes || entity.properties || {},
            source_id: entity.source_id,
            created_at: entity.created_at,
            updated_at: entity.updated_at
          }))

          set({ searchResults: normalizedResults, searchLoading: false })
          return normalizedResults
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '搜索实体失败',
            searchLoading: false
          })
          throw error
        }
      },

      // 清除搜索结果
      clearSearchResults: () => {
        set({ searchResults: [] })
      },

      // 设置当前实体
      setCurrentEntity: (entity: EntityNode | null) => {
        set({ currentEntity: entity })
      },

      // 清除错误
      clearError: () => {
        set({ error: null })
      }
    }),
    { name: 'EntityStore' }
  )
)
