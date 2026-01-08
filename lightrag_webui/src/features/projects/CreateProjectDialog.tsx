/**
 * 创建项目对话框
 * 中国风设计风格
 */

import { useState } from 'react'
import { useProjectStore } from '@/stores'
import { useUIStore } from '@/stores'
import { X, Plus, Scroll, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreateProjectDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { createProject } = useProjectStore()
  const { closeDialog } = useUIStore()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: [] as string[],
    cover_image: ''
  })

  const [tagInput, setTagInput] = useState('')

  const handleClose = () => {
    closeDialog('createProject')
    onOpenChange?.(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const project = await createProject(formData)
      handleClose()
      // Reset form
      setFormData({ name: '', description: '', tags: [], cover_image: '' })
      console.log('项目创建成功:', project)
    } catch (error) {
      console.error('创建项目失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    })
  }

  // 判断是否显示
  const isOpen = open ?? true

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* 对话框 */}
      <div className="relative w-full max-w-lg mx-4 animate-fade-in-up">
        <div className="bg-white dark:bg-[hsl(var(--card))] rounded-2xl shadow-2xl overflow-hidden border border-[hsl(var(--border))]">
          {/* 顶部装饰条 */}
          <div className="h-1.5 bg-gradient-to-r from-[hsl(var(--vermillion))] via-[hsl(var(--gold))] to-[hsl(var(--jade))]" />
          
          {/* 头部 */}
          <div className="relative px-6 pt-6 pb-4">
            {/* 背景装饰 */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full text-[hsl(var(--vermillion))]">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </svg>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--vermillion))] to-[hsl(var(--vermillion-dark))] flex items-center justify-center shadow-lg shadow-[hsl(var(--vermillion)/0.3)]">
                <Scroll className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">创建文化主题</h2>
                <p className="text-sm text-muted-foreground">开始构建您的知识图谱</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
            {/* 项目名称 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                主题名称 <span className="text-[hsl(var(--vermillion))]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：中国古代青铜器"
                className="w-full px-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vermillion)/0.3)] focus:border-[hsl(var(--vermillion))] transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                主题描述 <span className="text-[hsl(var(--vermillion))]">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="简要描述这个文化主题的内容和范围..."
                rows={3}
                className="w-full px-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vermillion)/0.3)] focus:border-[hsl(var(--vermillion))] transition-all resize-none placeholder:text-muted-foreground/60"
              />
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                主题标签
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="输入标签后按回车添加"
                  className="flex-1 px-4 py-2.5 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vermillion)/0.3)] focus:border-[hsl(var(--vermillion))] transition-all placeholder:text-muted-foreground/60"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2.5 bg-[hsl(var(--jade)/0.1)] text-[hsl(var(--jade))] border border-[hsl(var(--jade)/0.3)] rounded-xl hover:bg-[hsl(var(--jade)/0.2)] transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[hsl(var(--vermillion)/0.1)] to-[hsl(var(--gold)/0.1)] text-[hsl(var(--vermillion-dark))] dark:text-[hsl(var(--vermillion-light))] rounded-full border border-[hsl(var(--vermillion)/0.2)] text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-[hsl(var(--destructive))] transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 封面图URL */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                封面图片 <span className="text-muted-foreground font-normal">（可选）</span>
              </label>
              <input
                type="url"
                value={formData.cover_image}
                onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2.5 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vermillion)/0.3)] focus:border-[hsl(var(--vermillion))] transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            {/* 封面预览 */}
            {formData.cover_image && (
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-[hsl(var(--border))] bg-muted">
                <img
                  src={formData.cover_image}
                  alt="封面预览"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}

            {/* 底部按钮 */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name || !formData.description}
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-xl transition-all",
                  loading || !formData.name || !formData.description
                    ? "bg-muted-foreground/50 cursor-not-allowed"
                    : "bg-gradient-to-r from-[hsl(var(--vermillion))] to-[hsl(var(--vermillion-dark))] shadow-lg shadow-[hsl(var(--vermillion)/0.3)] hover:shadow-[hsl(var(--vermillion)/0.5)] hover:-translate-y-0.5"
                )}
              >
                {loading ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>创建中...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>创建主题</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
