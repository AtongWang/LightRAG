import { expect, test } from 'bun:test'
import { createProjectSigmaGraph, getNodeDisplayName } from './projectGraph'
import type { RawGraph } from '@/stores/graph'

test('node display names hide only scoped prefixes and preserve internal IDs', () => {
  const id = 'project:25488cde58cfa83a8b2eb43aabf7b120:北魏'
  expect(getNodeDisplayName(id)).toBe('北魏')
  expect(getNodeDisplayName(id, { display_name: '北魏时期', entity_name: id })).toBe('北魏时期')
  expect(getNodeDisplayName(id, { entity_name: id })).toBe('北魏')
  expect(getNodeDisplayName(id, { display_name: '' })).toBe('北魏')
  expect(getNodeDisplayName('image:asset-123')).toBe('image:asset-123')
  expect(getNodeDisplayName('普通名称:子名称')).toBe('普通名称:子名称')
  expect(id).toBe('project:25488cde58cfa83a8b2eb43aabf7b120:北魏')
})

test('project graph preserves parallel predicates, reverse directions and display names', () => {
  const raw = {
    nodes: [
      { id: 'project:a:vessel', properties: { display_name: 'Vessel' } },
      { id: 'project:a:museum', properties: { display_name: 'Museum' } }
    ],
    edges: [
      { source: 'project:a:vessel', target: 'project:a:museum', properties: { relation_type: 'located_in', direction_known: true } },
      { source: 'project:a:vessel', target: 'project:a:museum', properties: { relation_type: 'owned_by', direction_known: true } },
      { source: 'project:a:museum', target: 'project:a:vessel', properties: { relation_type: 'owns', direction_known: true } }
    ]
  } as unknown as RawGraph
  const graph = createProjectSigmaGraph(raw, 1, 4)
  expect(graph.size).toBe(3)
  expect(graph.getNodeAttribute('project:a:vessel', 'label')).toBe('Vessel')
  expect(graph.outDegree('project:a:vessel')).toBe(2)
  expect(graph.outDegree('project:a:museum')).toBe(1)
  expect(graph.edges().map(id => graph.getEdgeAttribute(id, 'label')).sort()).toEqual(['located_in', 'owned_by', 'owns'])
  expect(graph.edges().every(id => graph.getEdgeAttribute(id, 'type') === 'curvedArrow')).toBe(true)
})
