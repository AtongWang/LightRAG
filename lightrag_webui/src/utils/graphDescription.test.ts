import { expect, test } from 'bun:test'
import { formatGraphDescription } from './graphDescription'

test('merged graph descriptions display separate lines without changing source text', () => {
  const stored = '商代文物。<SEP>馆藏器物。<SEP>青铜材质。'
  expect(formatGraphDescription(stored)).toBe('商代文物。\n馆藏器物。\n青铜材质。')
  expect(stored).toContain('<SEP>')
  expect(formatGraphDescription('普通描述。')).toBe('普通描述。')
  expect(formatGraphDescription('')).toBe('')
})
