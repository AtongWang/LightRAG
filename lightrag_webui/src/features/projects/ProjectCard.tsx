/**
 * Project Card Component
 * Displays a single project with edit and delete functionality
 */

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import { Edit, Trash2, Settings, Save, X } from 'lucide-react'
import type { Project } from '@/types/project'

interface ProjectCardProps {
  project: Project
  onClick: () => void
  onEdit: (projectId: string, data: any) => Promise<void>
  onDelete: (projectId: string) => Promise<void>
}

export function ProjectCard({ project, onClick, onEdit, onDelete }: ProjectCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || '',
    cover_image: project.cover_image || ''
  })

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onEdit(project.project_id, formData)
      setEditDialogOpen(false)
      setEditing(false)
    } catch (error) {
      console.error('Failed to update project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)

    try {
      await onDelete(project.project_id)
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error('Failed to delete project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    onClick()
  }

  return (
    <>
      <div onClick={handleCardClick} className="group cursor-pointer">
        <Card className="hover:border-brand-primary hover:shadow-lg transition-all duration-200 overflow-hidden h-full">
          {/* Cover Image */}
          {project.cover_image ? (
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={project.cover_image}
                alt={project.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-brand-primary/30">
                {project.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Content */}
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg truncate flex-1">{project.name}</h3>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditDialogOpen(true)
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>

            {/* Statistics */}
            {project.stats && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                <span>📄 {project.stats.document_count}</span>
                <span>🔵 {project.stats.entity_count}</span>
                <span>🔗 {project.stats.relation_count}</span>
              </div>
            )}

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {project.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {project.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{project.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Status Badge */}
            {project.status && (
              <Badge
                variant={project.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {project.status === 'active' ? '活跃' : project.status}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑项目</DialogTitle>
            <DialogDescription>
              修改项目信息
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="项目名称"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="项目描述"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  封面图URL（可选）
                </label>
                <Input
                  type="url"
                  value={formData.cover_image}
                  onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Preview */}
              {formData.cover_image && (
                <div className="aspect-video w-full rounded-lg overflow-hidden border">
                  <img
                    src={formData.cover_image}
                    alt="封面预览"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false)
                  setFormData({
                    name: project.name,
                    description: project.description || '',
                    cover_image: project.cover_image || ''
                  })
                }}
              >
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除项目</DialogTitle>
            <DialogDescription>
              您确定要删除项目 "{project.name}" 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              删除项目将同时删除：
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
              <li>项目关联的所有文档</li>
              <li>知识图谱数据（实体和关系）</li>
              <li>本体定义</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
