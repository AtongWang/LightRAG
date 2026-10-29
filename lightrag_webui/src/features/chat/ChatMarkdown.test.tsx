import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ChatMarkdown } from './ChatMarkdown'

test('renders headings, lists, tables, inline code, code blocks and math', () => {
  const html = renderToStaticMarkup(<ChatMarkdown>{'# 标题\n\n- 项目\n\n| 名称 |\n| --- |\n| 文物 |\n\n`inline`\n\n```python\nprint(1)\n```\n\n$x^2$'}</ChatMarkdown>)
  for (const tag of ['<h1>', '<ul>', '<table>', '<code>', '<pre>', 'katex']) expect(html).toContain(tag)
  expect(html).not.toContain('<pre><div')
})

test('keeps unsafe HTML inactive and external links isolated', () => {
  const html = renderToStaticMarkup(<ChatMarkdown>{'<script>alert(1)</script>\n\n[来源](https://example.com)'}</ChatMarkdown>)
  expect(html).not.toContain('<script>')
  expect(html).toContain('rel="noopener noreferrer"')
})
