export function splitReasoning(content: string, streaming = false) {
  const thinking: string[] = []
  let answer = ''
  let current = ''
  let inside = false
  let offset = 0
  const tokens = /(`{3,}|~{3,})[\s\S]*?(?:\1|$)|`[^`\n]*`|<\/?think>/gi
  const append = (text: string) => { if (inside) current += text; else answer += text }
  for (const match of content.matchAll(tokens)) {
    append(content.slice(offset, match.index))
    const token = match[0]
    if (token.toLowerCase() === '<think>') {
      inside = true
    } else if (token.toLowerCase() === '</think>') {
      if (current) thinking.push(current)
      current = ''
      inside = false
    } else append(token)
    offset = match.index! + token.length
  }
  let tail = content.slice(offset)
  if (streaming) tail = tail.replace(/<\/?(?:t(?:h(?:i(?:n(?:k)?)?)?)?)?$/i, '')
  append(tail)
  if (current) thinking.push(current)
  return { thinking: thinking.join('\n\n'), answer, isThinking: streaming && inside }
}
