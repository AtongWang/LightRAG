import { useState } from 'react'
import axios from 'axios'
import { Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { generateProjectDescription } from '@/api/meme-lab'
import type { MaterialSummary } from '@/api/meme-lab'

export function ProjectDescriptionGenerator({ projectId, onApply, disabled }: { projectId: string; onApply: (text: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<{ description: string; material_summary: MaterialSummary } | null>(null)
  const [error, setError] = useState('')
  const generate = async () => {
    setOpen(true)
    setLoading(true)
    setDraft(null)
    setError('')
    try {
      setDraft(await generateProjectDescription(projectId))
    } catch (error) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
      setError(typeof detail === 'string' ? detail : '简介生成失败，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }
  return (
    <>
      <Button variant="outline" size="sm" onClick={generate} disabled={loading || disabled}>
        <Sparkles className="w-4 h-4 mr-2" />根据文件生成简介
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>项目简介草稿</DialogTitle>
            <DialogDescription>依据本项目文件的解析正文生成。采用后可继续编辑，点击“保存更改”后生效。</DialogDescription>
          </DialogHeader>
          {loading && <p role="status">正在阅读现有文件并生成简介…</p>}
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          {draft && <>
            <p className="whitespace-pre-wrap text-sm">{draft.description}</p>
            <p className="text-xs text-muted-foreground">使用 {draft.material_summary.used_files} 个文件；跳过 {draft.material_summary.skipped_files} 个无正文文件{draft.material_summary.sampled ? '；长文已节选' : ''}{draft.material_summary.omitted_files ? `；另有 ${draft.material_summary.omitted_files} 个文件未纳入本次生成` : ''}。</p>
          </>}
          <DialogFooter>
            <Button variant="outline" disabled={loading || disabled} onClick={generate}>重新生成</Button>
            <Button disabled={!draft || loading || disabled} onClick={() => { if (draft) onApply(draft.description); setOpen(false) }}>采用简介</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
