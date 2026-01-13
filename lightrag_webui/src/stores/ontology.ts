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
import * as api from '@/api/meme-lab'

interface OntologyStore {
  // 状态
  ontologies: Record<string, OntologySpec> // projectId -> ontology
  currentOntology: OntologySpec | null
  activeProjectId: string | null
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
      activeProjectId: null,
      loading: false,
      error: null,
      validationError: null,

      // 获取项目的本体
      fetchOntology: async (projectId: string) => {
        set({ loading: true, error: null, activeProjectId: projectId })
        try {
          // 直接通过项目ID获取本体
          const ontology = await api.getProjectOntology(projectId)

          set(state => ({
            ontologies: { ...state.ontologies, [projectId]: ontology },
            currentOntology:
              state.activeProjectId === projectId &&
              (!state.currentOntology ||
                state.currentOntology.project_id === projectId)
                ? ontology
                : state.currentOntology,
            loading: false
          }))
        } catch (error: unknown) {
          // Check if this is a 404 error (no ontology for project)
          const axiosError = error as { response?: { status?: number } }
          if (axiosError.response?.status === 404) {
            // This is not an error - project just doesn't have an ontology yet
            set(state => {
              const nextOntologies = { ...state.ontologies }
              delete nextOntologies[projectId]
              return {
                ontologies: nextOntologies,
                currentOntology:
                  state.activeProjectId === projectId &&
                  state.currentOntology?.project_id === projectId
                    ? null
                    : state.currentOntology,
                loading: false,
                error: null
              }
            })
            return // Don't throw, this is expected
          }
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
          const ontology = await api.getOntology(ontologyId)
          set({ currentOntology: ontology, loading: false })
          return ontology
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
          const ontology = await api.createOntology(data)

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
          await api.updateOntology(ontologyId, data)

          set(state => {
            const existingOntology = state.currentOntology?.ontology_id === ontologyId
              ? state.currentOntology
              : Object.values(state.ontologies).find(
                ontology => ontology.ontology_id === ontologyId
              )

            if (!existingOntology) {
              return { loading: false }
            }

            const updated = {
              ...existingOntology,
              ...data,
              updated_at: new Date().toISOString()
            } as OntologySpec

            return {
              ontologies: {
                ...state.ontologies,
                [updated.project_id]: updated
              },
              currentOntology:
                state.currentOntology?.ontology_id === ontologyId
                  ? updated
                  : state.currentOntology,
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
          await api.deleteOntology(ontologyId)

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
          const result = await api.validateOntology(ontologyId)

          if (!result.is_valid) {
            set({ validationError: result.error_message || '验证失败' })
          }

          return result
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : '验证失败'
          set({ validationError: errorMsg })
          return {
            is_valid: false,
            error_message: errorMsg,
            warnings: []
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
