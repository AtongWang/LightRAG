/**
 * Attribute Definition Form Component
 * Form for defining attributes for entity types or relation types
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import Checkbox from '@/components/ui/Checkbox'
import type { AttributeDefinition } from '@/types/ontology'
import { Trash2, Plus } from 'lucide-react'

interface AttributeDefinitionFormProps {
  initialData?: Record<string, AttributeDefinition>
  onChange: (attributes: Record<string, AttributeDefinition>) => void
  readonly?: boolean
}

const ATTRIBUTE_TYPES = [
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔值' },
  { value: 'date', label: '日期' },
  { value: 'image', label: '图片' },
  { value: 'array', label: '数组' }
] as const

interface AttributeField {
  name: string
  type: AttributeDefinition['type']
  required: boolean
  description: string
  enum_values?: string[]
  min_value?: number
  max_value?: number
}

export function AttributeDefinitionForm({
  initialData = {},
  onChange,
  readonly = false
}: AttributeDefinitionFormProps) {
  const [fields, setFields] = useState<AttributeField[]>(() =>
    Object.entries(initialData).map(([name, def]) => ({
      name,
      type: def.type,
      required: def.required,
      description: def.description,
      enum_values: def.enum_values,
      min_value: def.min_value,
      max_value: def.max_value
    }))
  )

  // Use ref to store onChange to avoid dependency issues
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Track if this is the first render
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip first render to avoid unnecessary onChange call
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const attributes: Record<string, AttributeDefinition> = {}
    fields.forEach(field => {
      if (field.name.trim()) {
        attributes[field.name] = {
          type: field.type,
          required: field.required,
          description: field.description,
          ...(field.enum_values && { enum_values: field.enum_values }),
          ...(field.min_value !== undefined && { min_value: field.min_value }),
          ...(field.max_value !== undefined && { max_value: field.max_value })
        }
      }
    })
    onChangeRef.current(attributes)
  }, [fields])

  const addField = () => {
    setFields([
      ...fields,
      {
        name: '',
        type: 'string',
        required: false,
        description: ''
      }
    ])
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, updates: Partial<AttributeField>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  const addEnumValue = (fieldIndex: number) => {
    const field = fields[fieldIndex]
    if (field.enum_values) {
      updateField(fieldIndex, {
        enum_values: [...field.enum_values, '']
      })
    } else {
      updateField(fieldIndex, {
        enum_values: ['']
      })
    }
  }

  const updateEnumValue = (fieldIndex: number, valueIndex: number, value: string) => {
    const field = fields[fieldIndex]
    if (field.enum_values) {
      const newEnumValues = [...field.enum_values]
      newEnumValues[valueIndex] = value
      updateField(fieldIndex, { enum_values: newEnumValues })
    }
  }

  const removeEnumValue = (fieldIndex: number, valueIndex: number) => {
    const field = fields[fieldIndex]
    if (field.enum_values) {
      updateField(fieldIndex, {
        enum_values: field.enum_values.filter((_, i) => i !== valueIndex)
      })
    }
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 grid grid-cols-2 gap-3">
              {/* Attribute Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  属性名称 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={field.name}
                  onChange={(e) => updateField(index, { name: e.target.value })}
                  placeholder="例如：朝代"
                  disabled={readonly}
                  required
                />
              </div>

              {/* Attribute Type */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  数据类型 <span className="text-red-500">*</span>
                </label>
                <Select
                  value={field.type}
                  onValueChange={(value: AttributeDefinition['type']) =>
                    updateField(index, { type: value })
                  }
                  disabled={readonly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTRIBUTE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  描述
                </label>
                <Input
                  value={field.description}
                  onChange={(e) => updateField(index, { description: e.target.value })}
                  placeholder="描述此属性的用途"
                  disabled={readonly}
                />
              </div>

              {/* Type-specific fields */}
              {field.type === 'string' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    枚举值（可选）
                  </label>
                  <div className="space-y-2">
                    {field.enum_values?.map((enumValue, enumIndex) => (
                      <div key={enumIndex} className="flex gap-2">
                        <Input
                          value={enumValue}
                          onChange={(e) => updateEnumValue(index, enumIndex, e.target.value)}
                          placeholder={`枚举值 ${enumIndex + 1}`}
                          disabled={readonly}
                        />
                        {!readonly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEnumValue(index, enumIndex)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {!readonly && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addEnumValue(index)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        添加枚举值
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {field.type === 'number' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      最小值（可选）
                    </label>
                    <Input
                      type="number"
                      value={field.min_value ?? ''}
                      onChange={(e) =>
                        updateField(index, {
                          min_value: e.target.value ? Number(e.target.value) : undefined
                        })
                      }
                      placeholder="最小值"
                      disabled={readonly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      最大值（可选）
                    </label>
                    <Input
                      type="number"
                      value={field.max_value ?? ''}
                      onChange={(e) =>
                        updateField(index, {
                          max_value: e.target.value ? Number(e.target.value) : undefined
                        })
                      }
                      placeholder="最大值"
                      disabled={readonly}
                    />
                  </div>
                </>
              )}

              {/* Required Checkbox */}
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox
                  id={`required-${index}`}
                  checked={field.required}
                  onCheckedChange={(checked) =>
                    updateField(index, { required: checked as boolean })
                  }
                  disabled={readonly}
                />
                <label htmlFor={`required-${index}`} className="text-sm font-medium cursor-pointer">
                  必填字段
                </label>
              </div>
            </div>

            {/* Remove Button */}
            {!readonly && fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeField(index)}
                className="mt-6"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {!readonly && (
        <Button type="button" variant="outline" onClick={addField} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          添加属性
        </Button>
      )}
    </div>
  )
}
