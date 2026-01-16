/**
 * 文档上传器
 * 支持多模态文档上传（文本、图片、PDF等）
 */

import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Image as ImageIcon, AlertCircle, File, Sparkles, Info } from 'lucide-react'
import { useProjectStore } from '@/stores'
import { toast } from 'sonner'
import { uploadDocument, getMultimodalParserStatus, ParserStatus } from '@/api/lightrag'
import { Switch } from '@/components/ui/Switch'
import { Label } from '@/components/ui/Label'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/Tooltip'

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

interface DocumentUploaderProps {
  onUploadSuccess?: () => void
}

export function DocumentUploader({ onUploadSuccess }: DocumentUploaderProps) {
  const { currentProject } = useProjectStore()
  const [files, setFiles] = useState<UploadFile[]>([])

  // Multimodal parsing state
  const [useMultimodal, setUseMultimodal] = useState(false)
  const [parserStatus, setParserStatus] = useState<ParserStatus | null>(null)
  const [checkingParser, setCheckingParser] = useState(false)

  // Check parser availability on mount
  useEffect(() => {
    if (!parserStatus && !checkingParser) {
      setCheckingParser(true)
      getMultimodalParserStatus()
        .then((status) => {
          setParserStatus(status)
        })
        .catch((err) => {
          console.debug('Multimodal parser not available:', err)
          setParserStatus({
            status: 'unavailable',
            parsers: {
              mineru_api: false,
              mineru_local: false,
              raganything: false,
              recommended: null
            },
            multimodal_enabled: false
          })
        })
        .finally(() => setCheckingParser(false))
    }
  }, [parserStatus, checkingParser])

  // Check if multimodal is available (either enabled in config or parser available)
  const multimodalAvailable = parserStatus?.multimodal_enabled || parserStatus?.parsers.recommended

  const processUpload = useCallback(async (uploadItem: UploadFile) => {
    setFiles(prev => prev.map(f =>
      f.id === uploadItem.id ? { ...f, status: 'uploading' as const } : f
    ))

    try {
      // 使用真实的API上传文件，传递当前项目ID
      console.log('Uploading file with project_id:', currentProject?.project_id, 'multimodal:', useMultimodal)
      await uploadDocument(
        uploadItem.file,
        (progress) => {
          setFiles(prev => prev.map(f =>
            f.id === uploadItem.id ? { ...f, progress } : f
          ))
        },
        currentProject?.project_id,
        useMultimodal
      )

      setFiles(prev => prev.map(f =>
        f.id === uploadItem.id ? { ...f, status: 'success' as const, progress: 100 } : f
      ))

      toast.success(`${uploadItem.file.name} 上传成功`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '上传失败'
      setFiles(prev => prev.map(f =>
        f.id === uploadItem.id ? { ...f, status: 'error' as const, error: errorMsg } : f
      ))
      toast.error(`${uploadItem.file.name} 上传失败: ${errorMsg}`)
    }
  }, [currentProject?.project_id, useMultimodal])

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
  }, [currentProject, processUpload, useMultimodal])

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
      {/* 多模态解析开关 */}
      <TooltipProvider>
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Label htmlFor="multimodal-toggle-main" className="text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">
                  增强多模态解析
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>使用 MinerU 进行结构化文档解析，自动提取图片、表格和公式，并生成AI描述。需要运行 MinerU Docker 服务。</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                提取图片、表格和公式，生成AI描述
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {checkingParser && (
              <span className="text-xs text-gray-500 animate-pulse">检查中...</span>
            )}
            {parserStatus && !multimodalAvailable && !checkingParser && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-orange-600 dark:text-orange-400 cursor-help">
                    服务未启动
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>运行: docker compose --profile api up -d</p>
                </TooltipContent>
              </Tooltip>
            )}
            {parserStatus && multimodalAvailable && !checkingParser && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                ✓ {parserStatus.parsers.recommended || 'available'}
              </span>
            )}
            <Switch
              id="multimodal-toggle-main"
              checked={useMultimodal}
              onCheckedChange={setUseMultimodal}
              disabled={!multimodalAvailable}
              className="data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600 ml-2"
            />
          </div>
        </div>
      </TooltipProvider>

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
