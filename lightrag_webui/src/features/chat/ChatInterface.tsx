/**
 * 聊天界面组件
 * 支持多模态输入（文本+图片）的智能问答界面
 */

import { useState, useRef, useEffect } from 'react'
import { Send, Image as ImageIcon, X, User, Bot, Sparkles } from 'lucide-react'
import { useProjectStore } from '@/stores'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]
  timestamp: Date
  sources?: {
    entity_id: string
    entity_name: string
    relevance_score: number
  }[]
}

export function ChatInterface() {
  const { currentProject } = useProjectStore()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `您好！我是${currentProject?.name || '知识库'}的智能助手。我可以帮您：\n\n• 回答关于知识图谱的问题\n• 查询实体和关系信息\n• 分析文档内容\n• 提供知识推理和建议\n\n请随时向我提问！`,
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    setInputText('')
    setSelectedImages([])
    setLoading(true)

    try {
      // 模拟AI响应
      await new Promise(resolve => setTimeout(resolve, 1500))

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '这是一个模拟的响应。在实际系统中，我会根据您的查询内容，从知识图谱中检索相关信息并生成回答。',
        timestamp: new Date(),
        sources: [
          { entity_id: '1', entity_name: '示例实体1', relevance_score: 0.95 },
          { entity_id: '2', entity_name: '示例实体2', relevance_score: 0.87 }
        ]
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: '抱歉，发生了错误。请稍后重试。',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
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
        {messages.map(message => (
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
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
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
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Sparkles className="w-3 h-3 text-[hsl(var(--gold))]" />
                        <span>知识来源：</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {message.sources.map((source, index) => (
                          <div key={index} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{source.entity_name}</span>
                            <span className="ml-2 opacity-60">
                              (相关度: {Math.round(source.relevance_score * 100)}%)
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

        {/* 加载指示器 */}
        {loading && (
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
        <div className="text-xs text-muted-foreground mt-2">
          提示：您可以上传图片进行提问，系统会使用视觉模型理解图片内容
        </div>
      </div>
    </div>
  )
}
