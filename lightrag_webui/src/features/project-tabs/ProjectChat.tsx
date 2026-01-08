/**
 * 项目智能问答页面
 * 基于知识图谱的智能对话界面
 */

import { ChatInterface } from '@/features/chat'

export default function ProjectChat() {
  return (
    <div className="h-full w-full flex flex-col bg-[hsl(var(--background))]">
      {/* 页面头部 */}
      <div className="flex-shrink-0 px-6 py-4 bg-white/50 dark:bg-[hsl(var(--card)/0.5)] border-b border-[hsl(var(--border))]">
        <h2 className="text-xl font-bold text-foreground">智能问答</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          与知识库进行对话，获取智能解答
        </p>
      </div>

      {/* 聊天界面 - 填满剩余空间 */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  )
}
