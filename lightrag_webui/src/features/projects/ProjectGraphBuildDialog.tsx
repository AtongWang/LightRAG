import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Network } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { buildProjectGraph, getProjectOntology } from '@/api/meme-lab'
import type { OntologySpec } from '@/types/ontology'

export function ProjectGraphBuildDialog({ projectId, onBuilt }: { projectId: string; onBuilt: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [building, setBuilding] = useState(false)
  const [ontology, setOntology] = useState<OntologySpec | null>(null)
  const [error, setError] = useState('')
  const load = async () => {
    setOpen(true)
    setLoading(true)
    setError('')
    setOntology(null)
    try { setOntology(await getProjectOntology(projectId)) }
    catch { setError('请先到本体页定义、检查并保存中文本体。') }
    finally { setLoading(false) }
  }
  const build = async () => {
    if (!ontology) return
    setBuilding(true)
    setError('')
    try {
      const result = await buildProjectGraph(projectId, ontology.ontology_id, ontology.version)
      setError(`构建完成，处理了 ${result.built_documents} 份文档。`)
      onBuilt()
      setOntology(null)
    } catch (error) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
      setError(typeof detail === 'string' ? detail : '构建失败，请检查模型服务。')
    } finally { setBuilding(false) }
  }
  return <>
    <Button variant="outline" disabled={building} onClick={load}><Network className="w-4 h-4 mr-2" />构建中文图谱</Button>
    <Dialog open={open} onOpenChange={value => { if (!building) setOpen(value) }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>确认本体后构建中文图谱</DialogTitle><DialogDescription>上传只解析资料。确认下面已保存的本体后，才会对待构建资料抽取实体、关系并建立图谱。旧图谱不会自动覆盖。</DialogDescription></DialogHeader>
        {loading && <p role="status">读取已保存本体…</p>}
        {ontology && <div className="space-y-2 text-sm">
          <p className="font-medium">{ontology.name} · 版本 {ontology.version}</p>
          <p>实体类型：{ontology.entity_types.join('、')}</p>
          <p>关系类型：{ontology.relation_types.join('、')}</p>
          <Link to={`/projects/${projectId}/ontology`} className="underline text-primary">先检查或修改本体</Link>
        </div>}
        {error && <p role="status" className="text-sm">{error}</p>}
        <DialogFooter><Button disabled={!ontology || loading || building} onClick={build}>{building ? '正在构建中文图谱…' : '确认此本体并开始构建'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
