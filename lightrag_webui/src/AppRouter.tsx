import '@/lib/extensions'; // Import all global extensions
import { HashRouter as Router, Routes, Route, useNavigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/state'
import { navigationService } from '@/services/navigation'
import { Toaster } from 'sonner'
import LoginPage from '@/features/LoginPage'
import ThemeProvider from '@/components/ThemeProvider'

// Layout components
import MainLayout from '@/components/layout/MainLayout'
import ProjectLayout from '@/components/layout/ProjectLayout'

// Feature components
import { ProjectsList } from '@/features/projects/ProjectsList'
import {
  ProjectDocuments,
  ProjectOntology,
  ProjectGraph,
  ProjectTable,
  ProjectChat
} from '@/features/project-tabs'

/**
 * 认证守卫组件
 * 处理登录状态检查和重定向
 */
const AppContent = () => {
  const [initializing, setInitializing] = useState(true)
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  // Set navigate function for navigation service
  useEffect(() => {
    navigationService.setNavigate(navigate)
  }, [navigate])

  // Token validity check
  // TODO: 暂时简化认证检查
  useEffect(() => {
    // 直接完成初始化，让用户能看到界面
    const timer = setTimeout(() => {
      setInitializing(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Redirect effect for protected routes
  // TODO: 暂时禁用认证检查，直接显示内容
  /*
  useEffect(() => {
    if (!initializing && !isAuthenticated) {
      const currentPath = window.location.hash.slice(1);
      if (currentPath !== '/login') {
        console.log('Not authenticated, redirecting to login');
        navigate('/login');
      }
    }
  }, [initializing, isAuthenticated, navigate]);
  */

  // Show nothing while initializing
  if (initializing) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '24px',
        color: '#666'
      }}>
        加载中...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={<MainLayout />}
      >
        {/* 项目列表路由 */}
        <Route index element={<ProjectsList />} />

        {/* 项目详情路由 - 包含嵌套标签页 */}
        <Route path="projects/:projectId" element={<ProjectLayout />}>
          <Route path="documents" element={<ProjectDocuments />} />
          <Route path="ontology" element={<ProjectOntology />} />
          <Route path="graph" element={<ProjectGraph />} />
          <Route path="table" element={<ProjectTable />} />
          <Route path="chat" element={<ProjectChat />} />

          {/* 默认重定向到文档标签页 */}
          <Route index element={<ProjectDocuments />} />
        </Route>

        {/* 兼容旧路由 - 重定向到新的项目结构 */}
        <Route path="documents" element={<ProjectsList />} />
        <Route path="knowledge-graph" element={<ProjectsList />} />
        <Route path="retrieval" element={<ProjectsList />} />
        <Route path="api" element={<ProjectsList />} />
      </Route>
    </Routes>
  )
}

const AppRouter = () => {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
        <Toaster
          position="bottom-center"
          theme="system"
          closeButton
          richColors
        />
      </Router>
    </ThemeProvider>
  )
}

export default AppRouter
