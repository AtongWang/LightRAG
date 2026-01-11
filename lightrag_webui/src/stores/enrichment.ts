/**
 * 实体属性丰富状态管理
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { EnrichmentRequest, EnrichmentResult } from '@/types'
import * as api from '@/api/meme-lab'

interface EnrichmentStore {
  // 状态
  loading: boolean
  error: string | null
  currentResult: EnrichmentResult | null
  taskHistory: Array<{ taskId: string; status: string; timestamp: string }>

  // 操作
  enrichEntity: (data: EnrichmentRequest) => Promise<EnrichmentResult>
  enrichEntities: (entityNames: string[], ontologyId: string) => Promise<EnrichmentResult[]>
  enrichEntityInBackground: (data: EnrichmentRequest) => Promise<{ task_id: string }>
  clearError: () => void
  setCurrentResult: (result: EnrichmentResult | null) => void
}

export const useEnrichmentStore = create<EnrichmentStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      loading: false,
      error: null,
      currentResult: null,
      taskHistory: [],

      // 丰富单个实体
      enrichEntity: async (data: EnrichmentRequest) => {
        set({ loading: true, error: null })
        try {
          const result = await api.enrichEntity(data)

          set({
            currentResult: result,
            loading: false
          })

          return result
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '实体丰富失败',
            loading: false
          })
          throw error
        }
      },

      // 批量丰富实体
      enrichEntities: async (entityNames: string[], ontologyId: string) => {
        set({ loading: true, error: null })
        try {
          const results = await api.enrichEntities(entityNames, ontologyId)

          set({ loading: false })

          return results
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '批量丰富失败',
            loading: false
          })
          throw error
        }
      },

      // 后台丰富实体
      enrichEntityInBackground: async (data: EnrichmentRequest) => {
        set({ error: null })
        try {
          const result = await api.enrichEntityInBackground(data)

          // 添加到历史记录
          set(state => ({
            taskHistory: [
              ...state.taskHistory,
              {
                taskId: result.task_id,
                status: 'pending',
                timestamp: new Date().toISOString()
              }
            ]
          }))

          return result
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '启动后台任务失败'
          })
          throw error
        }
      },

      // 设置当前结果
      setCurrentResult: (result: EnrichmentResult | null) => {
        set({ currentResult: result })
      },

      // 清除错误
      clearError: () => {
        set({ error: null })
      }
    }),
    { name: 'EnrichmentStore' }
  )
)
