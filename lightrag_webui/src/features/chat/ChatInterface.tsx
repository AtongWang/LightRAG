/**
 * 聊天界面组件
 * 支持多模态输入（文本+图片）的智能问答界面
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Image as ImageIcon, X, User, Bot, Sparkles, Settings2 } from 'lucide-react'
import { useProjectStore, useSettingsStore } from '@/stores'
import { cn } from '@/lib/utils'
import { queryTextStream, Message as ApiMessage, QueryMode } from '@/api/lightrag'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ReferenceItem {
  reference_id: string
  file_path: string
  content?: string[]
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]
  timestamp: Date
  references?: ReferenceItem[]
}

export function ChatInterface() {
  const { currentProject } = useProjectStore()
  const { querySettings } = useSettingsStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [queryMode, setQueryMode] = useState<QueryMode>('mix')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 重置欢迎消息当项目改变
  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: `您好！我是${currentProject?.name || '知识库'}的智能助手。我可以帮您：\n\n• 回答关于知识图谱的问题\n• 查询实体和关系信息\n• 分析文档内容\n• 提供知识推理和建议\n\n请随时向我提问！`,
        timestamp: new Date()
      }
    ])
  }, [currentProject?.project_id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setSelectedImages(prev => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  // 构建对话历史（排除系统消息和欢迎消息）
  const buildConversationHistory = useCallback((): ApiMessage[] => {
    return messages
      .filter(msg => msg.role !== 'system' && msg.id !== '1')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
  }, [messages])

  const handleSend = async () => {
    if ((!inputText.trim() && selectedImages.length === 0) || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      images: selectedImages.length > 0 ? selectedImages : undefined,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const queryText = inputText
    setInputText('')
    setSelectedImages([])
    setLoading(true)

    // 创建助手消息占位符
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, assistantMessage])

    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController()

    try {
      const conversationHistory = buildConversationHistory()
      
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
      <div className="flex-1 overflow-y-scroll p-6 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
        {messages.filter(msg => msg.content || msg.images?.length).map(message => (
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
                    message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-2 prose-code:text-[hsl(var(--vermillion))] prose-code:bg-[hsl(var(--muted))] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                    )
                  )}

                  {/* 图片附件 */}
                  {message.images && message.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`上传的图片${index + 1}`}
                          className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {/* 知识来源 */}
                  {message.references && message.references.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Sparkles className="w-3 h-3 text-[hsl(var(--gold))]" />
                        <span>知识来源：</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {message.references.map((ref, index) => (
                          <div key={index} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">[{ref.reference_id}]</span>
                            <span className="ml-2 opacity-80 truncate max-w-[300px] inline-block align-bottom">
                              {ref.file_path}
                            </span>
                          </div>
                        ))}
                      </div>
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

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 - 固定在底部 */}
      <div className="flex-shrink-0 border-t border-[hsl(var(--border))] p-4 bg-[hsl(var(--background))]">
        {/* 图片预览 */}
        {selectedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedImages.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`上传的图片${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-[hsl(var(--border))]"
                />
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 输入框 - 上侧对齐 */}
        <div className="flex gap-3 items-start">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center hover:bg-muted rounded-xl transition border border-[hsl(var(--border))] bg-white dark:bg-[hsl(var(--card))]"
            title="上传图片"
          >
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* 查询模式选择 */}
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
            disabled={loading || (!inputText.trim() && selectedImages.length === 0)}
            className={cn(
              "flex-shrink-0 h-11 px-5 rounded-xl flex items-center justify-center gap-2 font-medium transition shadow-sm",
              loading || (!inputText.trim() && selectedImages.length === 0)
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
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <span>提示：您可以上传图片进行提问，系统会使用视觉模型理解图片内容</span>
          <span className="px-2 py-0.5 rounded bg-muted">
            模式: {queryMode === 'mix' ? '混合' : queryMode === 'hybrid' ? '融合' : queryMode === 'local' ? '本地' : queryMode === 'global' ? '全局' : queryMode === 'naive' ? '简单' : '直接'}
          </span>
        </div>
      </div>
    </div>
  )
}