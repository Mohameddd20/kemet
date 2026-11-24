import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Layers,
  Pin,
  PinOff,
  Plus,
  RotateCw,
  ShieldCheck,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { useNotificationStore } from '../system/notificationStore';
import { useSettingsStore } from '../system/settingsStore';
import {
  downloadBrowserFile,
  fetchHostRoots,
  isTauriRuntime,
  openTauriExternalWebview,
} from '../system/systemBridge';
import { formatBytes, readFileContent, searchNodes } from '../vfs/treeOps';
import { useVfsStore } from '../vfs/vfsStore';
import { launchApp } from '../windowManager/launcher';
import type { WindowAppProps } from '../windowManager/types';
import { deriveTabTitle, QUICK_LAUNCH_SITES, resolveBrowserInput } from './browser/browserUtils';

type RenderMode = 'proxy' | 'direct';
type SideDrawer = 'none' | 'history' | 'downloads';

interface BrowserTab {
  id: string;
  history: string[];
  historyIdx: number;
  addressInput: string;
}

function createTab(url: string): BrowserTab {
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    history: [url],
    historyIdx: 0,
    addressInput: url,
  };
}

export function BrowserApp({ initialUrl, filePath }: WindowAppProps) {
  const tree = useVfsStore((s) => s.tree);
  const language = useSettingsStore((s) => s.language);
  const wifiEnabled = useSettingsStore((s) => s.wifiEnabled);
  const airplaneMode = useSettingsStore((s) => s.airplaneMode);
  const pinnedWebApps = useSettingsStore((s) => s.pinnedWebApps);
  const browserDownloads = useSettingsStore((s) => s.browserDownloads);
  const pinWebApp = useSettingsStore((s) => s.pinWebApp);
  const unpinWebApp = useSettingsStore((s) => s.unpinWebApp);
  const addBrowserDownload = useSettingsStore((s) => s.addBrowserDownload);
  const clearBrowserDownloads = useSettingsStore((s) => s.clearBrowserDownloads);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const startUrl = filePath
    ? `nizamos://${filePath.replace(/^\/+/, '')}`
    : initialUrl ?? 'nizamos://home/user/Documents/welcome.md';

  const [tabs, setTabs] = useState<BrowserTab[]>(() => [createTab(startUrl)]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id ?? '');
  const [browsingLog, setBrowsingLog] = useState<Array<{ url: string; visitedAt: number }>>([
    { url: startUrl, visitedAt: Date.now() },
  ]);
  const [drawer, setDrawer] = useState<SideDrawer>('none');
  const [renderMode, setRenderMode] = useState<RenderMode>('proxy');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [tauriStatus, setTauriStatus] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const currentUrl = activeTab.history[activeTab.historyIdx] ?? startUrl;
  const isOffline = !wifiEnabled || airplaneMode;
  const tauriMode = isTauriRuntime();

  const vfsFiles = useMemo(
    () => searchNodes(tree, '', 15).filter((e) => e.node.type === 'file'),
    [tree]
  );

  const updateActiveTab = (updater: (tab: BrowserTab) => BrowserTab) => {
    setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? updater(t) : t)));
  };

  const navigate = (rawTarget: string) => {
    const target = resolveBrowserInput(rawTarget);
    updateActiveTab((tab) => {
      const nextHistory = [...tab.history.slice(0, tab.historyIdx + 1), target];
      return {
        ...tab,
        history: nextHistory,
        historyIdx: nextHistory.length - 1,
        addressInput: target,
      };
    });
    setBrowsingLog((prev) => [{ url: target, visitedAt: Date.now() }, ...prev].slice(0, 30));
    setDrawer('none');
    setTauriStatus(null);
  };

  const handleNewTab = (url = 'https://html.duckduckgo.com/html/?q=NizamOS') => {
    const next = createTab(url);
    setTabs((prev) => [...prev, next]);
    setActiveTabId(next.id);
    setBrowsingLog((prev) => [{ url, visitedAt: Date.now() }, ...prev].slice(0, 30));
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) {
      navigate('nizamos://home/user/Documents/welcome.md');
      return;
    }
    const idx = tabs.findIndex((t) => t.id === tabId);
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (tabId === activeTab.id) {
      const fallback = remaining[Math.max(0, idx - 1)] ?? remaining[0];
      setActiveTabId(fallback.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(activeTab.addressInput);
  };

  const handleOpenMultiWebview = async () => {
    try {
      await openTauriExternalWebview(currentUrl, `NizamOS Web — ${currentUrl}`);
      setTauriStatus('Opened in native Tauri Webview window.');
    } catch (err) {
      setTauriStatus(err instanceof Error ? err.message : 'Unable to launch Multi-Webview');
    }
  };

  const handleDownloadCurrent = async () => {
    if (isInternal || downloading) return;
    setDownloading(true);
    setTauriStatus(null);
    try {
      const res = await downloadBrowserFile(currentUrl);
      if (res.ok && res.filename && res.path) {
        addBrowserDownload({
          filename: res.filename,
          path: res.path,
          url: currentUrl,
          sizeBytes: res.sizeBytes ?? 0,
        });
        setDrawer('downloads');
        pushNotification(
          language === 'ar' ? 'اكتمل التنزيل' : 'Download Saved',
          `${res.filename} (${formatBytes(res.sizeBytes ?? 0)}) -> Downloads`,
          'files'
        );
      } else {
        setTauriStatus(res.error ?? 'Download failed.');
      }
    } catch (err) {
      setTauriStatus(err instanceof Error ? err.message : 'Download error');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenDownloadsFolder = async () => {
    try {
      const roots = await fetchHostRoots();
      launchApp('files', { initialDir: roots.downloadsDir, storageMode: 'host' });
    } catch {
      launchApp('files');
    }
  };

  const canGoBack = activeTab.historyIdx > 0;
  const canGoForward = activeTab.historyIdx < activeTab.history.length - 1;

  const isInternal = currentUrl.startsWith('nizamos://');
  const vfsPath = isInternal ? '/' + currentUrl.replace(/^nizamos:\/\//, '') : '';
  const vfsDoc = isInternal ? readFileContent(tree, vfsPath) : null;

  const isPinnedWebApp = pinnedWebApps.some((w) => w.url === currentUrl);

  const togglePinCurrentWebApp = () => {
    if (isInternal) return;
    if (isPinnedWebApp) {
      const target = pinnedWebApps.find((w) => w.url === currentUrl);
      if (target) unpinWebApp(target.id);
      pushNotification('Web App Unpinned', `Removed shortcut for ${deriveTabTitle(currentUrl)}.`, 'system');
      return;
    }
    const name = deriveTabTitle(currentUrl);
    pinWebApp({
      id: `webapp-${Date.now()}`,
      name,
      url: currentUrl,
      category: 'Pinned Web',
    });
    pushNotification('Web App Pinned', `Pinned "${name}" to Desktop & Taskbar.`, 'system');
  };

  const iframeSrc =
    renderMode === 'proxy'
      ? `/api/browser/proxy?url=${encodeURIComponent(currentUrl)}`
      : currentUrl;

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="flex flex-col h-full bg-slate-900 text-slate-100"
    >
      {/* Multi-Tab Bar */}
      <div className="flex items-center gap-1 px-2 pt-1.5 bg-slate-950 border-b border-slate-800 overflow-x-auto os-scroll">
        {tabs.map((tab) => {
          const url = tab.history[tab.historyIdx] ?? startUrl;
          const isActive = tab.id === activeTab.id;
          return (
            <div
              key={tab.id}
              className={`group flex items-center gap-2 h-8 px-2.5 rounded-t-md max-w-[190px] shrink-0 border-x border-t transition-colors ${
                isActive
                  ? 'bg-slate-900 border-slate-700 text-white'
                  : 'bg-slate-950/60 border-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className="flex items-center gap-1.5 min-w-0 flex-1 text-start text-[11px] font-medium truncate"
              >
                <Globe className="w-3 h-3 os-accent-text shrink-0" />
                <span className="truncate">{deriveTabTitle(url)}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCloseTab(tab.id)}
                aria-label={`Close tab ${deriveTabTitle(url)}`}
                className="p-0.5 rounded-sm text-slate-500 hover:text-white hover:bg-slate-700 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => handleNewTab()}
          aria-label="New Tab"
          title="New Tab"
          className="p-1.5 rounded-sm text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Navigation Bar */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 bg-slate-950/70"
      >
        <button
          type="button"
          onClick={() => {
            if (!canGoBack) return;
            updateActiveTab((tab) => {
              const next = tab.historyIdx - 1;
              return { ...tab, historyIdx: next, addressInput: tab.history[next] };
            });
          }}
          disabled={!canGoBack}
          aria-label="Back"
          className="p-1.5 rounded-sm text-slate-300 hover:bg-slate-800 disabled:opacity-35 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (!canGoForward) return;
            updateActiveTab((tab) => {
              const next = tab.historyIdx + 1;
              return { ...tab, historyIdx: next, addressInput: tab.history[next] };
            });
          }}
          disabled={!canGoForward}
          aria-label="Forward"
          className="p-1.5 rounded-sm text-slate-300 hover:bg-slate-800 disabled:opacity-35 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setReloadNonce((n) => n + 1)}
          aria-label="Reload page"
          className="p-1.5 rounded-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <div className="relative flex-1">
          <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            dir="ltr"
            value={activeTab.addressInput}
            onChange={(e) => updateActiveTab((tab) => ({ ...tab, addressInput: e.target.value }))}
            aria-label="Browser address bar"
            placeholder={
              language === 'ar'
                ? 'أدخل رابط URL أو ابحث في الإنترنت عبر DuckDuckGo...'
                : 'Search the web or enter URL...'
            }
            className="w-full bg-slate-900 border border-slate-700 rounded-sm pl-8 pr-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[var(--os-accent-hover)]"
          />
        </div>

        <button
          type="submit"
          className="px-3 py-1.5 rounded-sm os-accent-bg text-xs font-medium text-white whitespace-nowrap"
        >
          Go
        </button>

        {!isInternal && (
          <>
            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownloadCurrent()}
              title="Download page / file to ~/Downloads"
              aria-label="Download to host Downloads"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 whitespace-nowrap disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 os-accent-text" />
              <span className="hidden md:inline">
                {downloading ? '...' : language === 'ar' ? 'تنزيل' : 'Save'}
              </span>
            </button>

            <button
              type="button"
              onClick={togglePinCurrentWebApp}
              aria-pressed={isPinnedWebApp}
              title={isPinnedWebApp ? 'Unpin Web App' : 'Pin Web App to Desktop & Taskbar'}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors whitespace-nowrap ${
                isPinnedWebApp
                  ? 'os-accent-soft-bg os-accent-text border border-[var(--os-accent-border)]'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {isPinnedWebApp ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline">{isPinnedWebApp ? 'Pinned' : 'Pin App'}</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setDrawer((d) => (d === 'downloads' ? 'none' : 'downloads'))}
          aria-pressed={drawer === 'downloads'}
          aria-label="Downloads Manager"
          title="Downloads Manager"
          className={`flex items-center gap-1 p-1.5 rounded-sm transition-colors ${
            drawer === 'downloads'
              ? 'os-accent-bg text-white'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          {browserDownloads.length > 0 && (
            <span className="text-[10px] font-mono-tabular">{browserDownloads.length}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setDrawer((d) => (d === 'history' ? 'none' : 'history'))}
          aria-pressed={drawer === 'history'}
          aria-label="Browsing History"
          className={`p-1.5 rounded-sm transition-colors ${
            drawer === 'history'
              ? 'os-accent-bg text-white'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
        </button>
      </form>

      {/* Quick Launch Sites & Render Mode Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-800/80 bg-slate-900/90 overflow-x-auto os-scroll">
        <div className="flex items-center gap-1">
          {QUICK_LAUNCH_SITES.map((bm) => (
            <button
              key={bm.id}
              type="button"
              onClick={() => navigate(bm.url)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                currentUrl === bm.url
                  ? 'os-accent-soft-bg os-accent-text'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {bm.url.startsWith('nizamos://') ? (
                <FileText className="w-3 h-3" />
              ) : (
                <ExternalLink className="w-3 h-3" />
              )}
              <span>{bm.label}</span>
            </button>
          ))}
        </div>

        {!isInternal && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-sm p-0.5">
              <button
                type="button"
                onClick={() => setRenderMode('proxy')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-medium whitespace-nowrap ${
                  renderMode === 'proxy'
                    ? 'os-accent-bg text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Proxy Frame</span>
              </button>
              <button
                type="button"
                onClick={() => setRenderMode('direct')}
                className={`px-2 py-0.5 rounded-sm text-[11px] font-medium whitespace-nowrap ${
                  renderMode === 'direct'
                    ? 'os-accent-bg text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Direct
              </button>
            </div>

            {tauriMode && (
              <button
                type="button"
                onClick={() => void handleOpenMultiWebview()}
                className="flex items-center gap-1 px-2 py-1 rounded-sm bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 whitespace-nowrap"
              >
                <Layers className="w-3 h-3 os-accent-text" />
                <span>Multi-Webview</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Viewport + Optional Drawer */}
      <div className="relative flex-1 min-h-0 flex overflow-hidden bg-slate-950">
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          {isInternal ? (
            <div className="flex h-full">
              <aside className="w-44 shrink-0 border-e border-slate-800 bg-slate-950 p-2.5 overflow-y-auto os-scroll hidden sm:block">
                <div className="text-[11px] font-medium text-slate-400 px-1.5 mb-1.5">
                  VFS Documents
                </div>
                <div className="space-y-0.5">
                  {vfsFiles.map((f) => {
                    const target = `nizamos://${f.path.replace(/^\/+/, '')}`;
                    return (
                      <button
                        key={f.path}
                        type="button"
                        onClick={() => navigate(target)}
                        className={`w-full text-start px-2 py-1.5 rounded-sm text-xs truncate transition-colors ${
                          currentUrl === target
                            ? 'os-accent-soft-bg os-accent-text font-medium'
                            : 'text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        {f.node.name}
                      </button>
                    );
                  })}
                </div>
              </aside>
              <div className="flex-1 overflow-y-auto os-scroll p-6 select-text">
                {vfsDoc?.ok ? (
                  <article className="max-w-2xl space-y-3">
                    <div className="text-[11px] font-mono text-slate-400">{vfsPath}</div>
                    <pre
                      dir="auto"
                      className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-100 bg-slate-900/70 border border-slate-800 rounded-md p-5"
                    >
                      {vfsDoc.content}
                    </pre>
                  </article>
                ) : (
                  <div className="text-sm text-red-400">
                    {vfsDoc?.error ?? `Could not load ${vfsPath}`}
                  </div>
                )}
              </div>
            </div>
          ) : isOffline ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <WifiOff className="w-10 h-10 text-slate-500 mb-3" />
              <h3 className="text-sm font-semibold text-slate-200">No Internet Connection</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Wi-Fi is turned off or Airplane Mode is active. Enable Wi-Fi from Quick Settings or browse local documents.
              </p>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col">
              <div className="px-3 py-1 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between gap-2">
                <span className="truncate font-mono" dir="ltr">
                  {renderMode === 'proxy'
                    ? `Server Proxy View: ${currentUrl}`
                    : `Direct Iframe: ${currentUrl}`}
                </span>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {tauriStatus ??
                    (renderMode === 'proxy'
                      ? 'X-Frame-Options stripped & URLs rewritten'
                      : 'Direct embed (may be restricted by target site)')}
                </span>
              </div>
              <iframe
                key={`${activeTab.id}-${iframeSrc}-${reloadNonce}`}
                src={iframeSrc}
                title={`Web Browser — ${currentUrl}`}
                sandbox={
                  renderMode === 'proxy'
                    ? 'allow-scripts allow-forms allow-popups'
                    : 'allow-scripts allow-same-origin allow-forms'
                }
                className="flex-1 w-full h-full bg-white border-0"
              />
            </div>
          )}
        </div>

        {/* Downloads Manager Drawer */}
        {drawer === 'downloads' && (
          <aside
            aria-label="Downloads Manager"
            className="w-72 shrink-0 border-s border-slate-800 bg-slate-950/95 p-3 overflow-y-auto os-scroll space-y-2.5"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-100">
                {language === 'ar' ? 'مدير التنزيلات' : 'Downloads'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleOpenDownloadsFolder()}
                  className="text-[11px] os-accent-text hover:underline"
                >
                  {language === 'ar' ? 'فتح المجلد' : 'Open Folder'}
                </button>
                {browserDownloads.length > 0 && (
                  <button
                    type="button"
                    onClick={clearBrowserDownloads}
                    aria-label="Clear Downloads"
                    className="p-1 text-slate-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {browserDownloads.length === 0 ? (
              <div className="text-xs text-slate-500 py-6 text-center">
                {language === 'ar'
                  ? 'لا توجد ملفات منزلة بعد. اضغط Save لحفظ الصفحة أو الملف إلى Downloads.'
                  : 'No downloads yet. Click Save on any web page to store it in ~/Downloads.'}
              </div>
            ) : (
              browserDownloads.map((dl) => (
                <div
                  key={dl.id}
                  className="p-2.5 rounded-sm bg-slate-900 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-100 truncate">
                      {dl.filename}
                    </span>
                    <span className="text-[10px] font-mono-tabular text-emerald-400 shrink-0">
                      {formatBytes(dl.sizeBytes)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate" dir="ltr">
                    {dl.path}
                  </div>
                </div>
              ))
            )}
          </aside>
        )}

        {/* Browsing History Drawer */}
        {drawer === 'history' && (
          <aside
            aria-label="Browsing History"
            className="w-64 shrink-0 border-s border-slate-800 bg-slate-950/95 p-3 overflow-y-auto os-scroll space-y-2"
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-100">History</span>
              <button
                type="button"
                onClick={() => setBrowsingLog([])}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Clear
              </button>
            </div>
            {browsingLog.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">No history recorded.</div>
            ) : (
              browsingLog.map((entry, idx) => (
                <button
                  key={`${entry.url}-${idx}`}
                  type="button"
                  onClick={() => navigate(entry.url)}
                  className="w-full text-start p-2 rounded-sm hover:bg-slate-900 border border-transparent hover:border-slate-800"
                >
                  <div className="text-xs font-medium text-slate-200 truncate">
                    {deriveTabTitle(entry.url)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate" dir="ltr">
                    {entry.url}
                  </div>
                </button>
              ))
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
