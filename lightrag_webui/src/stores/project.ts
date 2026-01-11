/**
 * 项目管理状态管理
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Project, CreateProjectDto, UpdateProjectDto } from '@/types/project'
import * as api from '@/api/meme-lab'

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
          const data = await api.getProjects()
          set({ projects: data, loading: false })
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
          const newProject = await api.createProject(data)

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
          const project = await api.getProject(projectId)
          set({ currentProject: project, loading: false })
          return project
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
          await api.updateProject(projectId, data)

          // 更新本地状态
          set(state => ({
            projects: state.projects.map(p =>
              p.project_id === projectId
                ? { ...p, ...data, updated_at: new Date().toISOString() }
                : p
            ),
            currentProject: state.currentProject?.project_id === projectId
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
          await api.deleteProject(projectId)

          set(state => ({
            projects: state.projects.filter(p => p.project_id !== projectId),
            currentProject: state.currentProject?.project_id === projectId
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
