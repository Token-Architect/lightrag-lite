import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, { Background, Controls, MiniMap, Node, Edge, ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { generateMindMapMarkdown } from '@/api/lightrag'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

type ParsedItem = {
  id: string
  level: number
  text: string
}

const MINDMAP_DIRTY_KEY = 'LIGHTRAG_MINDMAP_DIRTY_AT'
const CORPUS_UPDATED_EVENT = 'lightrag:corpus-updated'

const stripMdSyntax = (s: string): string =>
  s
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/^#+\s+/, '')
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/_/g, '')
    .trim()

const parseMarkdownToTree = (
  markdown: string
): { nodes: ParsedItem[]; edges: Array<{ from: string; to: string }> } => {
  const lines = markdown
    .split('\n')
    .map((l) => l.replace(/\t/g, '  '))
    .filter((l) => l.trim().length > 0)
    .filter((l) => !l.trim().startsWith('```'))

  const items: ParsedItem[] = []
  const edges: Array<{ from: string; to: string }> = []
  const stack: Array<{ id: string; level: number }> = []

  let idx = 0
  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, '')
    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    const bullet = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/)

    let level: number | null = null
    let text = ''

    if (heading) {
      level = heading[1].length
      text = stripMdSyntax(heading[2])
    } else if (bullet) {
      const indent = Math.floor((bullet[1] || '').length / 2)
      level = indent + 2
      text = stripMdSyntax(bullet[3])
    }

    if (level === null || !text) continue

    const id = `md-node-${idx++}`
    items.push({ id, level, text })

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }
    if (stack.length > 0) {
      edges.push({ from: stack[stack.length - 1].id, to: id })
    }
    stack.push({ id, level })
  }

  if (items.length <= 1) return { nodes: items, edges }

  const topNodes = items.filter((n) => n.level === Math.min(...items.map((i) => i.level)))
  if (topNodes.length > 1) {
    const root = topNodes[0]
    for (const n of topNodes.slice(1)) {
      if (!edges.some((e) => e.to === n.id)) edges.push({ from: root.id, to: n.id })
    }
  }

  return { nodes: items, edges }
}

const layoutTree = (
  nodes: ParsedItem[],
  edges: Array<{ from: string; to: string }>
): { nodes: Node[]; edges: Edge[] } => {
  if (!nodes.length) return { nodes: [], edges: [] }

  const children: Record<string, string[]> = {}
  for (const n of nodes) children[n.id] = []
  for (const e of edges) {
    if (!children[e.from]) children[e.from] = []
    children[e.from].push(e.to)
  }

  const indegree: Record<string, number> = {}
  for (const n of nodes) indegree[n.id] = 0
  for (const e of edges) indegree[e.to] = (indegree[e.to] || 0) + 1
  const root = nodes.find((n) => indegree[n.id] === 0)?.id || nodes[0].id

  const depth: Record<string, number> = { [root]: 0 }
  const queue = [root]
  while (queue.length) {
    const cur = queue.shift()!
    for (const ch of children[cur] || []) {
      if (depth[ch] == null) {
        depth[ch] = depth[cur] + 1
        queue.push(ch)
      }
    }
  }

  const byDepth: Record<number, string[]> = {}
  for (const n of nodes) {
    const d = depth[n.id] ?? 0
    if (!byDepth[d]) byDepth[d] = []
    byDepth[d].push(n.id)
  }

  const levelGapX = 300
  const rowGapY = 120
  const flowNodes: Node[] = []
  const nodeMap: Record<string, ParsedItem> = {}
  nodes.forEach((n) => (nodeMap[n.id] = n))

  Object.keys(byDepth)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((d) => {
      const ids = byDepth[d]
      ids.forEach((id, i) => {
        const item = nodeMap[id]
        const yOffset = -((ids.length - 1) * rowGapY) / 2
        flowNodes.push({
          id,
          position: { x: d * levelGapX, y: yOffset + i * rowGapY },
          data: { label: item.text, level: item.level },
          style: {
            borderRadius: 14,
            border: d === 0 ? '2px solid #2563EB' : '1px solid #CBD5E1',
            background: d === 0 ? 'linear-gradient(135deg,#DBEAFE,#EFF6FF)' : '#FFFFFF',
            color: '#0F172A',
            width: d === 0 ? 280 : 230,
            minHeight: 54,
            padding: '10px 12px',
            fontSize: d === 0 ? 16 : 13,
            fontWeight: d === 0 ? 700 : 500
          }
        })
      })
    })

  const flowEdges: Edge[] = edges.map((e, idx) => ({
    id: `mind-edge-${idx}`,
    source: e.from,
    target: e.to,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#94A3B8', strokeWidth: 1.3 }
  }))

  return { nodes: flowNodes, edges: flowEdges }
}

function MindMapContent() {
  const [loading, setLoading] = useState(false)
  const [markdown, setMarkdown] = useState('')
  const [instruction, setInstruction] = useState(
    '请突出主线剧情、关键人物与因果关系，尽量中文术语标准化。'
  )

  const parsed = useMemo(() => parseMarkdownToTree(markdown), [markdown])
  const flow = useMemo(() => layoutTree(parsed.nodes, parsed.edges), [parsed])
  const generatingRef = useRef(false)
  const lastHandledDirtyAtRef = useRef<string | null>(null)

  const handleGenerate = useCallback(
    async (silent = false) => {
      if (generatingRef.current) return

      generatingRef.current = true
      setLoading(true)
      try {
        const res = await generateMindMapMarkdown({
          max_docs: 20,
          max_chars: 120000,
          instruction
        })
        const noCorpus =
          typeof res.message === 'string' &&
          res.message.toLowerCase().includes('no corpus available')
        if (res.status !== 'success') {
          if (!(silent && noCorpus)) {
            toast.error(res.message || '生成失败')
          }
          return
        }
        setMarkdown(res.markdown || '')
        localStorage.removeItem(MINDMAP_DIRTY_KEY)

        if (!silent) {
          toast.success(`已生成（使用文档 ${res.docs_used} 篇${res.truncated ? '，已截断' : ''}）`)
        }
      } catch (e: any) {
        toast.error(`生成失败: ${e?.message || e}`)
      } finally {
        setLoading(false)
        generatingRef.current = false
      }
    },
    [instruction]
  )

  const triggerGenerateFromDirty = useCallback(
    (dirtyAt?: string | null) => {
      const currentDirtyAt = dirtyAt || localStorage.getItem(MINDMAP_DIRTY_KEY)
      if (!currentDirtyAt) return
      if (lastHandledDirtyAtRef.current === currentDirtyAt) return

      lastHandledDirtyAtRef.current = currentDirtyAt
      void handleGenerate(true)
    },
    [handleGenerate]
  )

  useEffect(() => {
    const onCorpusUpdated = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ dirtyAt?: string }>
      triggerGenerateFromDirty(customEvt.detail?.dirtyAt ?? null)
    }

    window.addEventListener(CORPUS_UPDATED_EVENT, onCorpusUpdated)
    return () => window.removeEventListener(CORPUS_UPDATED_EVENT, onCorpusUpdated)
  }, [triggerGenerateFromDirty])

  useEffect(() => {
    triggerGenerateFromDirty()
  }, [triggerGenerateFromDirty])

  return (
    <div className="h-full px-4 py-4">
      <div className="grid h-full grid-cols-12 gap-4">
        <Card className="col-span-12 h-full lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Markdown 思维导图生成</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[calc(100%-64px)] flex-col gap-3">
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="min-h-[90px]"
              placeholder="可选：补充生成要求"
            />
            <div className="flex gap-2">
              <Button onClick={() => void handleGenerate(false)} disabled={loading}>
                <RefreshCw className="mr-1.5 size-4" />
                {loading ? '刷新中...' : '刷新导图'}
              </Button>
              <Button variant="ghost" onClick={() => setMarkdown('')} disabled={loading}>
                <RefreshCw className="mr-1.5 size-4" />
                清空
              </Button>
            </div>
            <Textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="min-h-[280px] flex-1 font-mono text-xs"
              placeholder={'这里会显示模型生成的 Markdown，大纲可直接编辑。\n例如：\n# 主题\n- 分支A\n  - 子分支'}
            />
          </CardContent>
        </Card>

        <Card className="col-span-12 h-full lg:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              思维导图渲染
              <span className="ml-2 text-xs text-muted-foreground">
                节点 {flow.nodes.length} · 连线 {flow.edges.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-64px)] p-0">
            {flow.nodes.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                先点击“刷新导图”，或直接在左侧 Markdown 输入大纲
              </div>
            ) : (
              <ReactFlow nodes={flow.nodes} edges={flow.edges} fitView proOptions={{ hideAttribution: true }}>
                <MiniMap />
                <Controls />
                <Background color="#CBD5E1" gap={20} />
              </ReactFlow>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function MindMapViewer() {
  return (
    <ReactFlowProvider>
      <MindMapContent />
    </ReactFlowProvider>
  )
}

