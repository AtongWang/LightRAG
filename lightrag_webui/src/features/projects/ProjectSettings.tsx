/**
 * 项目设置页面
 * 用于管理项目的各项配置
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectStore, useOntologyStore, useUIStore } from '@/stores'
import { Save, X, Trash2, Upload, Image as ImageIcon } from 'lucide-react'
import Button from '@/components/ui/Button'

interface ProjectSettingsData {
  name: string
  description: string
  cover_image?: string
  tags: string[]
}

export function ProjectSettings() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { currentProject, updateProject, deleteProject, loading } = useProjectStore()
  const { currentOntology } = useOntologyStore()
  const { showToast } = useUIStore()

  const [formData, setFormData] = useState<ProjectSettingsData>({
    name: '',
    description: '',
    cover_image: '',
    tags: []
  })

  const [hasChanges, setHasChanges] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (currentProject) {
      setFormData({
        name: currentProject.name,
        description: currentProject.description || '',
        cover_image: currentProject.cover_image || '',
        tags: currentProject.tags || []
      })
    }
  }, [currentProject])

  const handleChange = (field: keyof ProjectSettingsData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!projectId) return

    try {
      await updateProject(projectId, formData)
      setHasChanges(false)
      showToast('success', '设置已保存')
    } catch (error) {
      showToast('error', '保存失败，请重试')
    }
  }

  const handleDeleteProject = async () => {
    if (!projectId) return

    try {
      await deleteProject(projectId)
      showToast('success', '项目已删除')
      navigate('/')
    } catch (error) {
      showToast('error', '删除失败，请重试')
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      handleChange('tags', [...formData.tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    handleChange('tags', formData.tags.filter(t => t !== tag))
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 这里应该上传到服务器，暂时使用base64
      const reader = new FileReader()
      reader.onloadend = () => {
        handleChange('cover_image', reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">项目设置</h1>
          <p className="text-muted-foreground mt-1">管理项目的基本信息和配置</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button
              variant="outline"
              onClick={() => {
                setFormData({
                  name: currentProject.name,
                  description: currentProject.description || '',
                  cover_image: currentProject.cover_image || '',
                  tags: currentProject.tags || []
                })
                setHasChanges(false)
              }}
            >
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || loading}
          >
            <Save className="w-4 h-4 mr-2" />
            保存更改
          </Button>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-semibold">基本信息</h2>

        {/* 封面图 */}
        <div>
          <label className="block text-sm font-medium mb-2">封面图片</label>
          <div className="flex items-start gap-4">
            <div className="w-32 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {formData.cover_image ? (
                <img
                  src={formData.cover_image}
                  alt="封面"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <label className="cursor-pointer">
                <span className="inline-flex items-center px-4 py-2 bg-white border rounded-lg hover:bg-muted transition">
                  <Upload className="w-4 h-4 mr-2" />
                  上传图片
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                建议尺寸：800x600像素
              </p>
            </div>
          </div>
        </div>

        {/* 项目名称 */}
        <div>
          <label className="block text-sm font-medium mb-2">项目名称</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
            placeholder="输入项目名称"
          />
        </div>

        {/* 项目描述 */}
        <div>
          <label className="block text-sm font-medium mb-2">项目描述</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[120px]"
            placeholder="描述这个项目的主题和目标..."
          />
        </div>

        {/* 标签 */}
        <div>
          <label className="block text-sm font-medium mb-2">标签</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-sm"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-brand-primary/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="输入标签后按回车添加"
            />
            <Button
              variant="outline"
              onClick={handleAddTag}
            >
              添加
            </Button>
          </div>
        </div>
      </div>

      {/* 本体信息 */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold">本体配置</h2>
        {currentOntology ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">当前本体</span>
              <span className="font-medium">{currentOntology.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">版本</span>
              <span className="text-sm">{currentOntology.version}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">实体类型</span>
              <span className="text-sm">{currentOntology.entity_types.length} 个</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">关系类型</span>
              <span className="text-sm">{currentOntology.relation_types.length} 个</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂未配置本体</p>
        )}
      </div>

      {/* 项目统计 */}
      {currentProject.stats && (
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">项目统计</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-brand-primary">
                {currentProject.stats.document_count}
              </div>
              <div className="text-sm text-muted-foreground">文档数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-secondary">
                {currentProject.stats.entity_count}
              </div>
              <div className="text-sm text-muted-foreground">实体数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-accent">
                {currentProject.stats.relation_count}
              </div>
              <div className="text-sm text-muted-foreground">关系数</div>
            </div>
            <div>
              <div className="text-sm font-medium">
                {new Date(currentProject.stats.last_updated).toLocaleDateString()}
              </div>
              <div className="text-sm text-muted-foreground">最后更新</div>
            </div>
          </div>
        </div>
      )}

      {/* 危险操作 */}
      <div className="bg-red-50 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-red-600">危险操作</h2>
        <p className="text-sm text-red-600/80">
          删除项目将永久删除所有相关的文档、实体和关系数据，此操作不可恢复。
        </p>
        {!showDeleteConfirm ? (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除项目
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={loading}
            >
              确认删除
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
