/**
 * 聊天界面组件
 * 支持多模态输入（文本+图片）的智能问答界面
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, User, Bot, Settings2, ImageIcon } from 'lucide-react'
import { useProjectStore, useSettingsStore } from '@/stores'
import { cn } from '@/lib/utils'
import { queryData, queryTextStream, Message as ApiMessage, QueryMode, QueryDataResponse } from '@/api/lightrag'
import type { MultimodalQueryResult } from '@/types/multimodal'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { MultimodalImage, MultimodalTable, MultimodalEquation } from '@/components/multimodal'
import 'katex/dist/katex.min.css'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'

interface ReferenceItem {
  reference_id: string
  file_path: string
  content?: string[]
}

/** 多模态内容引用 */
interface MultimodalReference {
  type: 'image' | 'table' | 'equation' | 'audio' | 'video' | 'generic'
  chunk_id?: string
  asset_id?: string
  asset_url?: string
  description?: string
  source_file?: string
  // 图片数据
  image_data?: string
  // 表格数据
  table_data?: string
  table_html?: string
  // 公式数据
  equation_latex?: string
}

type InlineBlock =
  | { type: 'text'; content: string }
  | { type: 'multimodal'; items: MultimodalReference[] }

const normalizeText = (value?: string) =>
  (value || '')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '')

function enrichMultimodalItems(
  items: MultimodalReference[],
  fallback?: MultimodalReference[]
): MultimodalReference[] {
  if (!fallback || fallback.length === 0) return items

  const matchBy = (item: MultimodalReference) => {
    // 1. Match by chunk_id with normalization (handles slight formatting differences from LLM)
    if (item.chunk_id) {
      const normalizedChunkId = normalizeText(item.chunk_id)
      const exactMatch = fallback.find(candidate => candidate.chunk_id === item.chunk_id)
      if (exactMatch) return exactMatch
      // Try normalized match
      const normalizedMatch = fallback.find(candidate =>
        candidate.chunk_id && normalizeText(candidate.chunk_id) === normalizedChunkId
      )
      if (normalizedMatch) return normalizedMatch
    }
    // 2. Match by asset_id
    if (item.asset_id) {
      return fallback.find(candidate => candidate.asset_id === item.asset_id)
    }
    // 3. Match by source_file + type
    if (item.source_file && item.type) {
      return fallback.find(
        candidate => candidate.type === item.type && candidate.source_file === item.source_file
      )
    }
    // 4. Match by description similarity + type
    if (item.description && item.type) {
      const needle = normalizeText(item.description)
      return fallback.find(candidate => {
        if (candidate.type !== item.type || !candidate.description) return false
        const haystack = normalizeText(candidate.description)
        return needle.length > 0 && (haystack.includes(needle) || needle.includes(haystack))
      })
    }
    // 5. Fallback: if only one item in fallback of matching type, use it
    if (item.type && item.type !== 'generic') {
      const typeMatches = fallback.filter(candidate => candidate.type === item.type)
      if (typeMatches.length === 1) return typeMatches[0]
    }
    // 6. Ultimate fallback: if only one item in fallback total, use it
    if (fallback.length === 1) return fallback[0]
    return undefined
  }

  return items.map(item => {
    const fallbackItem = matchBy(item)
    if (!fallbackItem) return item
    return {
      ...fallbackItem,
      ...item,
      type: item.type === 'generic' ? fallbackItem.type : item.type,
      chunk_id: item.chunk_id ?? fallbackItem.chunk_id,
      asset_id: item.asset_id ?? fallbackItem.asset_id,
      asset_url: item.asset_url ?? fallbackItem.asset_url,
      image_data: item.image_data ?? fallbackItem.image_data,
      table_data: item.table_data ?? fallbackItem.table_data,
      table_html: item.table_html ?? fallbackItem.table_html,
      equation_latex: item.equation_latex ?? fallbackItem.equation_latex,
      description: item.description ?? fallbackItem.description,
      source_file: item.source_file ?? fallbackItem.source_file
    }
  })
}

function splitTextByAnchors(text: string): InlineBlock[] {
  const blocks: InlineBlock[] = []
  const pattern = /\[\[MM:([^\]]+)\]\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    const chunkId = match[1].trim()
    if (chunkId) {
      blocks.push({
        type: 'multimodal',
        items: [{ type: 'generic', chunk_id: chunkId }]
      })
    }
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    blocks.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return blocks
}

function parseInlineMultimodalBlocks(content: string): InlineBlock[] {
  const lines = content.split('\n')
  const blocks: InlineBlock[] = []
  let buffer: string[] = []
  let i = 0

  const flushBuffer = () => {
    if (buffer.length > 0) {
      const bufferedText = buffer.join('\n')
      const anchorBlocks = splitTextByAnchors(bufferedText)
      blocks.push(...anchorBlocks)
      buffer = []
    }
  }

  const isMultimodalHeader = (value: string) =>
    /^\s*#{0,6}\s*(Multimodal|多模态)(内容)?\s*[:：]?/i.test(value) ||
    /^\s*(Multimodal|多模态)(内容)?\s*[:：]?/i.test(value)

  const isSectionHeader = (value: string) =>
    /^\s*#{1,6}\s+/.test(value) || /^\s*(参考文献|References)\b/i.test(value)

  const parseMultimodalJson = (jsonText: string): MultimodalReference[] | null => {
    try {
      const parsed = JSON.parse(jsonText.trim())
      if (parsed && Array.isArray(parsed.items)) {
        return parsed.items.map((item: any) => ({
          type: item.type || 'generic',
          asset_id: item.asset_id,
          asset_url: item.asset_url,
          description: item.description,
          source_file: item.source_file,
          image_data: item.image_data,
          table_data: item.table_markdown || item.table_data,
          table_html: item.table_html,
          equation_latex: item.equation_latex
        }))
      }
    } catch {
      return null
    }
    return null
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('```') && trimmedLine.toLowerCase().includes('json')) {
      const rawLines: string[] = [line]
      let jsonText = ''
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        jsonText += `${lines[i]}\n`
        rawLines.push(lines[i])
        i += 1
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        rawLines.push(lines[i])
        i += 1
      }
      const fencedItems = parseMultimodalJson(jsonText)
      if (fencedItems && fencedItems.length > 0) {
        flushBuffer()
        blocks.push({ type: 'multimodal', items: fencedItems })
      } else {
        buffer.push(...rawLines)
      }
      continue
    }

    if (trimmedLine.startsWith('{') && trimmedLine.includes('"items"')) {
      const inlineItems = parseMultimodalJson(trimmedLine)
      if (inlineItems && inlineItems.length > 0) {
        flushBuffer()
        blocks.push({ type: 'multimodal', items: inlineItems })
        i += 1
        continue
      }
    }

    if (!isMultimodalHeader(line)) {
      buffer.push(line)
      i += 1
      continue
    }

    const rawLines: string[] = [line]
    i += 1
    while (i < lines.length && lines[i].trim() === '') {
      rawLines.push(lines[i])
      i += 1
    }

    let jsonText = ''
    const inlineJsonStart = line.indexOf('{')
    if (inlineJsonStart >= 0) {
      jsonText = line.slice(inlineJsonStart)
    }
    if (i < lines.length && lines[i].trim().startsWith('```')) {
      rawLines.push(lines[i])
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        jsonText += `${lines[i]}\n`
        rawLines.push(lines[i])
        i += 1
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        rawLines.push(lines[i])
        i += 1
      }
    } else if (!jsonText) {
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !isSectionHeader(lines[i]) &&
        !isMultimodalHeader(lines[i])
      ) {
        jsonText += `${lines[i]}\n`
        rawLines.push(lines[i])
        i += 1
      }
    }

    const parsedItems = parseMultimodalJson(jsonText)

    if (parsedItems && parsedItems.length > 0) {
      flushBuffer()
      blocks.push({ type: 'multimodal', items: parsedItems })
    } else {
      buffer.push(...rawLines)
    }
  }

  flushBuffer()
  return blocks
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  references?: ReferenceItem[]
  multimodal?: MultimodalReference[]
  retrievalData?: QueryDataResponse
  retrievalLoading?: boolean
  retrievalError?: string
  isWelcome?: boolean
}

export function ChatInterface() {
  const { currentProject } = useProjectStore()
  const { querySettings } = useSettingsStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [queryMode, setQueryMode] = useState<QueryMode>('mix')
  const [retrievalOpen, setRetrievalOpen] = useState<Record<string, boolean>>({})
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const welcomeItems = [
    '回答关于知识图谱的问题',
    '查询实体和关系信息',
    '分析文档内容',
    '提供知识推理和建议'
  ]

  // 重置欢迎消息当项目改变
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `您好！我是${currentProject?.name || '知识库'}的智能助手。`,
        isWelcome: true,
        timestamp: new Date()
      }
    ])
  }, [currentProject?.project_id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }

  // Check if content has inline multimodal blocks that can actually be rendered
  // (i.e., after enrichment they have renderable properties like asset_id, image_data, etc.)
  const hasRenderableInlineMultimodal = (content: string, multimodal?: MultimodalReference[]) => {
    const blocks = parseInlineMultimodalBlocks(content)
    for (const block of blocks) {
      if (block.type === 'multimodal') {
        const enriched = enrichMultimodalItems(block.items, multimodal)
        const renderable = enriched.filter(item =>
          Boolean(item.asset_id || item.asset_url || item.image_data ||
                  item.table_html || item.table_data || item.equation_latex)
        )
        if (renderable.length > 0) return true
      }
    }
    return false
  }


  const renderMultimodalItems = (items: MultimodalReference[], keyPrefix: string) => {
    const renderableItems = items.filter(item =>
      Boolean(
        item.asset_id || item.asset_url || item.image_data ||
        item.table_html || item.table_data ||
        item.equation_latex
      )
    )

    if (renderableItems.length === 0) return null

    return (
      <div className="space-y-4">
        {renderableItems.map((item, index) => (
          <div
            key={`${keyPrefix}-${item.chunk_id || item.asset_id || index}`}
            className="space-y-2"
          >
            {item.type === 'image' && (
              <MultimodalImage
                assetId={item.asset_id}
                src={item.asset_url}
                base64Data={item.image_data}
                alt={item.description}
                maxHeight={240}
              />
            )}

            {item.type === 'table' && (
              <MultimodalTable
                htmlData={item.table_html}
                markdownData={item.table_data}
                maxHeight={220}
                expandable
              />
            )}

            {item.type === 'equation' && item.equation_latex && (
              <MultimodalEquation latex={item.equation_latex} />
            )}

            {(item.description || item.source_file) && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.description && <span>{item.description}</span>}
                {item.description && item.source_file && <span className="mx-1">·</span>}
                {item.source_file && <span>{item.source_file}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // 构建对话历史（排除系统消息和欢迎消息）
  const buildConversationHistory = useCallback((): ApiMessage[] => {
    return messages
      .filter(msg => msg.role !== 'system' && msg.id !== 'welcome')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
  }, [messages])

  const handleSend = async () => {
    if (!inputText.trim() || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const queryText = inputText
    setInputText('')
    setLoading(true)

    // 创建助手消息占位符
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      retrievalLoading: true
    }
    setMessages(prev => [...prev, assistantMessage])
    setRetrievalOpen(prev => ({ ...prev, [assistantMessageId]: true }))

    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController()

    try {
      const conversationHistory = buildConversationHistory()

      const retrievalRequest = {
        query: queryText,
        mode: queryMode,
        stream: false,
        conversation_history: conversationHistory,
        top_k: querySettings.top_k,
        chunk_top_k: querySettings.chunk_top_k,
        max_total_tokens: querySettings.max_total_tokens,
        enable_rerank: querySettings.enable_rerank,
        project_id: currentProject?.project_id,
      }

      // Fire retrieval in parallel so users can see results panel while streaming continues.
      queryData(retrievalRequest)
        .then((data) => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, retrievalData: data, retrievalLoading: false }
                : msg
            )
          )
        })
        .catch((error) => {
          const errorMsg = error instanceof Error ? error.message : '检索结果获取失败'
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, retrievalError: errorMsg, retrievalLoading: false }
                : msg
            )
          )
        })
      
      await queryTextStream(
        {
          query: queryText,
          mode: queryMode,
          stream: true,
          conversation_history: conversationHistory,
          top_k: querySettings.top_k,
          chunk_top_k: querySettings.chunk_top_k,
          max_total_tokens: querySettings.max_total_tokens,
          enable_rerank: querySettings.enable_rerank,
          project_id: currentProject?.project_id,
        },
        (chunk: string) => {
          // 流式更新助手消息
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          )
        },
        (error: string) => {
          console.error('Stream error:', error)
          toast.error(`查询失败: ${error}`)
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content || '抱歉，处理您的请求时发生错误。', role: 'system' as const }
                : msg
            )
          )
        },
        (meta) => {
          console.log('[ChatInterface] Received meta:', meta)
          console.log('[ChatInterface] Multimodal results:', meta.multimodal_results)

          const multimodal = Array.isArray(meta.multimodal_results)
            ? meta.multimodal_results.map((item: MultimodalQueryResult) => ({
                type: item.content_type,
                chunk_id: item.content_id,
                asset_id: item.asset_id,
                asset_url: item.asset_url,
                description: item.description,
                source_file: item.source_file,
                image_data: item.image_data,
                table_data: item.table_markdown,
                table_html: item.table_html,
                equation_latex: item.equation_latex
              }))
            : undefined

          console.log('[ChatInterface] Processed multimodal:', multimodal)

          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    references: meta.references ?? msg.references,
                    multimodal: multimodal ?? msg.multimodal
                  }
                : msg
            )
          )
        }
      )
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      toast.error(`发送失败: ${errorMsg}`)
      
      // 更新消息为错误状态
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: `抱歉，发生了错误：${errorMsg}`, role: 'system' as const }
            : msg
        )
      )
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[hsl(var(--card))]">
      {/* 消息列表 - flex-1 确保可滚动，overflow-y-scroll 始终显示滚动条 */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-scroll p-6 space-y-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}
      >
        {messages.filter(msg => msg.content).map(message => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div className={cn(
              "flex gap-3 max-w-[75%]",
              message.role === 'user' && 'flex-row-reverse'
            )}>
              {/* 头像 */}
              <div className={cn(
                "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm",
                message.role === 'user'
                  ? 'bg-gradient-to-br from-[hsl(var(--vermillion))] to-[hsl(var(--vermillion-dark))] text-white'
                  : message.role === 'assistant'
                  ? 'bg-gradient-to-br from-[hsl(var(--jade))] to-[hsl(var(--jade-dark))] text-white'
                  : 'bg-gray-400 text-white'
              )}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : message.role === 'assistant' ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </div>

              {/* 消息内容 */}
              <div className={cn(
                "flex flex-col",
                message.role === 'user' ? 'items-end' : 'items-start'
              )}>
                <div className={cn(
                  "rounded-2xl px-4 py-3 shadow-sm",
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-[hsl(var(--vermillion))] to-[hsl(var(--vermillion-dark))] text-white rounded-tr-md'
                    : message.role === 'assistant'
                    ? 'bg-[hsl(var(--muted))] text-foreground rounded-tl-md border border-[hsl(var(--border))]'
                    : 'bg-red-50 text-red-600 border border-red-200'
                )}>
                  {message.content && (
                    message.isWelcome ? (
                      <div className="space-y-2 text-sm">
                        <div className="font-medium text-foreground">{message.content}</div>
                        <div className="text-muted-foreground">我可以帮您：</div>
                        <ul className="space-y-1.5 text-muted-foreground">
                          {welcomeItems.map(item => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--vermillion))]" />
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="pt-1 text-muted-foreground">请随时向我提问。</div>
                      </div>
                    ) : message.role === 'assistant' ? (
                      (() => {
                        const inlineBlocks = parseInlineMultimodalBlocks(message.content)
                        return (
                          <div className="space-y-3">
                            {inlineBlocks.map((block, blockIndex) => (
                              block.type === 'text' ? (
                                <div
                                  key={`text-${message.id}-${blockIndex}`}
                                  className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-2 prose-code:text-[hsl(var(--vermillion))] prose-code:bg-[hsl(var(--muted))] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none"
                                >
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                  >
                                    {block.content}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <div key={`mm-${message.id}-${blockIndex}`} className="space-y-2">
                                  {renderMultimodalItems(
                                    enrichMultimodalItems(block.items, message.multimodal),
                                    `${message.id}-inline-${blockIndex}`
                                  )}
                                </div>
                              )
                            ))}
                          </div>
                        )
                      })()
                    ) : (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                    )
                  )}

                  {/* 多模态内容展示 (fallback when inline blocks don't have renderable content) */}
                  {!hasRenderableInlineMultimodal(message.content, message.multimodal) &&
                    message.multimodal &&
                    message.multimodal.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <ImageIcon className="w-3 h-3 text-[hsl(var(--jade))]" />
                          <span>相关多模态内容：</span>
                        </div>
                        {renderMultimodalItems(message.multimodal, `${message.id}-fallback`)}
                      </div>
                    )}

                  {message.role === 'assistant' && (message.retrievalLoading || message.retrievalData || message.retrievalError) && (
                    <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">检索结果</Badge>
                          {message.retrievalData && (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>实体 {message.retrievalData.data.entities.length}</span>
                              <span>关系 {message.retrievalData.data.relationships.length}</span>
                              <span>片段 {message.retrievalData.data.chunks.length}</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setRetrievalOpen(prev => ({
                              ...prev,
                              [message.id]: !prev[message.id]
                            }))
                          }
                        >
                          {retrievalOpen[message.id] ? '收起' : '展开'}
                        </button>
                      </div>

                      {retrievalOpen[message.id] && (
                        <div className="mt-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
                          {message.retrievalLoading && (
                            <div
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                              role="status"
                              aria-label="正在获取检索结果"
                            >
                              <Spinner className="w-4 h-4" />
                              <span>正在获取检索结果...</span>
                            </div>
                          )}

                          {message.retrievalError && !message.retrievalLoading && (
                            <div className="text-xs text-red-500">
                              {message.retrievalError}
                            </div>
                          )}

                          {message.retrievalData && !message.retrievalLoading && (
                            <Tabs defaultValue="entities" className="w-full">
                              <TabsList className="w-full justify-start bg-transparent p-0">
                                <TabsTrigger value="entities" className="text-xs">
                                  实体
                                </TabsTrigger>
                                <TabsTrigger value="relations" className="text-xs">
                                  关系
                                </TabsTrigger>
                                <TabsTrigger value="chunks" className="text-xs">
                                  片段
                                </TabsTrigger>
                              </TabsList>

                              <TabsContent value="entities" className="mt-3">
                                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                                  {message.retrievalData.data.entities.map((item, index) => (
                                    <div key={`ent-${index}`} className="rounded-lg border border-[hsl(var(--border))] bg-white/70 p-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-foreground">{item.entity_name}</span>
                                        <Badge className="text-[10px]" variant="secondary">
                                          {item.entity_type}
                                        </Badge>
                                      </div>
                                      {item.description && (
                                        <p className="mt-1 max-h-16 overflow-hidden text-xs text-muted-foreground">
                                          {item.description}
                                        </p>
                                      )}
                                      {item.file_path && (
                                        <p className="mt-1 text-[10px] text-muted-foreground truncate">
                                          {item.file_path}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>

                              <TabsContent value="relations" className="mt-3">
                                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                                  {message.retrievalData.data.relationships.map((item, index) => (
                                    <div key={`rel-${index}`} className="rounded-lg border border-[hsl(var(--border))] bg-white/70 p-2">
                                      <div className="text-xs font-semibold text-foreground">
                                        {item.src_id} → {item.tgt_id}
                                      </div>
                                      {item.description && (
                                        <p className="mt-1 max-h-16 overflow-hidden text-xs text-muted-foreground">
                                          {item.description}
                                        </p>
                                      )}
                                      {item.file_path && (
                                        <p className="mt-1 text-[10px] text-muted-foreground truncate">
                                          {item.file_path}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>

                              <TabsContent value="chunks" className="mt-3">
                                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                                  {message.retrievalData.data.chunks.map((item, index) => (
                                    <div key={`chk-${index}`} className="rounded-lg border border-[hsl(var(--border))] bg-white/70 p-2">
                                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span className="font-medium text-foreground">[{item.reference_id || '-'}]</span>
                                        {item.is_multimodal && (
                                          <Badge className="text-[10px]" variant="secondary">
                                            {item.modal_type || 'multimodal'}
                                          </Badge>
                                        )}
                                        {item.chunk_id && (
                                          <span className="truncate">{item.chunk_id}</span>
                                        )}
                                      </div>
                                      {item.content && (
                                        <p className="mt-1 max-h-20 overflow-hidden text-xs text-muted-foreground">
                                          {item.content}
                                        </p>
                                      )}
                                      {item.file_path && (
                                        <p className="mt-1 text-[10px] text-muted-foreground truncate">
                                          {item.file_path}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>
                            </Tabs>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* 时间戳 */}
                <span className="text-xs text-muted-foreground mt-1.5 px-1">
                  {message.timestamp.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* 加载指示器 - 只在等待响应且没有流式内容时显示 */}
        {loading && messages.length > 0 && !messages[messages.length - 1].content && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(var(--jade))] to-[hsl(var(--jade-dark))] text-white flex items-center justify-center shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[hsl(var(--muted))] rounded-2xl rounded-tl-md px-4 py-3 border border-[hsl(var(--border))]">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-[hsl(var(--vermillion))] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[hsl(var(--gold))] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[hsl(var(--jade))] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 输入区域 - 固定在底部 */}
      <div className="flex-shrink-0 border-t border-[hsl(var(--border))] p-4 bg-[hsl(var(--background))]">
        {/* 输入框 - 上侧对齐 */}
        <div className="flex gap-3 items-start">
          {/* 查询模式选择 */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0 w-11 h-11 rounded-xl"
                  title="查询模式"
                >
                  <Settings2 className="w-5 h-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                side="top" 
                align="start" 
                className="w-72 p-3 bg-white dark:bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl rounded-xl"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="text-sm font-semibold text-foreground mb-3">选择查询模式</div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setQueryMode('mix')}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all text-left group",
                      queryMode === 'mix' 
                        ? 'bg-[hsl(var(--vermillion))] text-white shadow-md' 
                        : 'hover:bg-accent'
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      queryMode === 'mix' ? 'bg-white' : 'bg-[hsl(var(--vermillion))]'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">混合模式</span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium",
                          queryMode === 'mix' 
                            ? 'bg-white/20 text-white' 
                            : 'bg-[hsl(var(--vermillion)/0.1)] text-[hsl(var(--vermillion))]'
                        )}>推荐</span>
                      </div>
                      <span className={cn(
                        "text-xs",
                        queryMode === 'mix' ? 'text-white/80' : 'text-muted-foreground'
                      )}>知识图谱 + 向量检索</span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setQueryMode('hybrid')}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all text-left",
                      queryMode === 'hybrid' 
                        ? 'bg-[hsl(var(--vermillion))] text-white shadow-md' 
                        : 'hover:bg-accent'
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      queryMode === 'hybrid' ? 'bg-white' : 'bg-muted-foreground/30'
                    )} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block">融合模式</span>
                      <span className={cn(
                        "text-xs",
                        queryMode === 'hybrid' ? 'text-white/80' : 'text-muted-foreground'
                      )}>本地 + 全局图谱</span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setQueryMode('local')}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all text-left",
                      queryMode === 'local' 
                        ? 'bg-[hsl(var(--vermillion))] text-white shadow-md' 
                        : 'hover:bg-accent'
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      queryMode === 'local' ? 'bg-white' : 'bg-muted-foreground/30'
                    )} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block">本地模式</span>
                      <span className={cn(
                        "text-xs",
                        queryMode === 'local' ? 'text-white/80' : 'text-muted-foreground'
                      )}>实体及直接关系</span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setQueryMode('global')}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all text-left",
                      queryMode === 'global' 
                        ? 'bg-[hsl(var(--vermillion))] text-white shadow-md' 
                        : 'hover:bg-accent'
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      queryMode === 'global' ? 'bg-white' : 'bg-muted-foreground/30'
                    )} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block">全局模式</span>
                      <span className={cn(
                        "text-xs",
                        queryMode === 'global' ? 'text-white/80' : 'text-muted-foreground'
                      )}>全局关系模式</span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setQueryMode('naive')}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all text-left",
                      queryMode === 'naive' 
                        ? 'bg-[hsl(var(--vermillion))] text-white shadow-md' 
                        : 'hover:bg-accent'
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      queryMode === 'naive' ? 'bg-white' : 'bg-muted-foreground/30'
                    )} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block">简单模式</span>
                      <span className={cn(
                        "text-xs",
                        queryMode === 'naive' ? 'text-white/80' : 'text-muted-foreground'
                      )}>仅向量搜索</span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setQueryMode('bypass')}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all text-left",
                      queryMode === 'bypass' 
                        ? 'bg-[hsl(var(--vermillion))] text-white shadow-md' 
                        : 'hover:bg-accent'
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      queryMode === 'bypass' ? 'bg-white' : 'bg-muted-foreground/30'
                    )} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block">直接对话</span>
                      <span className={cn(
                        "text-xs",
                        queryMode === 'bypass' ? 'text-white/80' : 'text-muted-foreground'
                      )}>跳过知识检索</span>
                    </div>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <span className="hidden md:inline-flex items-center px-2.5 py-1 text-xs rounded-lg bg-muted text-muted-foreground border border-[hsl(var(--border))]">
              模式: {queryMode === 'mix' ? '混合' : queryMode === 'hybrid' ? '融合' : queryMode === 'local' ? '本地' : queryMode === 'global' ? '全局' : queryMode === 'naive' ? '简单' : '直接'}
            </span>
          </div>
          
          <div className="flex-1">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题... (支持 Shift+Enter 换行)"
              className="w-full px-4 py-2.5 border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--vermillion)/0.3)] focus:border-[hsl(var(--vermillion))] resize-none bg-white dark:bg-[hsl(var(--card))] text-sm"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          
          <button
            onClick={handleSend}
            disabled={loading || !inputText.trim()}
            className={cn(
              "flex-shrink-0 h-11 px-5 rounded-xl flex items-center justify-center gap-2 font-medium transition shadow-sm",
              loading || !inputText.trim()
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-gradient-to-r from-[hsl(var(--vermillion))] to-[hsl(var(--vermillion-dark))] text-white hover:shadow-md hover:shadow-[hsl(var(--vermillion)/0.3)]'
            )}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                <span>发送</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>发送</span>
              </>
            )}
          </button>
        </div>

        {/* 提示信息 */}
        <div className="flex items-center text-xs text-muted-foreground mt-2">
          <span>提示：按 Enter 发送，Shift+Enter 换行</span>
        </div>
      </div>
    </div>
  )
}
