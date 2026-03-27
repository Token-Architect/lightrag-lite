import React from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useGraphStore } from '@/stores/graph'
import { Card } from '@/components/ui/Card'
import { ScrollArea } from '@/components/ui/ScrollArea'

interface LegendProps {
  className?: string
}

const Legend: React.FC<LegendProps> = ({ className }) => {
  const { t } = useTranslation()
  const typeColorMap = useGraphStore.use.typeColorMap()
  const rawGraph = useGraphStore.use.rawGraph()

  if (!typeColorMap || typeColorMap.size === 0) {
    return null
  }

  const legendRows = useMemo(() => {
    const entries = Array.from(typeColorMap.entries()).map(([type, color]) => ({
      type,
      color,
      count: 0
    }))

    if (rawGraph?.nodes?.length) {
      const indexByType = new Map(entries.map((item, idx) => [item.type, idx]))

      for (const node of rawGraph.nodes) {
        const preferredType = String(node.properties?.entity_type || '').toLowerCase().trim()
        let matchedIndex = preferredType ? indexByType.get(preferredType) : undefined

        if (matchedIndex === undefined) {
          matchedIndex = entries.findIndex((item) => item.color === node.color)
        }
        if (matchedIndex !== undefined && matchedIndex >= 0) {
          entries[matchedIndex].count += 1
        }
      }
    }

    return entries.sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
  }, [typeColorMap, rawGraph])

  return (
    <Card className={`p-3 max-w-xs ${className}`}>
      <h3 className="mb-2 text-sm font-semibold tracking-wide">{t('graphPanel.legend')}</h3>
      <ScrollArea className="max-h-80">
        <div className="flex flex-col gap-1.5">
          {legendRows.map(({ type, color, count }) => (
            <div
              key={type}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-card/70 px-2 py-1.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.6)]"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate text-xs" title={type}>
                  {t(`graphPanel.nodeTypes.${type.toLowerCase().replace(/\s+/g, '')}`, type)}
                </span>
              </div>
              <div
                className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                title={t('graphPanel.legend')}
              >
                {count}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}

export default Legend
