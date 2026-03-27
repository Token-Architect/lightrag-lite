import Button from '@/components/ui/Button'
import { SiteInfo, webuiPrefix } from '@/lib/constants'
import { TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/state'
import { cn } from '@/lib/utils'
import { navigationService } from '@/services/navigation'
import {
  ZapIcon,
  LogOutIcon,
  Layers3Icon,
  ArrowLeftCircleIcon
} from 'lucide-react'

interface NavigationTabProps {
  value: string
  currentTab: string
  children: React.ReactNode
}

function NavigationTab({ value, currentTab, children }: NavigationTabProps) {
  const isSelected = currentTab === value
  return (
    <TabsTrigger
      value={value}
      className={cn(
        'h-9 cursor-pointer rounded-full px-4 text-sm font-medium transition-all duration-300',
        isSelected
          ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-[0_8px_22px_rgba(37,99,235,0.35)]'
          : 'text-muted-foreground hover:bg-white/70 hover:text-foreground dark:hover:bg-white/8'
      )}
    >
      {children}
    </TabsTrigger>
  )
}

function TabsNavigation() {
  const currentTab = useSettingsStore.use.currentTab()
  const currentWorkspace = useSettingsStore.use.currentWorkspace()

  if (!currentWorkspace) {
    return (
      <div className="ve-panel inline-flex h-11 items-center rounded-full px-4 text-xs text-muted-foreground">
        {'\u8bf7\u5148\u9009\u62e9\u56fe\u8c31\u7a7a\u95f4\uff0c\u518d\u8fdb\u5165\u6587\u6863\u4e0e\u56fe\u8c31\u64cd\u4f5c'}
      </div>
    )
  }

  return (
    <div className="ve-panel h-11 rounded-full px-1 py-1">
      <TabsList className="h-full gap-1 bg-transparent p-0">
        <NavigationTab value="documents" currentTab={currentTab}>{'\u6587\u6863'}</NavigationTab>
        <NavigationTab value="knowledge-graph" currentTab={currentTab}>{'\u77e5\u8bc6\u56fe\u8c31'}</NavigationTab>
        <NavigationTab value="data-analysis" currentTab={currentTab}>{'\u6570\u636e\u5206\u6790'}</NavigationTab>
        <NavigationTab value="mind-map" currentTab={currentTab}>{'\u601d\u7ef4\u5bfc\u56fe'}</NavigationTab>
        <NavigationTab value="retrieval" currentTab={currentTab}>{'\u68c0\u7d22'}</NavigationTab>
        <NavigationTab value="api" currentTab={currentTab}>API</NavigationTab>
        <NavigationTab value="platform" currentTab={currentTab}>{'\u5e73\u53f0\u914d\u7f6e'}</NavigationTab>
      </TabsList>
    </div>
  )
}

export default function SiteHeader() {
  const { isGuestMode } = useAuthStore()
  const currentWorkspace = useSettingsStore.use.currentWorkspace()
  const setCurrentWorkspace = useSettingsStore.use.setCurrentWorkspace()

  const handleLogout = () => {
    navigationService.navigateToLogin()
  }

  return (
    <header className="px-4 pb-3 pt-4 md:px-6">
      <div className="ve-shell flex h-16 items-center rounded-2xl border px-4 md:px-5">
        <div className="min-w-[190px] shrink-0">
          <a href={webuiPrefix} className="group inline-flex items-center gap-2.5">
            <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-blue-100 to-cyan-50 p-1.5 dark:from-blue-900/45 dark:to-cyan-900/25">
              <ZapIcon className="size-5 text-primary" aria-hidden="true" />
            </div>
            <span className="ve-gradient-text text-lg font-bold tracking-tight">{SiteInfo.name}</span>
          </a>
        </div>

        <div className="mx-4 hidden min-w-0 flex-1 items-center justify-center xl:flex">
          <TabsNavigation />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {currentWorkspace && (
            <div className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary md:inline-flex">
              <Layers3Icon className="size-3.5" />
              <span className="max-w-44 truncate">{currentWorkspace}</span>
            </div>
          )}

          {!currentWorkspace ? (
            <div className="hidden text-xs text-muted-foreground lg:inline-flex">{'\u56fe\u8c31\u7a7a\u95f4\u6a21\u5f0f'}</div>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setCurrentWorkspace(null)}
              className="hidden h-9 rounded-full border border-border/70 px-3 text-xs md:inline-flex"
              title={'\u8fd4\u56de\u56fe\u8c31\u7a7a\u95f4\u5217\u8868'}
            >
              <ArrowLeftCircleIcon className="mr-1.5 size-4" />
              {'\u56fe\u8c31\u7a7a\u95f4'}
            </Button>
          )}

          {!isGuestMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-9 w-9 rounded-full border border-border/70 bg-background/70 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title={'\u9000\u51fa\u767b\u5f55'}
            >
              <LogOutIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="mt-2 xl:hidden">
        <TabsNavigation />
      </div>
    </header>
  )
}
