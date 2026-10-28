import { expect, test } from 'bun:test'
import api, { searchNodes } from './meme-lab'

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
