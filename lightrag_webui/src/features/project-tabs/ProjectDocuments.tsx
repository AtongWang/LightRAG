/**
 * 项目文档管理页面
 * 显示和管理项目内的文档
 */

import { useState } from 'react'
import { DocumentUploader, FileList } from '@/features/documents'
import { Upload, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProjectDocuments() {
  const [view, setView] = useState<'upload' | 'list'>('list')

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--paper-warm))]">
      {/* 页面头部 */}
      <div className="flex-shrink-0 px-6 py-4 bg-white/50 dark:bg-[hsl(var(--card)/0.5)] border-b border-[hsl(var(--border))]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">文档管理</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              上传和管理项目文档
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('list')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                view === 'list'
                  ? 'bg-[hsl(var(--vermillion))] text-white shadow-md'
                  : 'bg-white dark:bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[hsl(var(--vermillion)/0.3)] hover:bg-[hsl(var(--vermillion)/0.05)]'
              )}
            >
              <FolderOpen className="w-4 h-4" />
              文档列表
            </button>
            <button
              onClick={() => setView('upload')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                view === 'upload'
                  ? 'bg-[hsl(var(--vermillion))] text-white shadow-md'
                  : 'bg-white dark:bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[hsl(var(--vermillion)/0.3)] hover:bg-[hsl(var(--vermillion)/0.05)]'
              )}
            >
              <Upload className="w-4 h-4" />
              上传文档
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 - 添加滚动支持 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white dark:bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm min-h-full">
          {view === 'upload' ? (
            <div className="p-6">
              <DocumentUploader />
            </div>
          ) : (
            <div className="p-4">
              <FileList />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
