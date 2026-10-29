import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { getDocumentsPaginated } from '@/api/lightrag'
import type { DocStatusResponse, PaginationInfo } from '@/api/lightrag'

interface Props {
  projectId: string
  selected: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

const statusLabels = { pending: '待处理', processing: '解析中', preprocessed: '已预处理', processed: '已完成', failed: '处理失败' }

export function ProjectDocumentPicker({ projectId, selected, onChange, disabled }: Props) {
  const [page, setPage] = useState(1)
  const [documents, setDocuments] = useState<DocStatusResponse[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    getDocumentsPaginated({ project_id: projectId, page, page_size: 20, sort_field: 'created_at', sort_direction: 'desc' })
      .then(result => { if (active) { setDocuments(result.documents); setPagination(result.pagination) } })
      .catch(() => { if (active) setError('文件列表加载失败，请重新打开窗口重试。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId, page])

  return (
    <fieldset disabled={disabled || loading} className="space-y-2 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">辅助文件（已选 {selected.length}/100）</legend>
      <p className="text-xs text-muted-foreground">选择本项目已上传的资料，将读取解析正文；长文会节选，没有解析正文的文件会跳过。</p>
      {loading ? <p role="status" className="text-sm">加载文件…</p> : error ? <p role="alert" className="text-sm text-destructive">{error}</p> : documents.length === 0 ? <p className="text-sm text-muted-foreground">本项目暂无上传文件。</p> : (
        <div className="max-h-40 overflow-y-auto space-y-2">
          {documents.map(doc => (
            <label key={doc.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={selected.includes(doc.id)}
                disabled={!selected.includes(doc.id) && selected.length >= 100}
                onChange={event => onChange(event.target.checked ? [...selected, doc.id] : selected.filter(id => id !== doc.id))} />
              <span className="truncate flex-1" title={doc.file_path}>{doc.file_path.split(/[\\/]/).pop()}</span>
              <span className="text-xs text-muted-foreground">{statusLabels[doc.status]}</span>
            </label>
          ))}
        </div>
      )}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <Button variant="outline" size="sm" disabled={!pagination.has_prev || loading || disabled} onClick={() => { setLoading(true); setError(''); setPage(value => value - 1) }}>上一页</Button>
          <span>第 {page}/{pagination.total_pages} 页</span>
          <Button variant="outline" size="sm" disabled={!pagination.has_next || loading || disabled} onClick={() => { setLoading(true); setError(''); setPage(value => value + 1) }}>下一页</Button>
        </div>
      )}
    </fieldset>
  )
}
