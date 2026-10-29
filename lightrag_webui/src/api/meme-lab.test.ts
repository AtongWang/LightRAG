import { expect, test } from 'bun:test'
import api, { searchNodes, updateOntology, validateOntologyDraft, generateOntology, generateProjectDescription, updateProject } from './meme-lab'

test('entity search sends project filters and returns the entity list', async () => {
  const originalAdapter = api.defaults.adapter
  const originalStorage = globalThis.localStorage
  globalThis.localStorage = { getItem: () => null } as unknown as Storage
  const entities = [{ id: 'example', entity_type: 'Other' }]
  api.defaults.adapter = async (config) => {
    expect(config.params).toEqual({
      project_id: 'project-a', query: 'example', entity_types: ['Other'], limit: 5
    })
    expect(config.paramsSerializer).toMatchObject({ indexes: null })
    return { data: { entities, total: 1 }, status: 200, statusText: 'OK', headers: {}, config }
  }
  try {
    expect(await searchNodes({
      projectId: 'project-a', query: 'example', entityTypes: ['Other'], limit: 5
    })).toEqual(entities)
  } finally {
    api.defaults.adapter = originalAdapter
    globalThis.localStorage = originalStorage
  }
})

test('file-assisted generation sends selected IDs and project edits return server metadata', async () => {
  const originalAdapter = api.defaults.adapter
  const originalStorage = globalThis.localStorage
  globalThis.localStorage = { getItem: () => null } as unknown as Storage
  const calls: Array<{ url?: string; body: unknown }> = []
  api.defaults.adapter = async (config) => {
    calls.push({ url: config.url, body: JSON.parse(config.data) })
    return { data: { project_id: 'p', name: 'Reviewed', description: 'Draft from files' }, status: 200, statusText: 'OK', headers: {}, config }
  }
  try {
    await generateOntology({ project_id: 'p', document_ids: ['doc-a', 'doc-b'] })
    expect((await generateProjectDescription('p')).description).toBe('Draft from files')
    expect((await updateProject('p', { name: 'Reviewed' })).name).toBe('Reviewed')
    expect(calls).toEqual([
      { url: '/ontology/generate', body: { project_id: 'p', document_ids: ['doc-a', 'doc-b'] } },
      { url: '/projects/p/generate-description', body: {} },
      { url: '/projects/p', body: { name: 'Reviewed' } }
    ])
  } finally {
    api.defaults.adapter = originalAdapter
    globalThis.localStorage = originalStorage
  }
})

test('ontology save returns the new server version and draft APIs use supplied definitions', async () => {
  const originalAdapter = api.defaults.adapter
  const originalStorage = globalThis.localStorage
  globalThis.localStorage = { getItem: () => null } as unknown as Storage
  const draft = { project_id: 'p', name: 'Draft', description: '', language: 'zh' as const, entity_types: ['Other'], relation_types: ['Other'] }
  const calls: Array<{ url?: string; body: unknown }> = []
  api.defaults.adapter = async (config) => {
    calls.push({ url: config.url, body: JSON.parse(config.data) })
    const data = config.url === '/ontology/validate' ? { is_valid: false } : { ...draft, ontology_id: 'saved', version: '1.0.1' }
    return { data, status: 200, statusText: 'OK', headers: {}, config }
  }
  try {
    expect((await updateOntology('saved', { name: 'Changed', version: '1.0' })).version).toBe('1.0.1')
    expect((await validateOntologyDraft(draft)).is_valid).toBe(false)
    await generateOntology({ project_id: 'p', requirements: 'Museum' })
    expect(calls).toEqual([
      { url: '/ontology/saved', body: { name: 'Changed', version: '1.0' } },
      { url: '/ontology/validate', body: draft },
      { url: '/ontology/generate', body: { project_id: 'p', requirements: 'Museum' } }
    ])
  } finally {
    api.defaults.adapter = originalAdapter
    globalThis.localStorage = originalStorage
  }
})
