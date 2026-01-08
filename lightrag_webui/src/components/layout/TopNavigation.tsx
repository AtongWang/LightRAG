/**
 * 顶部导航栏组件
 * 中国风文化基因库品牌设计
 */

import { SiteInfo, webuiPrefix } from '@/lib/constants'
import AppSettings from '@/components/AppSettings'
import { useAuthStore } from '@/stores/state'
import { useTranslation } from 'react-i18next'
import { navigationService } from '@/services/navigation'
import { GithubIcon, LogOutIcon, Scroll, Sparkles } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

interface TopNavigationProps {
  isGuestMode?: boolean
  coreVersion?: string | null
  apiVersion?: string | null
  username?: string | null
  webuiTitle?: string | null
  webuiDescription?: string | null
}

export default function TopNavigation({
  isGuestMode = false,
  coreVersion,
  apiVersion,
  username,
  webuiTitle,
  webuiDescription
}: TopNavigationProps) {
  const { t } = useTranslation()

  const versionDisplay = (coreVersion && apiVersion)
    ? `${coreVersion}/${apiVersion}`
    : null

  const hasWarning = apiVersion?.endsWith('⚠️')
  const versionTooltip = hasWarning
    ? t('header.frontendNeedsRebuild')
    : versionDisplay ? `v${versionDisplay}` : ''

  const handleLogout = () => {
    navigationService.navigateToLogin()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border))] bg-gradient-to-r from-[hsl(var(--card))] via-[hsl(var(--background))] to-[hsl(var(--card))] backdrop-blur-sm">
      <div className="flex h-14 items-center px-6">
        {/* 左侧：Logo 和品牌 */}
        <div className="min-w-[280px] flex items-center">
          <Link to="/" className="flex items-center gap-3 group">
            {/* 中国风图标 */}
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[hsl(var(--vermillion))] to-[hsl(var(--vermillion-dark))] flex items-center justify-center shadow-lg shadow-[hsl(var(--vermillion)/0.3)] group-hover:shadow-[hsl(var(--vermillion)/0.5)] transition-shadow">
                <Scroll className="w-5 h-5 text-white" />
              </div>
              {/* 装饰角 */}
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 border-t-2 border-r-2 border-[hsl(var(--gold))]" />
              <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 border-b-2 border-l-2 border-[hsl(var(--gold))]" />
            </div>
            
            {/* 品牌名称 */}
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-wide bg-gradient-to-r from-[hsl(var(--vermillion))] to-[hsl(var(--vermillion-dark))] bg-clip-text text-transparent">
                文化基因库
              </span>
              <span className="text-[10px] text-muted-foreground tracking-widest">
                CULTURAL GENOME
              </span>
            </div>
          </Link>
          
          {/* 项目标题 */}
          {webuiTitle && (
            <div className="flex items-center ml-4">
              <div className="w-px h-6 bg-gradient-to-b from-transparent via-[hsl(var(--border))] to-transparent mx-3" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-medium text-sm text-foreground/80 hover:text-foreground cursor-default transition-colors">
                      {webuiTitle}
                    </span>
                  </TooltipTrigger>
                  {webuiDescription && (
                    <TooltipContent side="bottom">
                      {webuiDescription}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* 中间：装饰元素 */}
        <div className="flex-1 flex items-center justify-center">
          {isGuestMode ? (
            <div className="px-4 py-1.5 text-xs font-medium bg-gradient-to-r from-[hsl(var(--gold)/0.2)] to-[hsl(var(--gold)/0.1)] text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold-light))] rounded-full border border-[hsl(var(--gold)/0.3)]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                {t('login.guestMode', '访客模式')}
              </span>
            </div>
          ) : (
            /* 中间装饰线 */
            <div className="hidden lg:flex items-center gap-2 opacity-30">
              <div className="w-20 h-px bg-gradient-to-r from-transparent to-[hsl(var(--vermillion))]" />
              <div className="w-1.5 h-1.5 rotate-45 bg-[hsl(var(--vermillion))]" />
              <div className="w-20 h-px bg-gradient-to-l from-transparent to-[hsl(var(--vermillion))]" />
            </div>
          )}
        </div>

        {/* 右侧：操作按钮 */}
        <nav className="min-w-[200px] flex items-center justify-end gap-1">
          {versionDisplay && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-md mr-2 cursor-default",
                    hasWarning 
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" 
                      : "bg-muted/50 text-muted-foreground"
                  )}>
                    v{versionDisplay}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {versionTooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            side="bottom" 
            tooltip={t('header.projectRepository')}
            className="hover:bg-[hsl(var(--vermillion)/0.1)] hover:text-[hsl(var(--vermillion))]"
          >
            <a href={SiteInfo.github} target="_blank" rel="noopener noreferrer">
              <GithubIcon className="w-4 h-4" aria-hidden="true" />
            </a>
          </Button>
          
          <AppSettings />
          
          {!isGuestMode && username && (
            <>
              <div className="w-px h-5 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                side="bottom"
                tooltip={`${t('header.logout')} (${username})`}
                onClick={handleLogout}
                className="hover:bg-[hsl(var(--vermillion)/0.1)] hover:text-[hsl(var(--vermillion))]"
              >
                <LogOutIcon className="w-4 h-4" aria-hidden="true" />
              </Button>
            </>
          )}
        </nav>
      </div>
      
      {/* 底部装饰线 */}
      <div className="h-0.5 bg-gradient-to-r from-[hsl(var(--vermillion)/0.5)] via-[hsl(var(--gold)/0.5)] to-[hsl(var(--jade)/0.5)]" />
    </header>
  )
}
