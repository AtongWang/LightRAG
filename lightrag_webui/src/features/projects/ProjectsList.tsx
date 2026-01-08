/**
 * 项目列表页面
 * 中国风文化主题展示
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore, useUIStore } from '@/stores'
import { Plus, Search, LayoutGrid, List, FileText, Network, Scroll, Sparkles, Trash2 } from 'lucide-react'
import type { Project } from '@/types/project'
import { CreateProjectDialog } from './CreateProjectDialog'
import { cn } from '@/lib/utils'

export function ProjectsList() {
  const navigate = useNavigate()
  const { projects, loading, fetchProjects, setCurrentProject, deleteProject } = useProjectStore()
  const { dialogs, openDialog } = useUIStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleProjectClick = (project: Project) => {
    setCurrentProject(project)
    navigate(`/projects/${project.project_id}/documents`)
  }

  const handleDeleteProject = async (project: Project) => {
    if (confirm(`确定要删除项目 "${project.name}" 吗？此操作不可恢复。`)) {
      await deleteProject(project.project_id)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(var(--paper-warm))] to-[hsl(var(--background))]">
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* 左上角云纹 */}
        <div className="absolute -top-20 -left-20 w-80 h-80 opacity-[0.03]">
          <svg viewBox="0 0 200 200" className="w-full h-full text-[hsl(var(--vermillion))]">
            <path fill="currentColor" d="M100,20 Q140,20 160,50 Q180,80 160,110 Q140,140 100,140 Q60,140 40,110 Q20,80 40,50 Q60,20 100,20 M80,60 Q100,40 120,60 Q140,80 120,100 Q100,120 80,100 Q60,80 80,60" />
          </svg>
        </div>
        {/* 右下角装饰 */}
        <div className="absolute -bottom-20 -right-20 w-96 h-96 opacity-[0.02]">
          <svg viewBox="0 0 200 200" className="w-full h-full text-[hsl(var(--jade))]">
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </svg>
        </div>
      </div>

      <div className="relative w-full max-w-screen-2xl mx-auto px-8 lg:px-16 py-10">
        {/* 页面标题区 */}
        <div className="text-center mb-12 animate-fade-in-up">
          {/* 主标题 */}
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--vermillion))] to-[hsl(var(--vermillion-dark))] flex items-center justify-center shadow-lg shadow-[hsl(var(--vermillion)/0.3)]">
              <Scroll className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-[hsl(var(--vermillion))] via-[hsl(var(--vermillion-dark))] to-[hsl(var(--ink))] bg-clip-text text-transparent">
                文化主题库
              </span>
            </h1>
          </div>
          
          {/* 副标题 */}
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            <span className="text-[hsl(var(--jade))]">探索</span>
            <span className="mx-1">·</span>
            <span className="text-[hsl(var(--vermillion))]">传承</span>
            <span className="mx-1">·</span>
            <span className="text-[hsl(var(--gold-dark))]">创新</span>
            <span className="mx-3">—</span>
            构建您的文化知识图谱
          </p>

          {/* 装饰分隔线 */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-[hsl(var(--vermillion)/0.3)] to-transparent" />
            <div className="w-2 h-2 rotate-45 bg-[hsl(var(--gold))] opacity-60" />
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-[hsl(var(--vermillion)/0.3)] to-transparent" />
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 animate-fade-in-up stagger-1">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索文化主题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vermillion)/0.3)] focus:border-[hsl(var(--vermillion))] transition-all shadow-sm"
            />
          </div>

          {/* 右侧操作 */}
          <div className="flex items-center gap-3">
            {/* 视图切换 */}
            <div className="flex items-center bg-white dark:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-md transition-all",
                  viewMode === 'grid'
                    ? "bg-[hsl(var(--vermillion))] text-white shadow-sm"
                    : "hover:bg-muted"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-md transition-all",
                  viewMode === 'list'
                    ? "bg-[hsl(var(--vermillion))] text-white shadow-sm"
                    : "hover:bg-muted"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* 创建按钮 */}
            <button
              onClick={() => openDialog('createProject')}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[hsl(var(--vermillion))] to-[hsl(var(--vermillion-dark))] text-white rounded-xl font-medium shadow-lg shadow-[hsl(var(--vermillion)/0.3)] hover:shadow-[hsl(var(--vermillion)/0.5)] hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>创建主题</span>
            </button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-fade-in-up stagger-2">
          <StatCard
            icon={<Scroll className="w-5 h-5" />}
            label="全部主题"
            value={projects.length}
            color="vermillion"
          />
          <StatCard
            icon={<Sparkles className="w-5 h-5" />}
            label="活跃主题"
            value={projects.filter(p => p.status === 'active').length}
            color="jade"
          />
          <StatCard
            icon={<Network className="w-5 h-5" />}
            label="知识实体"
            value={projects.reduce((sum, p) => sum + (p.stats?.entity_count || 0), 0)}
            color="gold"
          />
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            label="文档总数"
            value={projects.reduce((sum, p) => sum + (p.stats?.document_count || 0), 0)}
            color="ink"
          />
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-64 rounded-2xl animate-shimmer" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState onCreateClick={() => openDialog('createProject')} />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project, index) => (
              <ProjectCard
                key={project.project_id}
                project={project}
                onClick={() => handleProjectClick(project)}
                onDelete={() => handleDeleteProject(project)}
                style={{ animationDelay: `${index * 0.05}s` }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project, index) => (
              <ProjectListItem
                key={project.project_id}
                project={project}
                onClick={() => handleProjectClick(project)}
                onDelete={() => handleDeleteProject(project)}
                style={{ animationDelay: `${index * 0.03}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 创建项目对话框 */}
      <CreateProjectDialog
        open={dialogs.createProject}
        onOpenChange={(open) => {
          if (!open) {
            useUIStore.getState().closeDialog('createProject')
          }
        }}
      />
    </div>
  )
}

/* 统计卡片组件 */
function StatCard({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'vermillion' | 'jade' | 'gold' | 'ink'
}) {
  const colorClasses = {
    vermillion: 'from-[hsl(var(--vermillion)/0.1)] to-transparent text-[hsl(var(--vermillion))]',
    jade: 'from-[hsl(var(--jade)/0.1)] to-transparent text-[hsl(var(--jade))]',
    gold: 'from-[hsl(var(--gold)/0.1)] to-transparent text-[hsl(var(--gold-dark))]',
    ink: 'from-[hsl(var(--ink)/0.1)] to-transparent text-[hsl(var(--ink))]'
  }

  return (
    <div className={cn(
      "p-4 rounded-xl bg-gradient-to-br bg-white dark:bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-sm",
      colorClasses[color]
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg bg-gradient-to-br", colorClasses[color])}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

/* 项目卡片组件 */
function ProjectCard({
  project,
  onClick,
  onDelete,
  style
}: {
  project: Project
  onClick: () => void
  onDelete: () => void
  style?: React.CSSProperties
}) {
  const statusColors = {
    active: 'bg-[hsl(var(--jade)/0.1)] text-[hsl(var(--jade))] border-[hsl(var(--jade)/0.3)]',
    archived: 'bg-muted text-muted-foreground border-border'
  }

  return (
    <div
      className="group relative bg-white dark:bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-[hsl(var(--vermillion)/0.1)] hover:-translate-y-1 transition-all duration-300 animate-fade-in-up"
      onClick={onClick}
      style={style}
    >
      {/* 顶部装饰条 */}
      <div className="h-1.5 bg-gradient-to-r from-[hsl(var(--vermillion))] via-[hsl(var(--gold))] to-[hsl(var(--jade))]" />
      
      {/* 内容区域 */}
      <div className="p-6">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--vermillion)/0.1)] to-[hsl(var(--vermillion)/0.05)] flex items-center justify-center">
              <Scroll className="w-5 h-5 text-[hsl(var(--vermillion))]" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground group-hover:text-[hsl(var(--vermillion))] transition-colors line-clamp-1">
                {project.name}
              </h3>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 text-xs rounded-full border",
                statusColors[project.status || 'active']
              )}>
                {project.status === 'active' ? '活跃' : '已归档'}
              </span>
            </div>
          </div>
          
          {/* 删除按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* 描述 */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">
          {project.description || '暂无描述'}
        </p>

        {/* 统计数据 */}
        <div className="flex items-center gap-4 pt-4 border-t border-[hsl(var(--border))]">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Network className="w-4 h-4 text-[hsl(var(--jade))]" />
            <span>{project.stats?.entity_count || 0}</span>
            <span className="text-xs">实体</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileText className="w-4 h-4 text-[hsl(var(--gold-dark))]" />
            <span>{project.stats?.document_count || 0}</span>
            <span className="text-xs">文档</span>
          </div>
        </div>
      </div>

      {/* 悬浮装饰 */}
      <div className="absolute top-4 right-4 w-16 h-16 opacity-0 group-hover:opacity-10 transition-opacity">
        <svg viewBox="0 0 100 100" className="w-full h-full text-[hsl(var(--vermillion))]">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </div>
  )
}

/* 列表项组件 */
function ProjectListItem({
  project,
  onClick,
  onDelete,
  style
}: {
  project: Project
  onClick: () => void
  onDelete: () => void
  style?: React.CSSProperties
}) {
  return (
    <div
      className="group flex items-center gap-4 p-4 bg-white dark:bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] cursor-pointer hover:shadow-lg hover:border-[hsl(var(--vermillion)/0.3)] transition-all animate-fade-in-up"
      onClick={onClick}
      style={style}
    >
      {/* 图标 */}
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--vermillion)/0.1)] to-[hsl(var(--vermillion)/0.05)] flex items-center justify-center flex-shrink-0">
        <Scroll className="w-6 h-6 text-[hsl(var(--vermillion))]" />
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground group-hover:text-[hsl(var(--vermillion))] transition-colors truncate">
            {project.name}
          </h3>
          <span className={cn(
            "px-2 py-0.5 text-xs rounded-full border flex-shrink-0",
            project.status === 'active'
              ? 'bg-[hsl(var(--jade)/0.1)] text-[hsl(var(--jade))] border-[hsl(var(--jade)/0.3)]'
              : 'bg-muted text-muted-foreground border-border'
          )}>
            {project.status === 'active' ? '活跃' : '归档'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {project.description || '暂无描述'}
        </p>
      </div>

      {/* 统计 */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Network className="w-4 h-4 text-[hsl(var(--jade))]" />
          <span>{project.stats?.entity_count || 0}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <FileText className="w-4 h-4 text-[hsl(var(--gold-dark))]" />
          <span>{project.stats?.document_count || 0}</span>
        </div>
      </div>

      {/* 删除按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-all flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

/* 空状态组件 */
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[hsl(var(--vermillion)/0.1)] to-[hsl(var(--vermillion)/0.05)] flex items-center justify-center">
          <Scroll className="w-12 h-12 text-[hsl(var(--vermillion)/0.5)]" />
        </div>
        {/* 装饰角 */}
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[hsl(var(--gold))]" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[hsl(var(--gold))]" />
      </div>
      
      <h3 className="text-xl font-bold mb-2">尚无文化主题</h3>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        开始创建您的第一个文化主题，构建知识图谱，传承文化基因
      </p>
      
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[hsl(var(--vermillion))] to-[hsl(var(--vermillion-dark))] text-white rounded-xl font-medium shadow-lg shadow-[hsl(var(--vermillion)/0.3)] hover:shadow-[hsl(var(--vermillion)/0.5)] hover:-translate-y-0.5 transition-all"
      >
        <Plus className="w-5 h-5" />
        <span>创建第一个主题</span>
      </button>
    </div>
  )
}

export default ProjectsList
