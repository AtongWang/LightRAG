/**
 * 项目本体管理页面
 * 显示和编辑项目本体
 */

import { useParams } from 'react-router-dom'
import { OntologyEditor } from '@/features/ontology'
import { BookOpen } from 'lucide-react'

export default function ProjectOntology() {
  const { projectId } = useParams<{ projectId: string }>()

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--paper-warm))]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[hsl(var(--vermillion)/0.1)] flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-[hsl(var(--vermillion)/0.5)]" />
          </div>
          <p className="text-muted-foreground">项目ID无效</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--paper-warm))]">
      {/* 页面头部 */}
      <div className="flex-shrink-0 px-6 py-4 bg-white/50 dark:bg-[hsl(var(--card)/0.5)] border-b border-[hsl(var(--border))]">
        <h2 className="text-xl font-bold text-foreground">本体管理</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          定义和管理知识图谱的本体结构
        </p>
      </div>

      {/* 内容区域 - 添加滚动支持 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white dark:bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm p-6">
          <OntologyEditor projectId={projectId} />
        </div>
      </div>
    </div>
  )
}
