import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import ThemeProvider from '@/components/ThemeProvider'
import TabVisibilityProvider from '@/contexts/TabVisibilityProvider'
import ApiKeyAlert from '@/components/ApiKeyAlert'
import { SiteInfo, webuiPrefix } from '@/lib/constants'
import { useBackendState, useAuthStore } from '@/stores/state'
import { useSettingsStore } from '@/stores/settings'
import { getAuthStatus } from '@/api/lightrag'
import SiteHeader from '@/features/SiteHeader'
import { InvalidApiKeyError, RequireApiKeError } from '@/api/lightrag'
import { ZapIcon } from 'lucide-react'

import WorkspaceHub from '@/features/WorkspaceHub'
import { ErrorBoundary } from '@/components/ErrorBoundary'

import { Tabs, TabsContent } from '@/components/ui/Tabs'

const GraphViewer = lazy(() => import('@/features/GraphViewer'))
const DocumentManager = lazy(() => import('@/features/DocumentManager'))
const RetrievalTesting = lazy(() => import('@/features/RetrievalTesting'))
const ApiSite = lazy(() => import('@/features/ApiSite'))
const DataAnalysisDashboard = lazy(() => import('@/features/DataAnalysisDashboard'))
const MindMapViewer = lazy(() => import('@/features/MindMapViewer'))
const PlatformCenter = lazy(() => import('@/features/PlatformCenter'))
const StatusIndicator = lazy(() => import('@/components/status/StatusIndicator'))

const APP_TABS = [
  'documents',
  'knowledge-graph',
  'data-analysis',
  'mind-map',
  'retrieval',
  'api',
  'platform'
] as const

function App() {
  const message = useBackendState.use.message()
  const enableHealthCheck = useSettingsStore.use.enableHealthCheck()
  const currentTab = useSettingsStore.use.currentTab()
  const currentWorkspace = useSettingsStore.use.currentWorkspace()
  const [apiKeyAlertOpen, setApiKeyAlertOpen] = useState(false)
  const [initializing, setInitializing] = useState(true) // Add initializing state
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
    () => new Set([currentTab])
  )
  const versionCheckRef = useRef(false); // Prevent duplicate calls in Vite dev mode
  const healthCheckInitializedRef = useRef(false); // Prevent duplicate health checks in Vite dev mode

  const handleApiKeyAlertOpenChange = useCallback((open: boolean) => {
    setApiKeyAlertOpen(open)
    if (!open) {
      useBackendState.getState().clear()
    }
  }, [])

  // Track component mount status with useRef
  const isMountedRef = useRef(true);

  // Set up mount/unmount status tracking
  useEffect(() => {
    isMountedRef.current = true;

    // Handle page reload/unload
    const handleBeforeUnload = () => {
      isMountedRef.current = false;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Health check - can be disabled
  useEffect(() => {
    // Health check function
    const performHealthCheck = async () => {
      try {
        // Only perform health check if component is still mounted
        if (isMountedRef.current) {
          await useBackendState.getState().check();
        }
      } catch (error) {
        console.error('Health check error:', error);
      }
    };

    // Set health check function in the store
    useBackendState.getState().setHealthCheckFunction(performHealthCheck);

    if (!enableHealthCheck || apiKeyAlertOpen) {
      useBackendState.getState().clearHealthCheckTimer();
      return;
    }

    // On first mount or when enableHealthCheck becomes true and apiKeyAlertOpen is false,
    // perform an immediate health check and start the timer
    if (!healthCheckInitializedRef.current) {
      healthCheckInitializedRef.current = true;
    }

    // Start/reset the health check timer using the store
    useBackendState.getState().resetHealthCheckTimer();

    // Component unmount cleanup
    return () => {
      useBackendState.getState().clearHealthCheckTimer();
    };
  }, [enableHealthCheck, apiKeyAlertOpen]);

  // Version check - independent and executed only once
  useEffect(() => {
    const checkVersion = async () => {
      // Prevent duplicate calls in Vite dev mode
      if (versionCheckRef.current) return;
      versionCheckRef.current = true;

      // Check if version info was already obtained in login page
      const versionCheckedFromLogin = sessionStorage.getItem('VERSION_CHECKED_FROM_LOGIN') === 'true';
      if (versionCheckedFromLogin) {
        setInitializing(false); // Skip initialization if already checked
        return;
      }

      try {
        setInitializing(true); // Start initialization

        // Get version info
        const token = localStorage.getItem('LIGHTRAG-API-TOKEN');
        const status = await getAuthStatus();

        // If auth is not configured and a new token is returned, use the new token
        if (!status.auth_configured && status.access_token) {
          useAuthStore.getState().login(
            status.access_token, // Use the new token
            true, // Guest mode
            status.core_version,
            status.api_version,
            status.webui_title || null,
            status.webui_description || null
          );
        } else if (token && (status.core_version || status.api_version || status.webui_title || status.webui_description)) {
          // Otherwise use the old token (if it exists)
          const isGuestMode = status.auth_mode === 'disabled' || useAuthStore.getState().isGuestMode;
          useAuthStore.getState().login(
            token,
            isGuestMode,
            status.core_version,
            status.api_version,
            status.webui_title || null,
            status.webui_description || null
          );
        }

        // Set flag to indicate version info has been checked
        sessionStorage.setItem('VERSION_CHECKED_FROM_LOGIN', 'true');
      } catch (error) {
        console.error('Failed to get version info:', error);
      } finally {
        // Ensure initializing is set to false even if there's an error
        setInitializing(false);
      }
    };

    // Execute version check
    checkVersion();
  }, []); // Empty dependency array ensures it only runs once on mount

  const handleTabChange = useCallback(
    (tab: string) => useSettingsStore.getState().setCurrentTab(tab as any),
    []
  )

  useEffect(() => {
    if (message) {
      if (message.includes(InvalidApiKeyError) || message.includes(RequireApiKeError)) {
        setApiKeyAlertOpen(true)
      }
    }
  }, [message])

  useEffect(() => {
    if (!APP_TABS.includes(currentTab as (typeof APP_TABS)[number])) return
    setLoadedTabs((prev) => {
      if (prev.has(currentTab)) return prev
      const next = new Set(prev)
      next.add(currentTab)
      return next
    })
  }, [currentTab])

  const tabLoadingFallback = (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )

  return (
    <ThemeProvider>
      <TabVisibilityProvider>
        {initializing ? (
          // Loading state while initializing with simplified header
          <div className="flex h-screen w-screen flex-col">
            {/* Simplified header during initialization - matches SiteHeader structure */}
            <header className="sticky top-0 z-50 px-4 pt-4 md:px-6">
              <div className="ve-shell flex h-14 items-center rounded-2xl border px-4">
                <a href={webuiPrefix} className="flex items-center gap-2">
                  <ZapIcon className="size-4 text-primary" aria-hidden="true" />
                  <span className="font-bold md:inline-block">{SiteInfo.name}</span>
                </a>
              </div>
            </header>

            {/* Loading indicator in content area */}
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                <p>Initializing...</p>
              </div>
            </div>
          </div>
        ) : (
          // Main content after initialization
          <main className="relative flex h-screen w-screen overflow-hidden">
            <Tabs
              value={currentTab}
              className="!m-0 flex grow flex-col !p-0 overflow-hidden"
              onValueChange={handleTabChange}
            >
              <SiteHeader />
              {!currentWorkspace ? (
                <div className="grow overflow-hidden">
                  <WorkspaceHub />
                </div>
              ) : (
                <div className="relative grow px-4 pb-4 md:px-6 md:pb-6">
                  <div className="ve-shell relative h-full overflow-hidden rounded-2xl border">
                    <TabsContent value="documents" className="absolute inset-0 overflow-auto data-[state=inactive]:hidden">
                      {loadedTabs.has('documents') && (
                        <Suspense fallback={tabLoadingFallback}>
                          <DocumentManager />
                        </Suspense>
                      )}
                    </TabsContent>
                    <TabsContent value="knowledge-graph" className="absolute inset-0 overflow-hidden data-[state=inactive]:hidden">
                      {loadedTabs.has('knowledge-graph') && (
                        <Suspense fallback={tabLoadingFallback}>
                          <GraphViewer />
                        </Suspense>
                      )}
                    </TabsContent>
                    <TabsContent value="data-analysis" className="absolute inset-0 overflow-hidden data-[state=inactive]:hidden">
                      {loadedTabs.has('data-analysis') && (
                        <Suspense fallback={tabLoadingFallback}>
                          <ErrorBoundary>
                            <DataAnalysisDashboard />
                          </ErrorBoundary>
                        </Suspense>
                      )}
                    </TabsContent>
                    <TabsContent value="mind-map" className="absolute inset-0 overflow-hidden data-[state=inactive]:hidden">
                      {loadedTabs.has('mind-map') && (
                        <Suspense fallback={tabLoadingFallback}>
                          <ErrorBoundary>
                            <MindMapViewer />
                          </ErrorBoundary>
                        </Suspense>
                      )}
                    </TabsContent>
                    <TabsContent value="retrieval" className="absolute inset-0 overflow-hidden data-[state=inactive]:hidden">
                      {loadedTabs.has('retrieval') && (
                        <Suspense fallback={tabLoadingFallback}>
                          <ErrorBoundary onReset={() => {
                            useSettingsStore.getState().setRetrievalHistory([]);
                            window.location.reload();
                          }}>
                            <RetrievalTesting />
                          </ErrorBoundary>
                        </Suspense>
                      )}
                    </TabsContent>
                    <TabsContent value="api" className="absolute inset-0 overflow-hidden data-[state=inactive]:hidden">
                      {loadedTabs.has('api') && (
                        <Suspense fallback={tabLoadingFallback}>
                          <ApiSite />
                        </Suspense>
                      )}
                    </TabsContent>
                    <TabsContent value="platform" className="absolute inset-0 overflow-auto data-[state=inactive]:hidden">
                      {loadedTabs.has('platform') && (
                        <Suspense fallback={tabLoadingFallback}>
                          <PlatformCenter />
                        </Suspense>
                      )}
                    </TabsContent>
                  </div>
                </div>
              )}
            </Tabs>
            {enableHealthCheck && (
              <Suspense fallback={null}>
                <StatusIndicator />
              </Suspense>
            )}
            <ApiKeyAlert open={apiKeyAlertOpen} onOpenChange={handleApiKeyAlertOpenChange} />
          </main>
        )}
      </TabVisibilityProvider>
    </ThemeProvider>
  )
}

export default App
