/**
 * 文件列表组件
 * 显示项目中所有已上传的文档
 */

import { useEffect, useState, useCallback } from 'react'
import { FileText, Search, Trash2, Download, Eye, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getDocumentsPaginated, deleteDocuments, type DocStatusResponse } from '@/api/lightrag'
import { toast } from 'sonner'

interface DocumentFile {
  id: string
  filename: string
  file_type: string
  file_size: number
  upload_time: string
  status: 'pending' | 'parsing' | 'completed' | 'failed'
  entity_count?: number
  relation_count?: number
  error_message?: string
}

interface FileListProps {
  projectId?: string
}

export function FileList({ projectId }: FileListProps) {
  const [files, setFiles] = useState<DocumentFile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      // 使用真实的API获取文档列表，按项目ID过滤
      const response = await getDocumentsPaginated({
        page: 1,
        page_size: 100,
        sort_field: 'created_at',
        sort_direction: 'desc',
        project_id: projectId || null
      })

      // 转换API响应格式为组件所需格式
      const convertedFiles: DocumentFile[] = response.documents.map((doc: DocStatusResponse) => {
        // 从file_path提取文件名
        const filename = doc.file_path?.split('/').pop() || doc.id
        
        // 映射状态
        const statusMap: Record<string, DocumentFile['status']> = {
          'pending': 'pending',
          'processing': 'parsing',
          'preprocessed': 'parsing',
          'processed': 'completed',
          'failed': 'failed'
        }

        return {
          id: doc.id,
          filename: filename,
          file_type: getFileType(filename),
          file_size: doc.content_length || 0,
          upload_time: doc.created_at,
          status: statusMap[doc.status] || 'pending',
          entity_count: doc.chunks_count,
          error_message: doc.error_msg
        }
      })

      setFiles(convertedFiles)
    } catch (error) {
      console.error('Failed to fetch files:', error)
      toast.error('获取文档列表失败')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles, projectId])

  // 根据文件名获取文件类型
  const getFileType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const typeMap: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif'
    }
    return typeMap[ext || ''] || 'application/octet-stream'
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || file.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDelete = async (fileId: string) => {
    try {
      await deleteDocuments([fileId])
      setFiles(prev => prev.filter(f => f.id !== fileId))
      toast.success('文件删除成功')
    } catch (error) {
      toast.error('文件删除失败')
      console.error('Failed to delete file:', error)
    }
  }

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)))
    }
  }

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusBadge = (status: DocumentFile['status']) => {
    const config = {
      pending: { class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: '等待中' },
      parsing: { class: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', label: '解析中' },
      completed: { class: 'bg-[hsl(var(--jade)/0.15)] text-[hsl(var(--jade))]', label: '已完成' },
      failed: { class: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', label: '失败' }
    }
    const { class: className, label } = config[status]
    return (
      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", className)}>
        {label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--vermillion))]"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vermillion)/0.3)] focus:border-[hsl(var(--vermillion))] transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vermillion)/0.3)] focus:border-[hsl(var(--vermillion))] transition cursor-pointer"
        >
          <option value="all">全部状态</option>
          <option value="completed">已完成</option>
          <option value="parsing">解析中</option>
          <option value="pending">等待中</option>
          <option value="failed">失败</option>
        </select>
        <button
          onClick={() => fetchFiles()}
          className="p-2.5 bg-white dark:bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg hover:bg-muted transition"
          title="刷新列表"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* 批量操作 */}
      {selectedFiles.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-[hsl(var(--vermillion)/0.1)] rounded-lg border border-[hsl(var(--vermillion)/0.2)]">
          <span className="text-sm font-medium text-[hsl(var(--vermillion))]">已选择 {selectedFiles.size} 个文件</span>
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                try {
                  await deleteDocuments(Array.from(selectedFiles))
                  setFiles(prev => prev.filter(f => !selectedFiles.has(f.id)))
                  setSelectedFiles(new Set())
                  toast.success('批量删除成功')
                } catch (error) {
                  toast.error('批量删除失败')
                }
              }}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
            >
              批量删除
            </button>
            <button
              onClick={() => setSelectedFiles(new Set())}
              className="px-3 py-1.5 bg-white dark:bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-muted transition"
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* 文件列表 */}
      <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
        {/* 表头 */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] text-sm font-medium text-muted-foreground">
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-[hsl(var(--border))]"
            />
          </div>
          <div className="col-span-4">文件名</div>
          <div className="col-span-2">大小</div>
          <div className="col-span-2">上传时间</div>
          <div className="col-span-2">状态</div>
          <div className="col-span-1"></div>
        </div>

        {/* 文件项 */}
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">没有找到文件</p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-[hsl(var(--muted)/0.3)] transition group"
              >
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => handleSelectFile(file.id)}
                    className="w-4 h-4 rounded border-[hsl(var(--border))]"
                  />
                </div>
                <div className="col-span-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{file.filename}</p>
                      {file.status === 'completed' && (
                        <p className="text-xs text-muted-foreground">
                          {file.entity_count} 个实体 · {file.relation_count} 个关系
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">
                  {formatFileSize(file.file_size)}
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(file.upload_time), {
                    addSuffix: true,
                    locale: zhCN
                  })}
                </div>
                <div className="col-span-2">
                  {getStatusBadge(file.status)}
                  {file.error_message && (
                    <p className="text-xs text-red-600 mt-1">{file.error_message}</p>
                  )}
                </div>
                <div className="col-span-1">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      className="p-1.5 hover:bg-muted rounded-md"
                      title="查看"
                    >
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      className="p-1.5 hover:bg-muted rounded-md"
                      title="下载"
                    >
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
