import { expect, test } from 'bun:test'
import type { OntologySpec } from '@/types/ontology'
import { editOntologyType } from './ontology'

const schema = {
  entity_types: ['Artifact', 'Organization', 'Other'],
  relation_types: ['held_by', 'Other'],
  relation_constraints: { held_by: { source_types: ['Artifact'], target_types: ['Organization'] } }
} as OntologySpec

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
