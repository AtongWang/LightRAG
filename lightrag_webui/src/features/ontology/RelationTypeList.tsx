/**
 * Relation Type List Component
 * Displays and manages relation types in an ontology
 */

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Edit, Trash2, Plus, GripVertical } from 'lucide-react'
interface RelationTypeListProps {
  relationTypes: string[]
  onAdd: (name: string) => void
  onEdit: (oldName: string, newName: string) => void
  onDelete: (name: string) => void
  readonly?: boolean
}

export function RelationTypeList({
  relationTypes,
  onAdd,
  onEdit,
  onDelete,
  readonly = false
}: RelationTypeListProps) {
  const [newTypeName, setNewTypeName] = useState('')
  const [editingType, setEditingType] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleAdd = () => {
    if (newTypeName.trim() && !relationTypes.includes(newTypeName.trim())) {
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

  return (
    <div className="space-y-3">
      {relationTypes.map((typeName) => (
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
                    </div>

                    <div className="flex items-center gap-2">
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

      {/* Add New Relation Type */}
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
                placeholder="输入新关系类型名称..."
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
      {relationTypes.length === 0 && !readonly && (
        <div className="text-center py-8 text-muted-foreground">
          <p>还没有关系类型</p>
          <p className="text-sm">在上方输入框中添加您的第一个关系类型</p>
        </div>
      )}
    </div>
  )
}
