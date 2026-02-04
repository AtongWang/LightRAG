/**
 * Ontology Import Dialog Component
 * Dialog for importing ontology with templates and JSON input
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Download, Upload, FileText, Copy, Check } from 'lucide-react'

interface OntologyImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (jsonData: string) => Promise<void>
  isImporting: boolean
}

// Demo templates
const DEMO_TEMPLATES = [
  {
    id: 'general',
    name: '通用知识图谱',
    description: '适用于多领域的通用本体',
    data: {
      name: '通用知识图谱',
      description: '适用于多领域的通用本体',
      language: 'zh',
      entity_types: ['Person', 'Organization', 'Location', 'Event', 'Concept', 'Product', 'Document', 'Time', 'Other'],
      relation_types: ['关联', '属于', '位于', '参与', '创建', '包含', '影响', '发生于', 'Other']
    }
  },
  {
    id: 'academic',
    name: '学术论文',
    description: '用于学术论文分析',
    data: {
      name: '学术论文知识图谱',
      description: '用于学术论文分析和引文网络构建',
      language: 'zh',
      entity_types: ['Author', 'Paper', 'Institution', 'Conference', 'Journal', 'Dataset', 'Method', 'Task', 'Other'],
      relation_types: ['撰写', '引用', '使用', '属于', '提出', '评测', '发表于', '合作', 'Other']
    }
  },
  {
    id: 'business',
    name: '企业商业',
    description: '用于企业关系分析',
    data: {
      name: '企业商业知识图谱',
      description: '用于企业关系分析、供应链和市场研究',
      language: 'zh',
      entity_types: ['Company', 'Person', 'Product', 'Industry', 'Location', 'Event', 'Patent', 'Brand', 'Other'],
      relation_types: ['投资', '收购', '合作', '竞争', '供应', '任职', '创立', '生产', '位于', 'Other']
    }
  },
  {
    id: 'medical',
    name: '医疗健康',
    description: '用于医疗健康领域',
    data: {
      name: '医疗健康知识图谱',
      description: '用于医疗健康领域的知识抽取和分析',
      language: 'zh',
      entity_types: ['Disease', 'Symptom', 'Drug', 'Treatment', 'Doctor', 'Hospital', 'BodyPart', 'MedicalTest', 'Other'],
      relation_types: ['治疗', '引起', '表现为', '检查', '禁忌', '适用于', '属于', '就职于', 'Other']
    }
  }
]

export function OntologyImportDialog({
  open,
  onOpenChange,
  onImport,
  isImporting
}: OntologyImportDialogProps) {
  const [jsonInput, setJsonInput] = useState('')
  const [activeTab, setActiveTab] = useState<'templates' | 'input'>('templates')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDownloadTemplate = (template: typeof DEMO_TEMPLATES[0]) => {
    const dataStr = JSON.stringify(template.data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ontology-template-${template.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyTemplate = async (template: typeof DEMO_TEMPLATES[0]) => {
    const dataStr = JSON.stringify(template.data, null, 2)
    await navigator.clipboard.writeText(dataStr)
    setCopiedId(template.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleUseTemplate = (template: typeof DEMO_TEMPLATES[0]) => {
    setJsonInput(JSON.stringify(template.data, null, 2))
    setActiveTab('input')
    setError(null)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      // Validate JSON
      JSON.parse(text)
      setJsonInput(text)
      setError(null)
    } catch (e) {
      setError('文件格式错误，请确保是有效的JSON文件')
    }
    // Reset file input
    event.target.value = ''
  }

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      setError('请输入或上传本体JSON')
      return
    }

    try {
      // Validate JSON
      JSON.parse(jsonInput)
      setError(null)
      await onImport(jsonInput)
      // Reset state after successful import
      setJsonInput('')
      setActiveTab('templates')
      onOpenChange(false)
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError('JSON格式错误，请检查输入')
      } else {
        setError(e instanceof Error ? e.message : '导入失败')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>导入本体</DialogTitle>
          <DialogDescription>
            选择模板快速开始，或上传/粘贴自定义本体JSON
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'templates' | 'input')} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">
              <FileText className="w-4 h-4 mr-2" />
              模板库
            </TabsTrigger>
            <TabsTrigger value="input">
              <Upload className="w-4 h-4 mr-2" />
              上传/粘贴
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="flex-1 overflow-auto mt-4">
            <div className="grid grid-cols-2 gap-4">
              {DEMO_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                      <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{template.data.entity_types.length} 实体类型</span>
                        <span>•</span>
                        <span>{template.data.relation_types.length} 关系类型</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadTemplate(template)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      下载
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyTemplate(template)}
                    >
                      {copiedId === template.id ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          复制
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                    >
                      使用
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="input" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              <div className="flex gap-2">
                <label className="flex-1">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button variant="outline" className="w-full" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      上传JSON文件
                    </span>
                  </Button>
                </label>
              </div>
              
              <div className="flex-1 min-h-0">
                <textarea
                  className="w-full h-full min-h-[300px] p-3 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={`粘贴本体JSON，格式示例：
{
  "name": "本体名称",
  "description": "描述",
  "language": "zh",
  "entity_types": ["Person", "Location", "Other"],
  "relation_types": ["关联", "Other"]
}`}
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value)
                    setError(null)
                  }}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || !jsonInput.trim()}
          >
            {isImporting ? '导入中...' : '确认导入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
