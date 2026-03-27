import { cn } from '@/lib/utils'
import { useBackendState } from '@/stores/state'
import { useState } from 'react'
import StatusDialog from './StatusDialog'
import { useTranslation } from 'react-i18next'

const StatusIndicator = () => {
  const { t } = useTranslation()
  const health = useBackendState.use.health()
  const status = useBackendState.use.status()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="fixed right-4 bottom-4 flex items-center gap-2 opacity-90 hover:opacity-100 transition-opacity select-none z-50">
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-1.5 rounded-full glass hover:bg-white/80 dark:hover:bg-black/60 transition-colors"
        onClick={() => setDialogOpen(true)}
      >
        <div className="relative flex h-2.5 w-2.5">
          {health && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          )}
          <span
            className={cn(
              'relative inline-flex rounded-full h-2.5 w-2.5 transition-colors duration-300',
              health ? 'bg-green-500' : 'bg-red-500'
            )}
          />
        </div>
        <span className={cn(
          "text-xs font-medium transition-colors",
          health ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        )}>
          {health ? t('graphPanel.statusIndicator.connected') : t('graphPanel.statusIndicator.disconnected')}
        </span>
      </div>

      <StatusDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        status={status}
      />
    </div>
  )
}

export default StatusIndicator
