import { expect, test } from 'bun:test'
import type { OntologySpec } from '@/types/ontology'
import { editOntologyType, applyGeneratedOntology } from './ontology'

const schema: OntologySpec = {
  ontology_id: 'schema', project_id: 'p', name: 'Schema', description: '', language: 'zh',
  version: '1.0', created_at: 'original', updated_at: 'original',
  entity_types: ['Artifact', 'Organization', 'Other'],
  relation_types: ['held_by', 'Other'],
  relation_constraints: { held_by: { source_types: ['Artifact'], target_types: ['Organization'] } }
}

test('renaming entity and relation types preserves endpoint constraints', () => {
  const renamed = editOntologyType(schema, 'entity_types', 'Artifact', 'Object')
  expect(renamed.relation_constraints?.held_by.source_types).toEqual(['Object'])
  const renamedRelation = editOntologyType(renamed, 'relation_types', 'held_by', 'stored_in')
  expect(renamedRelation.relation_constraints?.stored_in.source_types).toEqual(['Object'])
  expect(renamedRelation.relation_constraints?.held_by).toBeUndefined()
  expect(schema.relation_constraints?.held_by.source_types).toEqual(['Artifact'])
})

test('referenced entity types and fallback types cannot be removed', () => {
  expect(() => editOntologyType(schema, 'entity_types', 'Artifact')).toThrow()
  expect(() => editOntologyType(schema, 'entity_types', 'Other')).toThrow()
  expect(() => editOntologyType(schema, 'relation_types', 'Other', 'Fallback')).toThrow()
})

test('deleting a relation removes its own constraint and duplicate names are rejected', () => {
  const removed = editOntologyType(schema, 'relation_types', 'held_by')
  expect(removed.relation_constraints?.held_by).toBeUndefined()
  expect(() => editOntologyType(schema, 'entity_types', 'Artifact', 'Organization')).toThrow()
})

test('adopting generated types preserves existing identity/version and new definitions stay unsaved', () => {
  const draft = { ...schema, project_id: 'p', name: 'Generated', description: '', language: 'zh' as const }
  const existing = { ...schema, project_id: 'p', ontology_id: 'saved', version: '1.0.3', created_at: 'original' } as OntologySpec
  const updated = applyGeneratedOntology(existing, draft)
  expect(updated.ontology_id).toBe('saved')
  expect(updated.version).toBe('1.0.3')
  expect(updated.created_at).toBe('original')
  expect(updated.name).toBe('Generated')
  expect(applyGeneratedOntology(null, draft).ontology_id).toBe('')
  expect(() => applyGeneratedOntology(existing, { ...draft, project_id: 'other' })).toThrow()
})
