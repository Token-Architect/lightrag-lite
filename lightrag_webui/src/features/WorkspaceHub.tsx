import { useMemo, useState } from 'react'
import {
  FolderOpen,
  Plus,
  ArrowRight,
  Trash2,
  Sparkles,
  Layers3,
  Database,
  ShieldCheck
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useSettingsStore } from '@/stores/settings'

export default function WorkspaceHub() {
  const workspaces = useSettingsStore.use.workspaces()
  const setCurrentWorkspace = useSettingsStore.use.setCurrentWorkspace()
  const addWorkspace = useSettingsStore.use.addWorkspace()
  const removeWorkspace = useSettingsStore.use.removeWorkspace()
  const setCurrentTab = useSettingsStore.use.setCurrentTab()

  const [newWorkspace, setNewWorkspace] = useState('')
  const canCreate = useMemo(() => newWorkspace.trim().length > 0, [newWorkspace])

  const handleCreate = () => {
    const value = newWorkspace.trim()
    if (!value) return
    addWorkspace(value)
    setCurrentTab('documents')
    setNewWorkspace('')
  }

  const handleEnter = (workspace: string) => {
    setCurrentWorkspace(workspace)
    setCurrentTab('documents')
  }

  return (
    <div className="ve-grid-bg h-full overflow-auto pb-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 pt-5 md:px-8 md:pt-6">
        <section className="ve-shell relative overflow-hidden rounded-3xl border p-7 md:p-9">
          <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-5">
              <p className="ve-pill">
                <Sparkles className="mr-1.5 size-3.5" />
                图谱空间中心
              </p>
              <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
                构建你的专属知识空间，
                <span className="ve-gradient-text"> 一次聚焦一个图谱工作区。</span>
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                图谱空间会隔离文档、图谱索引、检索上下文与运行状态。你可以按产品线、团队或客户拆分，避免数据互相污染。
              </p>
              <div className="grid max-w-xl gap-3 sm:grid-cols-3">
                <div className="ve-stat-card">
                  <p className="text-xs text-muted-foreground">活跃图谱空间</p>
                  <p className="mt-1 text-2xl font-extrabold">{workspaces.length}</p>
                </div>
                <div className="ve-stat-card">
                  <p className="text-xs text-muted-foreground">隔离级别</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-lg font-bold">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    强隔离
                  </p>
                </div>
                <div className="ve-stat-card">
                  <p className="text-xs text-muted-foreground">后端模式</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-lg font-bold">
                    <Database className="size-4 text-blue-600" />
                    多空间
                  </p>
                </div>
              </div>
            </div>

            <Card className="ve-panel border-white/70">
              <CardHeader>
                <CardTitle>创建新图谱空间</CardTitle>
                <CardDescription>建议使用简短名称，例如：`finance-risk`、`doubao-demo`。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={newWorkspace}
                  onChange={(e) => setNewWorkspace(e.target.value)}
                  placeholder="输入图谱空间名称"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canCreate) handleCreate()
                  }}
                />
                <Button onClick={handleCreate} disabled={!canCreate} className="w-full">
                  <Plus className="mr-2 size-4" />
                  创建并进入
                </Button>
                <p className="text-xs text-muted-foreground">
                  提示：中文等非 ASCII 名称已做请求头安全编码，可直接使用。
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
              <Layers3 className="size-5 text-primary" />
              图谱空间目录
            </h2>
            <span className="text-xs text-muted-foreground">选择一个空间，进入文档与图谱控制台</span>
          </div>

          {workspaces.length === 0 ? (
            <Card className="ve-panel border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <FolderOpen className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">还没有图谱空间，请先在上方创建第一个空间。</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {workspaces.map((workspace) => (
                <Card
                  key={workspace}
                  className="ve-panel group border-border/75 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35"
                >
                  <CardContent className="flex items-center justify-between gap-3 py-5">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{workspace}</p>
                      <p className="text-xs text-muted-foreground">独立数据与图谱操作环境</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeWorkspace(workspace)}
                        title="仅删除本地入口"
                      >
                        <Trash2 className="size-4 text-muted-foreground group-hover:text-destructive" />
                      </Button>
                      <Button
                        size="icon"
                        onClick={() => handleEnter(workspace)}
                        title="进入空间"
                        className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white"
                      >
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
