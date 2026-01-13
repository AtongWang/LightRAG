/**
 * 主布局组件
 * 包含顶部导航栏和主内容区域
 */

import { Outlet } from 'react-router-dom'
import TopNavigation from './TopNavigation'
import { useAuthStore } from '@/stores/state'
import { useSettingsStore } from '@/stores/settings'
import StatusIndicator from '@/components/status/StatusIndicator'
import ApiKeyAlert from '@/components/ApiKeyAlert'
import { useBackendState } from '@/stores/state'
import { useCallback, useEffect, useState } from 'react'
import { InvalidApiKeyError, RequireApiKeError } from '@/api/lightrag'

export default function MainLayout() {
  const message = useBackendState.use.message()
  const enableHealthCheck = useSettingsStore.use.enableHealthCheck()
  const [apiKeyAlertOpen, setApiKeyAlertOpen] = useState(false)
  const { isGuestMode, coreVersion, apiVersion, username } = useAuthStore()

  const handleApiKeyAlertOpenChange = useCallback((open: boolean) => {
    setApiKeyAlertOpen(open)
    if (!open) {
      useBackendState.getState().clear()
    }
  }, [])

  useEffect(() => {
    if (message) {
      if (message.includes(InvalidApiKeyError) || message.includes(RequireApiKeError)) {
        setApiKeyAlertOpen(true)
      }
    }
  }, [message])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <TopNavigation
        isGuestMode={isGuestMode}
        coreVersion={coreVersion}
        apiVersion={apiVersion}
        username={username}
      />

      {/* 主内容区域 - 使用 flex-1 + min-h-0 + overflow-hidden 让子组件控制滚动 */}
      <main className="flex-1 min-h-0 w-full overflow-hidden">
        <Outlet />
      </main>

      {/* 状态指示器 */}
      {enableHealthCheck && <StatusIndicator />}

      {/* API Key 警告对话框 */}
      <ApiKeyAlert open={apiKeyAlertOpen} onOpenChange={handleApiKeyAlertOpenChange} />
    </div>
  )
}
