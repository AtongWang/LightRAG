import { useState } from 'react'
import axios from 'axios'
import { Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { generateOntology } from '@/api/meme-lab'
import type { MaterialSummary } from '@/api/meme-lab'
import { ProjectDocumentPicker } from '@/components/documents/ProjectDocumentPicker'
import type { CreateOntologyDto } from '@/types/ontology'

interface Props {
  projectId: string
  language?: 'zh' | 'en'
  onApply: (draft: CreateOntologyDto) => void
}

export function OntologyGenerateDialog({ projectId, language = 'zh', onApply }: Props) {
  const [open, setOpen] = useState(false)
  const [requirements, setRequirements] = useState('')
  const [documentIds, setDocumentIds] = useState<string[]>([])
  const [summary, setSummary] = useState<MaterialSummary | null>(null)
  const [draft, setDraft] = useState<CreateOntologyDto | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setGenerating(true)
    setError(null)
    setDraft(null)
    try {
      const result = await generateOntology({ project_id: projectId, requirements, document_ids: documentIds, language })
      setDraft(result)
      setSummary(result.material_summary || null)
    } catch (error) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
      setError(typeof detail === 'string' ? detail : '生成失败，请稍后重试。')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Sparkles className="w-4 h-4 mr-2" />LLM 生成本体
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>生成本体草稿</DialogTitle>
            <DialogDescription>勾选上传的文件作为辅助材料，可选填补充说明。采用后会替换当前未保存的草稿，点击保存后才会生效。</DialogDescription>
          </DialogHeader>
          {open && <ProjectDocumentPicker key={projectId} projectId={projectId} selected={documentIds} disabled={generating}
            onChange={ids => { setDocumentIds(ids); setDraft(null) }} />}
          <label htmlFor="ontology-generation-requirements" className="text-sm font-medium">补充说明（可选）</label>
          <Textarea id="ontology-generation-requirements" value={requirements} maxLength={12000}
            onChange={event => { setRequirements(event.target.value); setDraft(null) }} disabled={generating} rows={3}
            placeholder="例如：研究青铜器的年代、出土地、制作工艺与收藏机构，重点描述文物与人物、地点的关系。" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {draft && (
            <div className="space-y-2">
              <p className="text-sm font-medium">已通过规则校验，请检查生成结果</p>
              {summary && <p className="text-xs text-muted-foreground">使用 {summary.used_files} 个文件，跳过 {summary.skipped_files} 个无正文文件{summary.sampled ? '；长文已节选' : ''}。</p>}
              <pre className="text-xs whitespace-pre-wrap break-words rounded-md bg-muted p-3 max-h-64 overflow-y-auto">{JSON.stringify(draft, (key, value) => key === 'project_id' ? undefined : value, 2)}</pre>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={generate} disabled={generating || (!requirements.trim() && documentIds.length === 0)}>
              {generating ? '生成中…' : draft ? '重新生成' : '生成草稿'}
            </Button>
            <Button disabled={!draft || generating} onClick={() => {
              if (draft) onApply(draft)
              setOpen(false)
            }}>采用草稿</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
