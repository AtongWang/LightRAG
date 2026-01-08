/**
 * 本体管理状态管理
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  OntologySpec,
  CreateOntologyDto,
  UpdateOntologyDto,
  ValidationResult
} from '@/types/ontology'

interface OntologyStore {
  // 状态
  ontologies: Record<string, OntologySpec> // projectId -> ontology
  currentOntology: OntologySpec | null
  loading: boolean
  error: string | null
  validationError: string | null

  // 操作
  fetchOntology: (projectId: string) => Promise<void>
  getOntology: (ontologyId: string) => Promise<OntologySpec>
  createOntology: (data: CreateOntologyDto) => Promise<OntologySpec>
  updateOntology: (ontologyId: string, data: UpdateOntologyDto) => Promise<void>
  deleteOntology: (ontologyId: string) => Promise<void>
  validateOntology: (ontologyId: string) => Promise<ValidationResult>
  setCurrentOntology: (ontology: OntologySpec | null) => void
  clearError: () => void
}

export const useOntologyStore = create<OntologyStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      ontologies: {},
      currentOntology: null,
      loading: false,
      error: null,
      validationError: null,

      // 获取项目的本体
      fetchOntology: async (projectId: string) => {
        set({ loading: true, error: null })
        try {
          // TODO: 实现API调用
          // 首先获取项目的ontology_id
          // const project = await api.get(`/projects/${projectId}`)
          // const ontologyId = project.data.ontology_id

          // if (!ontologyId) {
          //   set({ currentOntology: null, loading: false })
          //   return
          // }

          // const response = await api.get(`/ontology/${ontologyId}`)
          // const ontology = response.data

          // 临时mock数据
          const mockOntology: OntologySpec = {
            ontology_id: 'onto_001',
            project_id: projectId,
            name: '文物本体',
            description: '中国古代文物知识图谱本体',
            version: '1.0',
            language: 'zh',
            entity_types: ['青铜器', '陶瓷', '玉器', '书画', 'Other'],
            relation_types: ['制造', '拥有', '收藏', '出土', 'Other'],
            entity_attributes: {
              青铜器: {
                type: 'string',
                required: false,
                description: '青铜器类型'
              }
            },
            relation_attributes: {},
            created_at: '2025-01-01T00:00:00',
            updated_at: '2025-01-08T00:00:00'
          }

          set(state => ({
            ontologies: { ...state.ontologies, [projectId]: mockOntology },
            currentOntology: mockOntology,
            loading: false
          }))
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取本体失败',
            loading: false
          })
          throw error
        }
      },

      // 获取本体
      getOntology: async (ontologyId: string) => {
        set({ loading: true, error: null })
        try {
          // TODO: 实现API调用
          // const response = await api.get(`/ontology/${ontologyId}`)
          // const ontology = response.data

          // 临时mock
          const ontology = get().ontologies['proj_001']
          if (ontology) {
            set({ currentOntology: ontology, loading: false })
            return ontology
          }

          throw new Error('本体不存在')
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取本体失败',
            loading: false
          })
          throw error
        }
      },

      // 创建本体
      createOntology: async (data: CreateOntologyDto) => {
        set({ loading: true, error: null })
        try {
          // TODO: 实现API调用
          // const response = await api.post('/ontology/create', data)
          // const ontology = response.data

          // 临时mock
          const ontology: OntologySpec = {
            ontology_id: `onto_${Date.now()}`,
            project_id: data.project_id,
            name: data.name,
            description: data.description,
            version: '1.0',
            language: data.language,
            entity_types: data.entity_types,
            relation_types: data.relation_types,
            entity_attributes: data.entity_attributes,
            relation_attributes: data.relation_attributes,
            normalization_rules: data.normalization_rules,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          set(state => ({
            ontologies: {
              ...state.ontologies,
              [data.project_id]: ontology
            },
            currentOntology: ontology,
            loading: false
          }))

          return ontology
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '创建本体失败',
            loading: false
          })
          throw error
        }
      },

      // 更新本体
      updateOntology: async (ontologyId: string, data: UpdateOntologyDto) => {
        set({ loading: true, error: null })
        try {
          // TODO: 实现API调用
          // await api.put(`/ontology/${ontologyId}`, data)

          set(state => {
            const updated = {
              ...state.currentOntology,
              ...data,
              updated_at: new Date().toISOString()
            } as OntologySpec

            return {
              ontologies: {
                ...state.ontologies,
                [updated.project_id]: updated
              },
              currentOntology: updated,
              loading: false
            }
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '更新本体失败',
            loading: false
          })
          throw error
        }
      },

      // 删除本体
      deleteOntology: async (ontologyId: string) => {
        set({ loading: true, error: null })
        try {
          // TODO: 实现API调用
          // await api.delete(`/ontology/${ontologyId}`)

          set(state => {
            const projectId = Object.keys(state.ontologies).find(
              id => state.ontologies[id].ontology_id === ontologyId
            )

            if (projectId) {
              const newOntologies = { ...state.ontologies }
              delete newOntologies[projectId]

              return {
                ontologies: newOntologies,
                currentOntology:
                  state.currentOntology?.ontology_id === ontologyId
                    ? null
                    : state.currentOntology,
                loading: false
              }
            }

            return { loading: false }
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '删除本体失败',
            loading: false
          })
          throw error
        }
      },

      // 验证本体
      validateOntology: async (ontologyId: string) => {
        set({ validationError: null })
        try {
          // TODO: 实现API调用
          // const response = await api.get(`/ontology/${ontologyId}/validate`)
          // return response.data

          // 临时mock - 总是返回有效
          return {
            is_valid: true,
            warnings: []
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : '验证失败'
          set({ validationError: errorMsg })
          return {
            is_valid: false,
            error_message: errorMsg
          }
        }
      },

      // 设置当前本体
      setCurrentOntology: (ontology: OntologySpec | null) => {
        set({ currentOntology: ontology })
      },

      // 清除错误
      clearError: () => {
        set({ error: null, validationError: null })
      }
    }),
    { name: 'OntologyStore' }
  )
)
