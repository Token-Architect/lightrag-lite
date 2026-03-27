import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  activateModelConfig,
  checkHealth,
  createModelConfig,
  deleteModelConfig,
  getDocumentsPaginated,
  getGraphVersionStatus,
  listModelConfigs,
  rollbackGraphVersion,
  saveGraphVersion,
  testModelConfig,
  DocStatusResponse,
  LightragStatus,
  PlatformModelConfig
} from '@/api/lightrag'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FileText, RotateCcw, Save, Settings2 } from 'lucide-react'
import { toModelDisplay } from '@/utils/modelDisplay'

const modelProviders = ['volcengine', 'tongyi', 'zhipu', 'ollama', 'vllm', 'openai', 'gemini', 'azure_openai', 'aws_bedrock']

type DisplayModel = PlatformModelConfig & {
  builtin?: boolean
}

export default function PlatformCenter() {
  const [loading, setLoading] = useState(false)
  const [models, setModels] = useState<PlatformModelConfig[]>([])
  const [localDocs, setLocalDocs] = useState<DocStatusResponse[]>([])
  const [activeModelId, setActiveModelId] = useState<string | null>(null)
  const [versionInfo, setVersionInfo] = useState<any>(null)
  const [healthStatus, setHealthStatus] = useState<LightragStatus | { status: 'error'; message: string } | null>(null)

  const [modelForm, setModelForm] = useState({
    name: '',
    provider: 'volcengine',
    base_url: '',
    api_key: '',
    model_name: ''
  })

  const displayModels = useMemo<DisplayModel[]>(() => {
    const cfg: any = (healthStatus as any)?.configuration
    const builtin: DisplayModel[] = []

    if (cfg?.llm_model) {
      builtin.push({
        id: '__builtin_llm__',
        name: '\u7cfb\u7edf\u9ed8\u8ba4 LLM',
        provider: String(cfg.llm_binding || 'unknown'),
        model_name: toModelDisplay(String(cfg.llm_model), 'llm'),
        base_url: cfg.llm_binding_host || '',
        builtin: true,
        enabled: true
      })
    }

    if (cfg?.embedding_model) {
      builtin.push({
        id: '__builtin_embedding__',
        name: '\u7cfb\u7edf\u9ed8\u8ba4 Embedding',
        provider: String(cfg.embedding_binding || 'unknown'),
        model_name: toModelDisplay(String(cfg.embedding_model), 'embedding'),
        base_url: cfg.embedding_binding_host || '',
        builtin: true,
        enabled: true
      })
    }

    return [...builtin, ...models.map((m) => ({ ...m, builtin: false }))]
  }, [models, healthStatus])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [modelRes, vRes, hRes, docsRes] = await Promise.all([
        listModelConfigs(),
        getGraphVersionStatus(),
        checkHealth(),
        getDocumentsPaginated({
          page: 1,
          page_size: 10,
          sort_field: 'updated_at',
          sort_direction: 'desc'
        })
      ])

      setModels(modelRes.items || [])
      setActiveModelId(modelRes.active_model_id || null)
      setVersionInfo(vRes)
      setHealthStatus(hRes as any)
      setLocalDocs((docsRes.documents || []).slice(0, 8))
    } catch (e: any) {
      toast.error(`\u52a0\u8f7d\u5e73\u53f0\u914d\u7f6e\u5931\u8d25: ${e?.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleCreateModel = async () => {
    if (!modelForm.name.trim() || !modelForm.model_name.trim()) {
      toast.error('\u8bf7\u586b\u5199\u914d\u7f6e\u540d\u79f0\u548c model_name')
      return
    }

    try {
      await createModelConfig(modelForm)
      toast.success('\u6a21\u578b\u914d\u7f6e\u5df2\u521b\u5efa')
      setModelForm({
        name: '',
        provider: 'volcengine',
        base_url: '',
        api_key: '',
        model_name: ''
      })
      await loadAll()
    } catch (e: any) {
      toast.error(`\u521b\u5efa\u5931\u8d25: ${e?.message || e}`)
    }
  }

  return (
    <div className="ve-grid-bg h-full overflow-auto px-5 py-5 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <Card className="ve-shell">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Settings2 className="size-5 text-primary" />
              {'\u5e73\u53f0\u914d\u7f6e\u4e2d\u5fc3'}
            </CardTitle>
            <CardDescription>{'\u6a21\u578b\u63a5\u5165\u4e0e\u56fe\u8c31\u7248\u672c\u7ba1\u7406'}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={loadAll} disabled={loading}>
              {loading ? '\u52a0\u8f7d\u4e2d...' : '\u5237\u65b0\u72b6\u6001'}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="ve-panel">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Settings2 className="size-4 text-primary" />
                {'\u65b0\u5efa\u6a21\u578b\u914d\u7f6e'}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Input
                placeholder={'\u914d\u7f6e\u540d\u79f0'}
                value={modelForm.name}
                onChange={(e) => setModelForm((s) => ({ ...s, name: e.target.value }))}
              />
              <select
                className="h-11 rounded-xl border bg-background px-3 text-sm"
                value={modelForm.provider}
                onChange={(e) => setModelForm((s) => ({ ...s, provider: e.target.value }))}
              >
                {modelProviders.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <Input className="col-span-2" placeholder="base_url" value={modelForm.base_url} onChange={(e) => setModelForm((s) => ({ ...s, base_url: e.target.value }))} />
              <Input className="col-span-2" placeholder="api_key" value={modelForm.api_key} onChange={(e) => setModelForm((s) => ({ ...s, api_key: e.target.value }))} />
              <Input className="col-span-2" placeholder="model_name" value={modelForm.model_name} onChange={(e) => setModelForm((s) => ({ ...s, model_name: e.target.value }))} />
              <Button className="col-span-2" onClick={handleCreateModel}>{'\u521b\u5efa\u6a21\u578b\u914d\u7f6e'}</Button>
            </CardContent>
          </Card>

          <Card className="ve-panel">
            <CardHeader>
              <CardTitle className="text-base">{'\u6a21\u578b\u914d\u7f6e\u5217\u8868'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {displayModels.length === 0 ? (
                <p className="text-sm text-muted-foreground">{'\u6682\u65e0\u6a21\u578b\u914d\u7f6e'}</p>
              ) : (
                displayModels.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {m.name}
                        {activeModelId === m.id ? '\uff08\u5f53\u524d\uff09' : ''}
                        {m.builtin ? '\uff08\u7cfb\u7edf\uff09' : ''}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{m.provider} {'\u00b7'} {m.model_name}</p>
                    </div>
                    <div className="flex gap-2">
                      {m.builtin ? (
                        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{'\u9ed8\u8ba4\u52a0\u8f7d'}</span>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const res = await testModelConfig(m.id)
                              toast[res.status === 'success' ? 'success' : 'error'](`\u6d4b\u8bd5\u7ed3\u679c: ${res.message}`)
                            }}
                          >
                            {'\u6d4b\u8bd5'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const res = await activateModelConfig(m.id)
                              if (res.apply_result?.applied) {
                                toast.success('\u5df2\u751f\u6548')
                              } else {
                                toast.error(`\u751f\u6548\u5931\u8d25: ${res.apply_result?.message || '\u672a\u77e5\u9519\u8bef'}`)
                              }
                              await loadAll()
                            }}
                          >
                            {'\u751f\u6548'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await deleteModelConfig(m.id)
                              toast.success('\u5df2\u5220\u9664')
                              await loadAll()
                            }}
                          >
                            {'\u5220\u9664'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="ve-panel">
            <CardHeader>
              <CardTitle className="text-base">{'\u56fe\u8c31\u7248\u672c\uff08\u5f53\u524d + \u4e0a\u6b21\uff09'}</CardTitle>
              <CardDescription>{'\u6309\u5f53\u524d\u5de5\u4f5c\u7a7a\u95f4\u4fdd\u5b58\u548c\u56de\u6eda'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-xl border p-3 text-sm">
                  <p className="font-medium">{'\u5f53\u524d\u7248\u672c'}</p>
                  <p className="text-muted-foreground">{versionInfo?.current?.saved_at || '-'}</p>
                </div>
                <div className="rounded-xl border p-3 text-sm">
                  <p className="font-medium">{'\u4e0a\u6b21\u7248\u672c'}</p>
                  <p className="text-muted-foreground">{versionInfo?.previous?.saved_at || '-'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    const res = await saveGraphVersion('\u624b\u52a8\u4fdd\u5b58')
                    toast.success(`\u5df2\u4fdd\u5b58\uff1a${res.meta?.saved_at || ''}`)
                    await loadAll()
                  }}
                >
                  <Save className="mr-1.5 size-4" />
                  {'\u4fdd\u5b58\u5f53\u524d\u7248\u672c'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await rollbackGraphVersion()
                    toast.success('\u5df2\u56de\u6eda\u5230\u4e0a\u6b21\u4fdd\u5b58\u7248\u672c')
                    await loadAll()
                  }}
                >
                  <RotateCcw className="mr-1.5 size-4" />
                  {'\u56de\u6eda\u5230\u4e0a\u6b21\u7248\u672c'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="ve-panel">
            <CardHeader>
              <CardTitle className="text-base">{'\u672c\u5730\u5df2\u4e0a\u4f20\u6587\u4ef6\uff08\u6700\u8fd1 8 \u6761\uff09'}</CardTitle>
            </CardHeader>
            <CardContent>
              {localDocs.length === 0 ? (
                <p className="text-xs text-muted-foreground">{'\u6682\u65e0\u4e0a\u4f20\u6587\u4ef6'}</p>
              ) : (
                <div className="space-y-2">
                  {localDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border px-2 py-1.5">
                      <p className="truncate text-xs">{doc.file_path || doc.id}</p>
                      <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        <FileText className="mr-1 inline size-3" />
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
