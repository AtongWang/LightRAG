/**
 * 项目布局组件
 * 中国风文化主题详情页设计
 */

import { Outlet, useParams, Link, useLocation } from 'react-router-dom'
import LanguageToggle from '@/components/LanguageToggle'
import { useProjectStore } from '@/stores/project'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  FileTextIcon,
  NetworkIcon,
  TableIcon,
  MessageSquareIcon,
  BookOpenIcon,
  ChevronRight,
  Home,
  Scroll,
  Link2
} from 'lucide-react'
import type { Project } from '@/types/project'

interface NavigationTabProps {
  value: string
  currentTab: string
  projectId: string
  icon: React.ReactNode
  label: string
}

function NavigationTab({ value, currentTab, projectId, icon, label }: NavigationTabProps) {
  const isActive = currentTab === value
  
  return (
    <TabsTrigger asChild value={value}>
      <Link
        to={`/projects/${projectId}/${value}`}
        className={cn(
          'relative cursor-pointer px-4 py-2.5 flex items-center gap-2 rounded-lg transition-all font-medium',
          isActive 
            ? 'bg-gradient-to-r from-[hsl(var(--vermillion))] to-[hsl(var(--vermillion-dark))] text-white shadow-md shadow-[hsl(var(--vermillion)/0.3)]' 
            : 'text-muted-foreground hover:bg-[hsl(var(--vermillion)/0.1)] hover:text-[hsl(var(--vermillion))]'
        )}
      >
        {icon}
        <span>{label}</span>
        {isActive && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-[hsl(var(--gold))] rounded-full" />
        )}
      </Link>
    </TabsTrigger>
  )
}

export default function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  const { currentProject, projects, getProject, fetchProjects, loading } = useProjectStore()
  const [currentTab, setCurrentTab] = useState('documents')
  const { t } = useTranslation()
  const location = useLocation()

  // 获取项目信息
  useEffect(() => {
    if (projectId) {
      getProject(projectId)
    }
  }, [projectId, getProject])

  useEffect(() => {
    if (!projectId || !currentProject || currentProject.cover_image || projects.length > 0) {
      return
    }

    fetchProjects()
  }, [projectId, currentProject, projects.length, fetchProjects])

  // 从URL路径中提取当前标签页
  useEffect(() => {
    const path = location.hash.slice(1) || location.pathname
    const segments = path.split('/')
    const tab = segments[segments.length - 1] || 'documents'
    setCurrentTab(tab)
  }, [location])

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col">
        {/* 骨架屏 */}
        <div className="border-b border-[hsl(var(--border))] bg-gradient-to-r from-[hsl(var(--card))] to-[hsl(var(--background))] p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
        </div>
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--paper-warm))]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[hsl(var(--vermillion)/0.1)] to-[hsl(var(--vermillion)/0.05)] flex items-center justify-center">
            <Scroll className="w-10 h-10 text-[hsl(var(--vermillion)/0.5)]" />
          </div>
          <p className="text-lg font-medium text-foreground mb-2">主题不存在</p>
          <p className="text-sm text-muted-foreground mb-4">该文化主题可能已被删除或不存在</p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--vermillion))] text-white rounded-lg hover:bg-[hsl(var(--vermillion-dark))] transition-colors"
          >
            <Home className="w-4 h-4" />
            返回主题库
          </Link>
        </div>
      </div>
    )
  }

  // 获取封面图用于背景
  const coverImageForBg = projects.find(p => p.project_id === currentProject.project_id)?.cover_image
    || (projects.find(p => p.project_id === currentProject.project_id) as Project & { coverImage?: string } | undefined)?.coverImage
    || currentProject.cover_image
    || (currentProject as Project & { coverImage?: string }).coverImage

  return (
    <>
      {/* 固定背景层 - 覆盖整个页面包括导航栏 */}
      {coverImageForBg && (
        <div className="fixed inset-0 pointer-events-none -z-50">
          <div
            className="absolute inset-0 bg-center bg-cover blur-md scale-105 opacity-85 saturate-100"
            style={{ backgroundImage: `url(${coverImageForBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--background))]/45 via-[hsl(var(--paper-warm))]/40 to-[hsl(var(--background))]/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background))]/30 via-transparent to-[hsl(var(--background))]/30" />
        </div>
      )}

      <div className="flex h-full w-full flex-col overflow-hidden relative">
        {/* 项目头部 */}
      <ProjectHeader
        project={currentProject}
        coverImage={
          projects.find(p => p.project_id === currentProject.project_id)?.cover_image
          || (projects.find(p => p.project_id === currentProject.project_id) as Project & { coverImage?: string } | undefined)?.coverImage
        }
      />

      {/* 面包屑 + 标签页导航 */}
      <div className="border-b border-[hsl(var(--border))] bg-white/50 dark:bg-[hsl(var(--card)/0.5)] backdrop-blur-sm">
        <div className="px-6 py-1.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center text-sm min-w-[220px]">
            <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-[hsl(var(--vermillion))] transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>主题库</span>
            </Link>
            <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground/50" />
            <span className="font-medium text-foreground">{currentProject.name}</span>
            <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground/50" />
            <span className="text-[hsl(var(--vermillion))]">
              {t(`project.tabs.${currentTab}`, currentTab === 'documents' ? '文档' : currentTab === 'ontology' ? '本体' : currentTab === 'graph' ? '图谱' : currentTab === 'table' ? '表格' : '对话')}
            </span>
          </div>

          <Tabs value={currentTab} className="flex-1 min-w-[280px]">
            <TabsList className="h-auto bg-transparent p-0 gap-2 flex-wrap justify-end">
              <NavigationTab 
                value="documents" 
                currentTab={currentTab} 
                projectId={currentProject.project_id}
                icon={<FileTextIcon className="w-4 h-4" />}
                label={t('project.tabs.documents', '文档')}
              />
              <NavigationTab 
                value="ontology" 
                currentTab={currentTab} 
                projectId={currentProject.project_id}
                icon={<BookOpenIcon className="w-4 h-4" />}
                label={t('project.tabs.ontology', '本体')}
              />
              <NavigationTab 
                value="graph" 
                currentTab={currentTab} 
                projectId={currentProject.project_id}
                icon={<NetworkIcon className="w-4 h-4" />}
                label={t('project.tabs.graph', '图谱')}
              />
              <NavigationTab 
                value="table" 
                currentTab={currentTab} 
                projectId={currentProject.project_id}
                icon={<TableIcon className="w-4 h-4" />}
                label={t('project.tabs.table', '表格')}
              />
              <NavigationTab 
                value="chat" 
                currentTab={currentTab} 
                projectId={currentProject.project_id}
                icon={<MessageSquareIcon className="w-4 h-4" />}
                label={t('project.tabs.chat', '对话')}
              />
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Outlet />
      </div>
    </div>
    </>
  )
}

/**
 * 项目头部组件 - 中国风设计
 */
function ProjectHeader({ project, coverImage }: { project: Project; coverImage?: string }) {
  const headerCover = project.cover_image
    || (project as Project & { coverImage?: string }).coverImage
    || coverImage

  return (
    <div className="relative border-b border-[hsl(var(--border))] overflow-hidden">
      {headerCover ? (
        <div className="absolute inset-0 pointer-events-none">
          {/* 背景封面图 - 模糊处理 */}
          <div
            className="absolute inset-0 bg-center bg-cover blur-sm scale-100 opacity-75 saturate-100"
            style={{ backgroundImage: `url(${headerCover})` }}
          />
          {/* 多层渐变叠加，让背景更柔和 */}
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--background))]/60 via-[hsl(var(--background))]/45 to-[hsl(var(--background))]/60" />
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--paper-warm))]/40 via-transparent to-[hsl(var(--paper-warm))]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background))]/45 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-brand-primary/10 via-[hsl(var(--background))] to-brand-secondary/10" />
      )}
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.03]">
          <svg viewBox="0 0 200 200" className="w-full h-full text-[hsl(var(--vermillion))]">
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </svg>
        </div>
      </div>

      <div className="relative px-6 py-2.5">
        <div className="flex items-center gap-4">
          {/* 项目图标 */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--vermillion))] to-[hsl(var(--vermillion-dark))] flex items-center justify-center shadow-md shadow-[hsl(var(--vermillion)/0.25)]">
              <Scroll className="w-6 h-6 text-white" />
            </div>
            {/* 装饰角 */}
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[hsl(var(--gold))]" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[hsl(var(--gold))]" />
          </div>

          {/* 项目信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold bg-gradient-to-r from-[hsl(var(--foreground))] to-[hsl(var(--ink-light))] bg-clip-text text-transparent truncate">
                {project.name}
              </h1>
              <span className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full border flex-shrink-0",
                project.status === 'active'
                  ? 'bg-[hsl(var(--jade)/0.1)] text-[hsl(var(--jade))] border-[hsl(var(--jade)/0.3)]'
                  : 'bg-muted text-muted-foreground border-border'
              )}>
                {project.status === 'active' ? '● 活跃' : '○ 归档'}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
              {project.description || '探索文化知识，构建知识图谱'}
            </p>

            {/* 统计信息 */}
            <div className="flex flex-wrap items-center gap-3">
              <StatBadge
                icon={<FileTextIcon className="w-4 h-4" />}
                value={project.stats?.document_count || 0}
                label="文档"
                color="gold"
              />
              <StatBadge
                icon={<NetworkIcon className="w-4 h-4" />}
                value={project.stats?.entity_count || 0}
                label="实体"
                color="jade"
              />
              <StatBadge
                icon={<Link2 className="w-4 h-4" />}
                value={project.stats?.relation_count || 0}
                label="关系"
                color="vermillion"
              />
              {project.tags && project.tags.length > 0 && project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-[hsl(var(--vermillion)/0.1)] to-[hsl(var(--gold)/0.1)] text-[hsl(var(--vermillion-dark))] dark:text-[hsl(var(--vermillion-light))] rounded-full border border-[hsl(var(--vermillion)/0.2)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <LanguageToggle />
          </div>

        </div>

      </div>

      {/* 底部装饰线 */}
      <div className="h-0.5 bg-gradient-to-r from-[hsl(var(--vermillion)/0.3)] via-[hsl(var(--gold)/0.3)] to-[hsl(var(--jade)/0.3)]" />
    </div>
  )
}

/**
 * 统计徽章组件
 */
function StatBadge({ 
  icon, 
  value, 
  label, 
  color 
}: { 
  icon: React.ReactNode
  value: number
  label: string
  color: 'vermillion' | 'jade' | 'gold'
}) {
  const colorClasses = {
    vermillion: 'text-[hsl(var(--vermillion))]',
    jade: 'text-[hsl(var(--jade))]',
    gold: 'text-[hsl(var(--gold-dark))]'
  }

  return (
    <div className="flex items-center gap-2 px-2.5 py-1 bg-white/50 dark:bg-[hsl(var(--card)/0.5)] rounded-lg border border-[hsl(var(--border)/0.5)]">
      <span className={colorClasses[color]}>{icon}</span>
      <span className="font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
