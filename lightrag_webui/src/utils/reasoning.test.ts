import { expect, test } from 'bun:test'
import { splitReasoning } from './reasoning'

test('separates multiple reasoning blocks without dropping answer text', () => {
  expect(splitReasoning('开头<think>分析一</think>正文<think>分析二</think>结束')).toEqual({ thinking: '分析一\n\n分析二', answer: '开头正文结束', isThinking: false })
})

test('handles every streaming boundary without leaking tags into the answer', () => {
  const text = '<think>分析</think>**答案**'
  for (let end = 1; end <= text.length; end++) {
    const result = splitReasoning(text.slice(0, end), true)
    expect(result.answer).not.toContain('<')
    expect(result.answer).not.toContain('分析')
    expect(result.thinking).not.toContain('</')
  }
  expect(splitReasoning('<think>分析', false)).toEqual({ thinking: '分析', answer: '', isThinking: false })
})

test('preserves literal think tags inside Markdown code', () => {
  const text = '示例 `<think>`\n```xml\n<think>literal</think>\n```'
  expect(splitReasoning(text).answer).toBe(text)
  expect(splitReasoning('普通 **答案**').thinking).toBe('')
})
