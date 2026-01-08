/**
 * 文档上传器
 * 支持多模态文档上传（文本、图片、PDF等）
 */

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Image as ImageIcon, AlertCircle, File } from 'lucide-react'
import { useProjectStore, useUIStore } from '@/stores'
import { toast } from 'sonner'

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export function DocumentUploader() {
  const { currentProject } = useProjectStore()
  const [files, setFiles] = useState<UploadFile[]>([])

  const processUpload = useCallback(async (uploadItem: UploadFile) => {
    setFiles(prev => prev.map(f =>
      f.id === uploadItem.id ? { ...f, status: 'uploading' as const } : f
    ))

    try {
      // TODO: 实际的API调用
      // const formData = new FormData()
      // formData.append('file', uploadItem.file)
      // await api.post(`/projects/${currentProject?.project_id}/documents`, formData)

      // 模拟上传进度
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        setFiles(prev => prev.map(f =>
          f.id === uploadItem.id ? { ...f, progress: i } : f
        ))
      }

      setFiles(prev => prev.map(f =>
        f.id === uploadItem.id ? { ...f, status: 'success' as const, progress: 100 } : f
      ))

      toast.success(`${uploadItem.file.name} 上传成功`)
    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.id === uploadItem.id ? { ...f, status: 'error' as const, error: '上传失败' } : f
      ))
      toast.error(`${uploadItem.file.name} 上传失败`)
    }
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!currentProject) {
      toast.error('请先选择一个项目')
      return
    }

    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending' as const,
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])

    // 开始上传每个文件
    newFiles.forEach(uploadItem => {
      processUpload(uploadItem)
    })
  }, [currentProject, processUpload])

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/*': ['.txt', '.md', '.csv'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    multiple: true
  })

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return ImageIcon
    }
    if (file.type === 'application/pdf') {
      return FileText
    }
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition
          ${isDragActive
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
            : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-emerald-500' : 'text-gray-400'}`} />
        {isDragActive ? (
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">释放文件以上传</p>
        ) : (
          <div>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">拖拽文件到此处，或点击选择文件</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              支持 TXT, MD, PDF, DOC, DOCX, PNG, JPG, GIF 等格式
            </p>
          </div>
        )}
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">上传队列</h3>
          {files.map(uploadItem => {
            const FileIcon = getFileIcon(uploadItem.file)
            return (
              <div
                key={uploadItem.id}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border"
              >
                <FileIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{uploadItem.file.name}</p>
                    <span className="text-xs text-gray-500">{formatFileSize(uploadItem.file.size)}</span>
                  </div>
                  {uploadItem.status === 'uploading' && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadItem.progress}%` }}
                      />
                    </div>
                  )}
                  {uploadItem.status === 'error' && (
                    <p className="text-xs text-red-600">{uploadItem.error}</p>
                  )}
                  {uploadItem.status === 'success' && (
                    <p className="text-xs text-green-600">上传成功</p>
                  )}
                </div>
                <button
                  onClick={() => removeFile(uploadItem.id)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  disabled={uploadItem.status === 'uploading'}
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* 提示信息 */}
      <div className="flex gap-2 p-4 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium mb-1">上传提示</p>
          <ul className="space-y-1 text-blue-600/80 dark:text-blue-400/80">
            <li>• 单个文件大小不超过 50MB</li>
            <li>• 支持批量上传，系统会自动解析文档内容</li>
            <li>• 图片文件将自动进行OCR识别</li>
            <li>• 上传后可在解析结果页面查看提取的实体和关系</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
