import type { CreateOntologyDto, OntologySpec } from '@/types/ontology'

export function applyGeneratedOntology(current: OntologySpec | null, draft: CreateOntologyDto): OntologySpec {
  if (current && current.project_id !== draft.project_id) throw new Error('本体草稿所属项目不一致。')
  const now = new Date().toISOString()
  return {
    ...draft,
    ontology_id: current?.ontology_id || '',
    version: current?.version || '1.0',
    created_at: current?.created_at || now,
    updated_at: current?.updated_at || now
  }
}

export function editOntologyType(
  ontology: OntologySpec,
  field: 'entity_types' | 'relation_types',
  oldName: string,
  newName?: string
): OntologySpec {
  if (['Other', '其他'].includes(oldName) && !['Other', '其他'].includes(newName || '')) {
    throw new Error('其他是必需的兜底类型，不能删除或改为非兜底名称。')
  }
  if (newName !== undefined && (!newName.trim() || (newName !== oldName && ontology[field].includes(newName)))) {
    throw new Error('类型名称不能为空或重复。')
  }
  const constraints = { ...ontology.relation_constraints }
  if (field === 'entity_types') {
    for (const [relation, rule] of Object.entries(constraints)) {
      if (newName === undefined && [...rule.source_types, ...rule.target_types].includes(oldName)) {
        throw new Error(`类型 ${oldName} 被关系 ${relation} 引用，请先修改关系约束。`)
      }
      constraints[relation] = {
        source_types: rule.source_types.map(type => type === oldName ? newName ?? type : type),
        target_types: rule.target_types.map(type => type === oldName ? newName ?? type : type)
      }
    }
  } else {
    const rule = constraints[oldName]
    delete constraints[oldName]
    if (newName !== undefined && rule) constraints[newName] = rule
  }
  return {
    ...ontology,
    [field]: ontology[field].flatMap(type => type !== oldName ? [type] : newName === undefined ? [] : [newName]),
    relation_constraints: constraints
  }
}
