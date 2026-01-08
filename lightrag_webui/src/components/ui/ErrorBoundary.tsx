/**
 * 错误边界组件
 * 捕获并显示组件树中的错误
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg border border-red-200 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-full flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  出现了错误
                </h2>
                <p className="text-gray-600 mb-4">
                  抱歉，应用程序遇到了一个意外错误。您可以尝试刷新页面或联系技术支持。
                </p>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                      错误详情
                    </summary>
                    <div className="bg-gray-50 rounded p-3 text-sm font-mono text-red-600 overflow-x-auto">
                      <div className="font-bold mb-2">{this.state.error.toString()}</div>
                      {this.state.errorInfo && (
                        <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                      )}
                    </div>
                  </details>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={this.handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重试
                  </button>
                  <button
                    onClick={this.handleReload}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition"
                  >
                    刷新页面
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
