/**
 * 项目管理状态管理
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Project, CreateProjectDto, UpdateProjectDto } from '@/types/project'

interface ProjectStore {
  // 状态
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  error: string | null

  // 操作
  fetchProjects: () => Promise<void>
  createProject: (data: CreateProjectDto) => Promise<Project>
  getProject: (projectId: string) => Promise<Project>
  updateProject: (projectId: string, data: UpdateProjectDto) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  clearError: () => void
}

export const useProjectStore = create<ProjectStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      projects: [],
      currentProject: null,
      loading: false,
      error: null,

      // 获取所有项目
      fetchProjects: async () => {
        set({ loading: true, error: null })
        try {
          // TODO: 实现API调用
          // const response = await api.get('/projects/')
          // set({ projects: response.data })

          // 临时mock数据
          const mockProjects: Project[] = [
            {
              project_id: 'proj_001',
              name: '中国古代青铜器',
              description: '中国古代青铜器文化知识图谱',
              workspace: 'workspace_proj_001',
              created_at: '2025-01-01T00:00:00',
              updated_at: '2025-01-08T00:00:00',
              status: 'active',
              stats: {
                document_count: 15,
                entity_count: 234,
                relation_count: 567,
                last_updated: '2025-01-08T00:00:00'
              }
            }
          ]
          set({ projects: mockProjects, loading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取项目列表失败',
            loading: false
          })
        }
      },

      // 创建项目
      createProject: async (data: CreateProjectDto) => {
        set({ loading: true, error: null })
        try {
          // TODO: 实现API调用
          // const response = await api.post('/projects/create', data)
          // const newProject = response.data

          // 临时mock
          const newProject: Project = {
            project_id: `proj_${Date.now()}`,
            name: data.name,
            description: data.description,
            workspace: `workspace_proj_${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'active',
            tags: data.tags,
            cover_image: data.cover_image
          }

          set(state => ({
            projects: [...state.projects, newProject],
            loading: false
          }))

          return newProject
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '创建项目失败',
            loading: false
          })
          throw error
        }
      },

      // 获取单个项目
      getProject: async (projectId: string) => {
        set({ loading: true, error: null })
        try {
          // TODO: 实现API调用
          // const response = await api.get(`/projects/${projectId}`)
          // const project = response.data

          // 临时从现有列表中查找
          const project = get().projects.find(p => p.project_id === projectId)
          if (project) {
            set({ currentProject: project, loading: false })
            return project
          }

          throw new Error('项目不存在')
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取项目失败',
            loading: false
          })
          throw error
        }
      },

      // 更新项目
      updateProject: async (projectId: string, data: UpdateProjectDto) => {
        set({ loading: true, error: null })
        try {
          // TODO: 实现API调用
          // await api.put(`/projects/${projectId}`, data)

          set(state => ({
            projects: state.projects.map(p =>
              p.project_id === projectId
                ? { ...p, ...data, updated_at: new Date().toISOString() }
                : p
            ),
            currentProject:
              state.currentProject?.project_id === projectId
                ? { ...state.currentProject, ...data, updated_at: new Date().toISOString() }
                : state.currentProject,
            loading: false
          }))
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '更新项目失败',
            loading: false
          })
          throw error
        }
      },

      // 删除项目
      deleteProject: async (projectId: string) => {
        set({ loading: true, error: null })
        try {
          // TODO: 实现API调用
          // await api.delete(`/projects/${projectId}`)

          set(state => ({
            projects: state.projects.filter(p => p.project_id !== projectId),
            currentProject:
              state.currentProject?.project_id === projectId
                ? null
                : state.currentProject,
            loading: false
          }))
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '删除项目失败',
            loading: false
          })
          throw error
        }
      },

      // 设置当前项目
      setCurrentProject: (project: Project | null) => {
        set({ currentProject: project })
      },

      // 清除错误
      clearError: () => {
        set({ error: null })
      }
    }),
    { name: 'ProjectStore' }
  )
)
