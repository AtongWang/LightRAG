/**
 * Entity Type List Component
 * Displays and manages entity types in an ontology
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Edit, Trash2, Plus, GripVertical } from 'lucide-react'
import type { AttributeDefinition } from '@/types/ontology'

interface EntityType {
  name: string
  description?: string
  attributes: Record<string, AttributeDefinition>
}

interface EntityTypeListProps {
  entityTypes: string[]
  entityAttributes: Record<string, Record<string, AttributeDefinition>>
  onAdd: (name: string) => void
  onEdit: (oldName: string, newName: string) => void
  onDelete: (name: string) => void
  onEditAttributes?: (entityType: string) => void
  readonly?: boolean
}

export function EntityTypeList({
  entityTypes,
  entityAttributes,
  onAdd,
  onEdit,
  onDelete,
  onEditAttributes,
  readonly = false
}: EntityTypeListProps) {
  const [newTypeName, setNewTypeName] = useState('')
  const [editingType, setEditingType] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleAdd = () => {
    if (newTypeName.trim() && !entityTypes.includes(newTypeName.trim())) {
      onAdd(newTypeName.trim())
      setNewTypeName('')
    }
  }

  const startEdit = (typeName: string) => {
    setEditingType(typeName)
    setEditName(typeName)
  }

  const handleEdit = () => {
    if (editingType && editName.trim() && editName.trim() !== editingType) {
      onEdit(editingType, editName.trim())
    }
    setEditingType(null)
    setEditName('')
  }

  const cancelEdit = () => {
    setEditingType(null)
    setEditName('')
  }

  const getAttributeCount = (typeName: string): number => {
    return Object.keys(entityAttributes[typeName] || {}).length
  }

  return (
    <div className="space-y-3">
      {entityTypes.map((typeName) => (
        <Card key={typeName} className="hover:shadow-md transition">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {/* Drag Handle (for future drag-and-drop support) */}
              {!readonly && (
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
              )}

              {/* Content */}
              <div className="flex-1">
                {editingType === typeName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleEdit}>
                      保存
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      取消
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{typeName}</h3>
                      <Badge variant="secondary">
                        {getAttributeCount(typeName)} 个属性
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {onEditAttributes && !readonly && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditAttributes(typeName)}
                        >
                          编辑属性
                        </Button>
                      )}
                      {!readonly && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEdit(typeName)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onDelete(typeName)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add New Entity Type */}
      {!readonly && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                }}
                placeholder="输入新实体类型名称..."
                className="flex-1"
              />
              <Button onClick={handleAdd} disabled={!newTypeName.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                添加
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {entityTypes.length === 0 && !readonly && (
        <div className="text-center py-8 text-muted-foreground">
          <p>还没有实体类型</p>
          <p className="text-sm">在上方输入框中添加您的第一个实体类型</p>
        </div>
      )}
    </div>
  )
}
