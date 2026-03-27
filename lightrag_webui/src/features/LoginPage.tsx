import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/state'
import { useSettingsStore } from '@/stores/settings'
import { loginToServer, getAuthStatus } from '@/api/lightrag'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { ZapIcon, ShieldCheckIcon, GaugeIcon } from 'lucide-react'
import AppSettings from '@/components/AppSettings'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const authCheckRef = useRef(false)

  useEffect(() => {
    const checkAuthConfig = async () => {
      if (authCheckRef.current) return
      authCheckRef.current = true

      try {
        if (isAuthenticated) {
          navigate('/')
          return
        }

        const status = await getAuthStatus()
        if (status.core_version || status.api_version) {
          sessionStorage.setItem('VERSION_CHECKED_FROM_LOGIN', 'true')
        }

        if (!status.auth_configured && status.access_token) {
          login(
            status.access_token,
            true,
            status.core_version,
            status.api_version,
            status.webui_title || null,
            status.webui_description || null
          )
          useSettingsStore.getState().setCurrentWorkspace(null)
          if (status.message) toast.info(status.message)
          navigate('/')
          return
        }

        setCheckingAuth(false)
      } catch (error) {
        console.error('Failed to check auth configuration:', error)
        setCheckingAuth(false)
      }
    }

    checkAuthConfig()
  }, [isAuthenticated, login, navigate])

  if (checkingAuth) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error('请输入用户名和密码')
      return
    }

    try {
      setLoading(true)
      const response = await loginToServer(username, password)
      const previousUsername = localStorage.getItem('LIGHTRAG-PREVIOUS-USER')
      if (previousUsername !== username) {
        useSettingsStore.getState().setRetrievalHistory([])
      }
      localStorage.setItem('LIGHTRAG-PREVIOUS-USER', username)

      const isGuestMode = response.auth_mode === 'disabled'
      login(
        response.access_token,
        isGuestMode,
        response.core_version,
        response.api_version,
        response.webui_title || null,
        response.webui_description || null
      )
      useSettingsStore.getState().setCurrentWorkspace(null)

      if (response.core_version || response.api_version) {
        sessionStorage.setItem('VERSION_CHECKED_FROM_LOGIN', 'true')
      }

      if (isGuestMode) {
        toast.info(
          response.message ||
            '鉴权已关闭，当前为免登录访问。'
        )
      } else {
        toast.success('登录成功')
      }

      navigate('/')
    } catch (error) {
      console.error('Login failed:', error)
      toast.error('登录失败，请检查用户名和密码')
      useAuthStore.getState().logout()
      localStorage.removeItem('LIGHTRAG-API-TOKEN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_15%_0%,rgba(59,130,246,0.30),transparent_60%),radial-gradient(60%_70%_at_85%_0%,rgba(14,165,233,0.22),transparent_62%),linear-gradient(180deg,#f5f8ff_0%,#edf3ff_40%,#eef5ff_100%)] dark:bg-[radial-gradient(70%_60%_at_15%_0%,rgba(59,130,246,0.28),transparent_60%),radial-gradient(60%_70%_at_85%_0%,rgba(14,165,233,0.20),transparent_62%),linear-gradient(180deg,#0b1122_0%,#0b1326_45%,#0d172c_100%)]" />

      <div className="absolute right-5 top-5 z-20">
        <AppSettings className="rounded-full border border-border/70 bg-background/70 backdrop-blur-md" />
      </div>

      <div className="relative z-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="ve-shell hidden rounded-3xl border p-8 lg:block">
          <p className="ve-pill mb-5">智能图谱控制台</p>
          <h1 className="text-5xl font-black leading-[1.1] tracking-tight">
            企业级知识图谱工作台，
            <span className="ve-gradient-text">为规模化场景而设计。</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            上传、索引、构图、检索在一个控制台内完成。面向需要稳定数据隔离与生产级运维能力的团队。
          </p>
          <div className="mt-9 grid grid-cols-3 gap-3">
            <div className="ve-stat-card">
              <ShieldCheckIcon className="mb-2 size-5 text-emerald-500" />
              <p className="text-xs text-muted-foreground">访问控制</p>
              <p className="text-lg font-bold">已保护</p>
            </div>
            <div className="ve-stat-card">
              <GaugeIcon className="mb-2 size-5 text-blue-600" />
              <p className="text-xs text-muted-foreground">运行状态</p>
              <p className="text-lg font-bold">实时</p>
            </div>
            <div className="ve-stat-card">
              <ZapIcon className="mb-2 size-5 text-indigo-500" />
              <p className="text-xs text-muted-foreground">处理管线</p>
              <p className="text-lg font-bold">异步</p>
            </div>
          </div>
        </section>

        <Card className="ve-shell rounded-3xl border">
          <CardHeader className="space-y-3 pb-4 pt-7">
            <div className="mx-auto rounded-2xl border border-primary/20 bg-gradient-to-br from-blue-100 to-cyan-50 p-2.5 dark:from-blue-900/45 dark:to-cyan-900/25">
              <ZapIcon className="size-7 text-primary" />
            </div>
            <CardTitle className="text-center text-2xl font-extrabold tracking-tight">
              登录智能图谱
            </CardTitle>
            <CardDescription className="text-center">请输入账号和密码登录系统</CardDescription>
          </CardHeader>
          <CardContent className="px-7 pb-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username-input" className="text-xs font-semibold uppercase text-muted-foreground">
                  用户名
                </label>
                <Input
                  id="username-input"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password-input" className="text-xs font-semibold uppercase text-muted-foreground">
                  密码
                </label>
                <Input
                  id="password-input"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 text-base font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)]"
                disabled={loading}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
