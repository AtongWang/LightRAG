import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

export function ChatMarkdown({ children }: { children: string }) {
  return <div className="min-w-0 max-w-full text-sm leading-relaxed break-words [&_p]:my-2 [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold [&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:mt-3 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-background [&_pre]:p-3 [&_code]:font-mono [&_a]:underline [&_a]:text-primary [&_table]:w-full [&_th]:border [&_th]:p-2 [&_td]:border [&_td]:p-2 [&_.katex-display]:overflow-x-auto">
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
      components={{
        table: ({ children }) => <div className="my-3 max-w-full overflow-x-auto"><table>{children}</table></div>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
      }}>
      {children}
    </ReactMarkdown>
  </div>
}
