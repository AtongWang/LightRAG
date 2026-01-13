/**
 * Ontology Editor Component
 * Main interface for editing ontologies with entity and relation type management
 */

import { useState, useEffect } from 'react'
import { useOntologyStore } from '@/stores'
import { validateOntology } from '@/api/ontology'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { EntityTypeList } from './EntityTypeList'
import { RelationTypeList } from './RelationTypeList'
import { AttributeDefinitionForm } from './AttributeDefinitionForm'
import { OntologyImportDialog } from './OntologyImportDialog'
import { Save, CheckCircle2, AlertCircle, Download, Upload, Eye, Plus, Trash2 } from 'lucide-react'
import { importOntology } from '@/api/ontology'
import type { OntologySpec, AttributeDefinition } from '@/types/ontology'

interface OntologyEditorProps {
  projectId: string
}

export function OntologyEditor({ projectId }: OntologyEditorProps) {
  const {
    ontologies,
    loading,
    error,
    validationError,
    fetchOntology,
    createOntology,
    updateOntology,
    deleteOntology,
    validateOntology: validateOntologyStore,
    clearError,
    setCurrentOntology
  } = useOntologyStore()

  const [activeTab, setActiveTab] = useState<'entities' | 'relations'>('entities')
  const [hasChanges, setHasChanges] = useState(false)
  const [editingAttributesFor, setEditingAttributesFor] = useState<string | null>(null)
  const [editingAttributeType, setEditingAttributeType] = useState<'entity' | 'relation'>('entity')
  const [isValidating, setIsValidating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    warnings?: string[]
    error?: string
  } | null>(null)

  // Working copy of the ontology
  const [workingOntology, setWorkingOntology] = useState<OntologySpec | null>(null)
  const projectOntology = ontologies[projectId] || null

  useEffect(() => {
    setWorkingOntology(null)
    setHasChanges(false)
    setEditingAttributesFor(null)
    setEditingAttributeType('entity')
    setValidationResult(null)
    setCurrentOntology(null)
    fetchOntology(projectId)
  }, [projectId, fetchOntology, setCurrentOntology])

  useEffect(() => {
    setWorkingOntology(projectOntology ? { ...projectOntology } : null)
    setHasChanges(false)
  }, [projectOntology])

  const handleSave = async () => {
    if (!workingOntology) return

    setIsSaving(true)
    try {
      await updateOntology(workingOntology.ontology_id, {
        name: workingOntology.name,
        description: workingOntology.description,
        entity_types: workingOntology.entity_types,
        relation_types: workingOntology.relation_types,
        entity_attributes: workingOntology.entity_attributes,
        relation_attributes: workingOntology.relation_attributes
      })
      setHasChanges(false)
      setValidationResult({
        isValid: true,
        warnings: ['保存成功']
      })
      // Refresh ontology after save
      fetchOntology(projectId)
    } catch (error) {
      console.error('Failed to save ontology:', error)
      setValidationResult({
        isValid: false,
        error: error instanceof Error ? error.message : '保存失败'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleValidate = async () => {
    if (!workingOntology) return

    setIsValidating(true)
    try {
      const result = await validateOntologyStore(workingOntology.ontology_id)
      setValidationResult({
        isValid: result.is_valid,
        warnings: result.warnings,
        error: result.error_message
      })
    } catch (error) {
      setValidationResult({
        isValid: false,
        error: error instanceof Error ? error.message : '验证失败'
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleImportClick = () => {
    setImportDialogOpen(true)
  }

  const handleImportOntology = async (jsonData: string) => {
    setIsImporting(true)
    try {
      const imported = await importOntology(projectId, jsonData)
      // Refresh ontology after import
      await fetchOntology(projectId)
      setValidationResult({
        isValid: true,
        warnings: [`成功导入本体: ${imported.name}`]
      })
    } catch (error) {
      console.error('Failed to import ontology:', error)
      throw error // Re-throw so dialog can handle it
    } finally {
      setIsImporting(false)
    }
  }

  const handleClearOntology = async () => {
    if (!workingOntology) return

    const confirmed = window.confirm(
      '确定要清除当前本体吗？清除后可以重新创建或导入新本体。此操作不可撤销。'
    )
    if (!confirmed) return

    setIsClearing(true)
    try {
      await deleteOntology(workingOntology.ontology_id)
      setWorkingOntology(null)
      setHasChanges(false)
      setValidationResult({
        isValid: true,
        warnings: ['本体已清除，可以创建新本体或导入']
      })
      // Refresh to show create ontology UI
      await fetchOntology(projectId)
    } catch (error) {
      console.error('Failed to clear ontology:', error)
      setValidationResult({
        isValid: false,
        error: error instanceof Error ? error.message : '清除本体失败'
      })
    } finally {
      setIsClearing(false)
    }
  }

  const handleExport = () => {
    if (!workingOntology) return

    // Export format for reimport (without system fields)
    const exportData = {
      name: workingOntology.name,
      description: workingOntology.description,
      language: workingOntology.language,
      entity_types: workingOntology.entity_types,
      relation_types: workingOntology.relation_types,
      entity_attributes: workingOntology.entity_attributes,
      relation_attributes: workingOntology.relation_attributes,
      normalization_rules: workingOntology.normalization_rules
    }
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ontology-${workingOntology.name}-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleAddEntityType = (name: string) => {
    if (!workingOntology) return
    setWorkingOntology({
      ...workingOntology,
      entity_types: [...workingOntology.entity_types, name]
    })
    setHasChanges(true)
  }

  const handleEditEntityType = (oldName: string, newName: string) => {
    if (!workingOntology) return

    const updatedEntityTypes = workingOntology.entity_types.map(type =>
      type === oldName ? newName : type
    )

    const updatedEntityAttributes: Record<string, Record<string, AttributeDefinition>> = {}
    Object.entries(workingOntology.entity_attributes).forEach(([key, value]) => {
      const newKey = key === oldName ? newName : key
      updatedEntityAttributes[newKey] = value
    })

    setWorkingOntology({
      ...workingOntology,
      entity_types: updatedEntityTypes,
      entity_attributes: updatedEntityAttributes
    })
    setHasChanges(true)
  }

  const handleDeleteEntityType = (name: string) => {
    if (!workingOntology) return

    const newEntityAttributes = { ...workingOntology.entity_attributes }
    delete newEntityAttributes[name]

    setWorkingOntology({
      ...workingOntology,
      entity_types: workingOntology.entity_types.filter(type => type !== name),
      entity_attributes: newEntityAttributes
    })
    setHasChanges(true)
  }

  const handleAddRelationType = (name: string) => {
    if (!workingOntology) return
    setWorkingOntology({
      ...workingOntology,
      relation_types: [...workingOntology.relation_types, name]
    })
    setHasChanges(true)
  }

  const handleEditRelationType = (oldName: string, newName: string) => {
    if (!workingOntology) return

    const updatedRelationTypes = workingOntology.relation_types.map(type =>
      type === oldName ? newName : type
    )

    const updatedRelationAttributes: Record<string, Record<string, AttributeDefinition>> = {}
    Object.entries(workingOntology.relation_attributes).forEach(([key, value]) => {
      const newKey = key === oldName ? newName : key
      updatedRelationAttributes[newKey] = value
    })

    setWorkingOntology({
      ...workingOntology,
      relation_types: updatedRelationTypes,
      relation_attributes: updatedRelationAttributes
    })
    setHasChanges(true)
  }

  const handleDeleteRelationType = (name: string) => {
    if (!workingOntology) return

    const newRelationAttributes = { ...workingOntology.relation_attributes }
    delete newRelationAttributes[name]

    setWorkingOntology({
      ...workingOntology,
      relation_types: workingOntology.relation_types.filter(type => type !== name),
      relation_attributes: newRelationAttributes
    })
    setHasChanges(true)
  }

  const handleEditEntityAttributes = (entityType: string) => {
    setEditingAttributesFor(entityType)
    setEditingAttributeType('entity')
  }

  const handleEditRelationAttributes = (relationType: string) => {
    setEditingAttributesFor(relationType)
    setEditingAttributeType('relation')
  }

  const handleAttributesChange = (attributes: Record<string, AttributeDefinition>) => {
    if (!workingOntology || !editingAttributesFor) return

    // Use editingAttributeType to determine whether to update entity or relation attributes
    const isEntityType = editingAttributeType === 'entity'

    setWorkingOntology({
      ...workingOntology,
      ...(isEntityType
        ? { entity_attributes: { ...workingOntology.entity_attributes, [editingAttributesFor]: attributes } }
        : { relation_attributes: { ...workingOntology.relation_attributes, [editingAttributesFor]: attributes } }
      )
    })
    setHasChanges(true)
  }

  // Handler for creating new ontology
  const handleCreateOntology = async () => {
    setIsCreating(true)
    try {
      const newOntology = await createOntology({
        project_id: projectId,
        name: '默认本体',
        description: '项目默认本体规范',
        language: 'zh',
        // Note: 'Other' is required by validator for fallback classification
        entity_types: ['Person', 'Organization', 'Location', 'Event', 'Concept', 'Other'],
        relation_types: ['关联', '属于', '位于', '参与', '影响', 'Other'],
        entity_attributes: {},
        relation_attributes: {}
      })
      setWorkingOntology({ ...newOntology })
    } catch (error) {
      console.error('Failed to create ontology:', error)
    } finally {
      setIsCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          <p className="mt-2 text-muted-foreground">加载本体中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!workingOntology && !projectOntology) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>本体设置</CardTitle>
          <CardDescription>此项目尚未配置本体规范，请选择创建或导入本体</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {/* Import Dialog - needed even when no ontology */}
          <OntologyImportDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            onImport={handleImportOntology}
            isImporting={isImporting}
          />
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              本体定义了知识图谱的实体类型和关系类型，是进行知识抽取的基础。
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                onClick={handleCreateOntology}
                disabled={isCreating}
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    创建中...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    创建默认本体
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={handleImportClick}
                disabled={isImporting}
                className="gap-2"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    导入中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    导入本体
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!workingOntology) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">正在加载本体...</p>
        </CardContent>
      </Card>
    )
  }

  if (editingAttributesFor) {
    // Use editingAttributeType to determine whether editing entity or relation attributes
    const isEntityType = editingAttributeType === 'entity'
    const attributes = isEntityType
      ? workingOntology.entity_attributes[editingAttributesFor] || {}
      : workingOntology.relation_attributes[editingAttributesFor] || {}

    return (
      <Card>
        <CardHeader>
          <CardTitle>
            编辑{isEntityType ? '实体' : '关系'}类型属性: {editingAttributesFor}
          </CardTitle>
          <CardDescription>
            定义{isEntityType ? '实体' : '关系'}类型的属性结构
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttributeDefinitionForm
            initialData={attributes}
            onChange={handleAttributesChange}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setEditingAttributesFor(null)}>
              返回
            </Button>
            <Button onClick={() => setEditingAttributesFor(null)}>
              完成
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Import Dialog */}
      <OntologyImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImportOntology}
        isImporting={isImporting}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{workingOntology.name}</h2>
          <p className="text-muted-foreground mt-1">{workingOntology.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">v{workingOntology.version}</Badge>
            <Badge variant="outline">{workingOntology.language === 'zh' ? '中文' : 'English'}</Badge>
            {hasChanges && (
              <Badge variant="secondary">有未保存的更改</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleValidate} disabled={isValidating}>
            <Eye className="w-4 h-4 mr-2" />
            {isValidating ? '验证中...' : '验证'}
          </Button>
          <Button variant="outline" onClick={handleImportClick} disabled={isImporting}>
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? '导入中...' : '导入'}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          <Button variant="outline" onClick={handleClearOntology} disabled={isClearing} className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            {isClearing ? '清除中...' : '清除'}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <Card
          className={
            validationResult.isValid
              ? 'border-green-500 bg-green-50 dark:bg-green-950'
              : 'border-destructive bg-destructive/10'
          }
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {validationResult.isValid ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">
                  {validationResult.isValid ? '本体验证通过' : '本体验证失败'}
                </p>
                {validationResult.error && (
                  <p className="text-sm text-muted-foreground mt-1">{validationResult.error}</p>
                )}
                {validationResult.warnings && validationResult.warnings.length > 0 && (
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Editor */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'entities' | 'relations')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entities">
            实体类型 ({workingOntology.entity_types.length})
          </TabsTrigger>
          <TabsTrigger value="relations">
            关系类型 ({workingOntology.relation_types.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>实体类型管理</CardTitle>
              <CardDescription>
                管理知识图谱中的实体类型及其属性定义
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EntityTypeList
                entityTypes={workingOntology.entity_types}
                entityAttributes={workingOntology.entity_attributes}
                onAdd={handleAddEntityType}
                onEdit={handleEditEntityType}
                onDelete={handleDeleteEntityType}
                onEditAttributes={handleEditEntityAttributes}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>关系类型管理</CardTitle>
              <CardDescription>
                管理知识图谱中的关系类型及其属性定义
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RelationTypeList
                relationTypes={workingOntology.relation_types}
                relationAttributes={workingOntology.relation_attributes}
                onAdd={handleAddRelationType}
                onEdit={handleEditRelationType}
                onDelete={handleDeleteRelationType}
                onEditAttributes={handleEditRelationAttributes}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
