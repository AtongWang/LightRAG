/**
 * UI状态管理
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning'
}

interface UIStore {
  // 主题
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void

  // 视图模式
  viewMode: 'graph' | 'table'
  setViewMode: (mode: 'graph' | 'table') => void

  // 对话框状态
  dialogs: {
    attributeEdit: boolean
    ontologyEditor: boolean
    projectSettings: boolean
    createProject: boolean
    enrichEntity: boolean
  }
  openDialog: (name: keyof UIStore['dialogs']) => void
  closeDialog: (name: keyof UIStore['dialogs']) => void
  closeAllDialogs: () => void

  // 加载状态
  loading: boolean
  setLoading: (loading: boolean) => void

  // Toast通知
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  showToast: (type: 'success' | 'error' | 'warning' | 'default', message: string) => void

  // 侧边栏
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        theme: 'light',
        viewMode: 'graph',
        dialogs: {
          attributeEdit: false,
          ontologyEditor: false,
          projectSettings: false,
          createProject: false,
          enrichEntity: false
        },
        loading: false,
        toasts: [],
        sidebarOpen: true,

        // 主题
        setTheme: (theme: 'light' | 'dark') => {
          set({ theme })
          // 应用主题到DOM
          if (theme === 'dark') {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
        },

        // 视图模式
        setViewMode: (mode: 'graph' | 'table') => {
          set({ viewMode: mode })
        },

        // 对话框操作
        openDialog: (name) => {
          set(state => ({
            dialogs: { ...state.dialogs, [name]: true }
          }))
        },

        closeDialog: (name) => {
          set(state => ({
            dialogs: { ...state.dialogs, [name]: false }
          }))
        },

        closeAllDialogs: () => {
          set({
            dialogs: {
              attributeEdit: false,
              ontologyEditor: false,
              projectSettings: false,
              createProject: false,
              enrichEntity: false
            }
          })
        },

        // 加载状态
        setLoading: (loading: boolean) => {
          set({ loading })
        },

        // Toast通知
        addToast: (toast) => {
          const id = Math.random().toString(36).substring(2, 9)
          set(state => ({
            toasts: [...state.toasts, { ...toast, id }]
          }))

          // 自动移除（3秒后）
          setTimeout(() => {
            get().removeToast(id)
          }, 3000)
        },

        removeToast: (id: string) => {
          set(state => ({
            toasts: state.toasts.filter(t => t.id !== id)
          }))
        },

        clearToasts: () => {
          set({ toasts: [] })
        },

        // 快捷Toast显示方法
        showToast: (type: 'success' | 'error' | 'warning' | 'default', message: string) => {
          const variantMap: Record<string, Toast['variant']> = {
            success: 'success',
            error: 'destructive',
            warning: 'warning',
            default: 'default'
          }
          get().addToast({
            title: message,
            variant: variantMap[type] || 'default'
          })
        },

        // 侧边栏
        setSidebarOpen: (open: boolean) => {
          set({ sidebarOpen: open })
        }
      }),
      {
        name: 'UIStore',
        partialize: (state) => ({
          theme: state.theme,
          viewMode: state.viewMode,
          sidebarOpen: state.sidebarOpen
        })
      }
    ),
    { name: 'UIStore' }
  )
)
