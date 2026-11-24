import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  ExternalLink,
  EyeOff,
  Globe,
  Home,
  Lock,
  Plus,
  RotateCw,
  Search,
  Star,
  X,
} from 'lucide-react';
import {
  downloadBrowserFile,
  isTauriRuntime,
  launchNativeApp,
  openEmbeddedBrowser,
} from '../../services/systemBridge';
import { openOsApp } from '../../apps/registry';
import { useSettingsStore } from '../../system/settingsStore';
import type { WindowAppProps } from '../../windowManager/types';
import { KemetLogo } from './KemetLogo';
import {
  decodeDisplayUrl,
  resolveOmniboxInput,
  type BrowserNavigationTarget,
} from './browserUtils';

interface BrowserTab {
  id: string;
  title: string;
  target: BrowserNavigationTarget;
  incognito: boolean;
  history: BrowserNavigationTarget[];
  historyIndex: number;
}

interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface FeaturedInstallPrompt {
  appId: string;
  packageName: string;
  title: string;
  description: string;
  buttonLabel: string;
  downloadUrl: string;
}

const QUICK_SITES = [
  { label: 'Example', url: 'https://example.com', color: 'text-cyan-300' },
  { label: 'Google Chrome', url: 'https://www.google.com/chrome/', color: 'text-amber-300' },
  { label: 'Wikipedia', url: 'https://ar.wikipedia.org', color: 'text-emerald-300' },
  { label: 'GitHub', url: 'https://github.com', color: 'text-slate-100' },
  { label: 'Debian', url: 'https://www.debian.org', color: 'text-rose-300' },
  { label: 'Live Search', url: 'kemet://search?q=Debian Linux', color: 'text-orange-300' },
];

export function KemetBrowser({ initialUrl }: WindowAppProps) {
  const language = useSettingsStore((s) => s.language);
  const browserDownloads = useSettingsStore((s) => s.browserDownloads);
  const addBrowserDownload = useSettingsStore((s) => s.addBrowserDownload);
  const isAr = language === 'ar';
  const tauriMode = isTauriRuntime();

  const initialTarget = resolveOmniboxInput(initialUrl || 'kemet://newtab');

  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: initialTarget.title,
      target: initialTarget,
      incognito: false,
      history: [initialTarget],
      historyIndex: 0,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [addressInput, setAddressInput] = useState(initialTarget.displayUrl);
  const [homeQuery, setHomeQuery] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [showDownloads, setShowDownloads] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(initialTarget.mode === 'web');
  const [iframeError, setIframeError] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchFeatured, setSearchFeatured] = useState<FeaturedInstallPrompt | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([
    'https://www.google.com/chrome/',
    'https://example.com',
    'https://github.com',
  ]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId]
  );

  const webTargetUrl = useMemo(() => {
    if (activeTab.target.mode === 'web') return activeTab.target.url;
    return null;
  }, [activeTab.target]);

  const iframeSrc = useMemo(() => {
    if (tauriMode || !webTargetUrl) return null;
    const base = `/api/browse?url=${encodeURIComponent(webTargetUrl)}`;
    return reloadNonce > 0 ? `${base}&_r=${reloadNonce}` : base;
  }, [webTargetUrl, reloadNonce, tauriMode]);

  const externalTargetUrl = useMemo(() => {
    if (activeTab.target.mode === 'web') return activeTab.target.url;
    if (activeTab.target.mode === 'search') {
      return `https://duckduckgo.com/?q=${encodeURIComponent(activeTab.target.query)}`;
    }
    return 'https://www.google.com';
  }, [activeTab.target]);

  useEffect(() => {
    if (iframeSrc) {
      setIframeLoading(true);
      setIframeError(false);
    } else {
      setIframeLoading(false);
      setIframeError(false);
    }
  }, [iframeSrc]);

  useEffect(() => {
    if (activeTab.target.mode !== 'search') return;
    const query = activeTab.target.query;
    let cancelled = false;
    setSearchLoading(true);
    setSearchResults([]);
    setSearchFeatured(null);
    fetch(`/api/web-search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then(
        (data: {
          ok?: boolean;
          results?: SearchResultItem[];
          featuredInstall?: FeaturedInstallPrompt | null;
        }) => {
          if (cancelled) return;
          setSearchResults(Array.isArray(data.results) ? data.results : []);
          setSearchFeatured(data.featuredInstall ?? null);
        }
      )
      .catch(() => {
        if (!cancelled) setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab.target, reloadNonce]);

  const launchNativeWebWindow = (target: BrowserNavigationTarget) => {
    if (!tauriMode || target.mode === 'newtab') return;
    const targetUrl =
      target.mode === 'web'
        ? target.url
        : `https://duckduckgo.com/?q=${encodeURIComponent(target.query)}`;
    void openEmbeddedBrowser(targetUrl, `متصفح كيميت — ${target.title}`);
  };

  const navigateTab = (rawInput: string) => {
    const resolved = resolveOmniboxInput(rawInput);
    setAddressInput(decodeDisplayUrl(resolved.displayUrl));
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTab.id) return tab;
        const nextHistory = [...tab.history.slice(0, tab.historyIndex + 1), resolved];
        return {
          ...tab,
          title: resolved.title,
          target: resolved,
          history: nextHistory,
          historyIndex: nextHistory.length - 1,
        };
      })
    );

    launchNativeWebWindow(resolved);
  };

  const goBack = () => {
    if (activeTab.historyIndex <= 0) return;
    const nextIdx = activeTab.historyIndex - 1;
    const prevTarget = activeTab.history[nextIdx];
    setAddressInput(decodeDisplayUrl(prevTarget.displayUrl));
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab.id
          ? { ...t, target: prevTarget, title: prevTarget.title, historyIndex: nextIdx }
          : t
      )
    );
  };

  const goForward = () => {
    if (activeTab.historyIndex >= activeTab.history.length - 1) return;
    const nextIdx = activeTab.historyIndex + 1;
    const nextTarget = activeTab.history[nextIdx];
    setAddressInput(decodeDisplayUrl(nextTarget.displayUrl));
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab.id
          ? { ...t, target: nextTarget, title: nextTarget.title, historyIndex: nextIdx }
          : t
      )
    );
  };

  const addTab = (incognito = false) => {
    const id = `tab-${Date.now()}`;
    const startTarget: BrowserNavigationTarget = {
      mode: 'newtab',
      displayUrl: 'kemet://newtab',
      title: incognito ? (isAr ? 'تبويب متخفي' : 'Incognito') : isAr ? 'تبويب جديد' : 'New Tab',
    };
    setTabs((prev) => [
      ...prev,
      {
        id,
        title: startTarget.title,
        target: startTarget,
        incognito,
        history: [startTarget],
        historyIndex: 0,
      },
    ]);
    setActiveTabId(id);
    setAddressInput(startTarget.displayUrl);
    setHomeQuery('');
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) return;
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[0].id);
      setAddressInput(decodeDisplayUrl(remaining[0].target.displayUrl));
    }
  };

  const toggleBookmark = () => {
    if (activeTab.target.mode !== 'web') return;
    const targetUrl = activeTab.target.url;
    setBookmarks((prev) =>
      prev.includes(targetUrl) ? prev.filter((u) => u !== targetUrl) : [targetUrl, ...prev]
    );
  };

  const handleLaunchChrome = async () => {
    const url = activeTab.target.mode === 'web' ? activeTab.target.url : 'https://www.google.com';
    const chromeRes = await launchNativeApp('google-chrome-stable', ['--no-first-run', url]);
    if (chromeRes.ok) return;
    const chromiumRes = await launchNativeApp('chromium', ['--no-first-run', url]);
    if (chromiumRes.ok) return;
    openOsApp('store', { storeAppId: 'google-chrome' });
  };

  const handleDownloadCurrent = async () => {
    if (activeTab.target.mode !== 'web') return;
    const res = await downloadBrowserFile(activeTab.target.url);
    if (res.ok && res.filename && res.path) {
      addBrowserDownload({
        filename: res.filename,
        path: res.path,
        url: activeTab.target.url,
        sizeBytes: res.sizeBytes ?? 0,
      });
      setShowDownloads(true);
    }
  };

  const isBookmarked = activeTab.target.mode === 'web' && bookmarks.includes(activeTab.target.url);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="flex-1 min-h-0 flex flex-col bg-[#0B1120] text-slate-100 select-none overflow-hidden"
    >
      {/* Row 1 — Sleek 38px Tab Bar (#070b14) */}
      <div className="h-[38px] shrink-0 px-3 bg-[#070b14] border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto os-scroll min-w-0">
          {tabs.map((tab) => {
            const active = tab.id === activeTab.id;
            return (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setAddressInput(decodeDisplayUrl(tab.target.displayUrl));
                }}
                className={`h-7 flex items-center gap-2 px-3 rounded-lg text-xs cursor-pointer shrink-0 transition-colors ${
                  active
                    ? 'bg-[#0f172a] border border-slate-700/80 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                {tab.incognito ? (
                  <EyeOff className="w-3.5 h-3.5 text-violet-300 shrink-0" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-[#2DD4BF] shrink-0" />
                )}
                <span className="max-w-[140px] truncate font-medium">{tab.title}</span>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    aria-label={isAr ? 'إغلاق التبويب' : 'Close tab'}
                    className="text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => addTab(false)}
            aria-label={isAr ? 'تبويب جديد' : 'New Tab'}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => addTab(true)}
          aria-label={isAr ? 'تبويب متخفي' : 'New Incognito Tab'}
          title={isAr ? 'تبويب متخفي' : 'New Incognito Tab'}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-300 hover:bg-slate-800/70 cursor-pointer shrink-0"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 2 — Minimalist 44px Navigation & Omnibox (#0f172a) */}
      <div className="h-[44px] shrink-0 px-3 bg-[#0f172a] border-b border-slate-800/80 flex items-center gap-2.5">
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={goBack}
            disabled={activeTab.historyIndex <= 0}
            aria-label={isAr ? 'رجوع' : 'Back'}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 disabled:opacity-35 text-slate-300 cursor-pointer"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={activeTab.historyIndex >= activeTab.history.length - 1}
            aria-label={isAr ? 'تقدم' : 'Forward'}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 disabled:opacity-35 text-slate-300 cursor-pointer"
          >
            {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            aria-label={isAr ? 'إعادة تحميل' : 'Reload'}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-300 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${iframeLoading ? 'animate-spin text-[#2DD4BF]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => navigateTab('kemet://newtab')}
            aria-label={isAr ? 'الرئيسية' : 'Home'}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 text-[#D6A63B] cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clean Address / Search Pill */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigateTab(addressInput);
          }}
          className="flex-1 min-w-0 flex items-center bg-[#1e293b] border border-slate-700/70 focus-within:border-[#D6A63B]/70 rounded-full px-3.5 h-8 gap-2"
        >
          <Lock className="w-3.5 h-3.5 text-[#2DD4BF] shrink-0" />
          <input
            type="text"
            dir="auto"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder={isAr ? 'ابحث في الويب أو اكتب رابط موقع...' : 'Search the web or enter URL...'}
            className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </form>

        {/* Utility Icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleBookmark}
            aria-label={isAr ? 'حفظ في المفضلة' : 'Bookmark'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-800 cursor-pointer ${
              isBookmarked ? 'text-[#D6A63B]' : 'text-slate-400 hover:text-amber-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-[#D6A63B]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeTab.target.mode === 'web') void handleDownloadCurrent();
              else setShowDownloads((d) => !d);
            }}
            aria-label={isAr ? 'التنزيلات' : 'Downloads'}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#2DD4BF] hover:bg-slate-800 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => void handleLaunchChrome()}
            title={isAr ? 'تشغيل أو تثبيت Google Chrome' : 'Google Chrome / Kemet Store'}
            aria-label="Open Google Chrome"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top Loading Progress Bar */}
      {iframeSrc && (
        <div className="h-0.5 w-full bg-slate-900 shrink-0 overflow-hidden">
          {iframeLoading && <div className="h-full w-2/3 bg-[#2DD4BF] animate-pulse" />}
        </div>
      )}

      {/* Downloads Drawer */}
      {showDownloads && (
        <div className="px-5 py-3 bg-[#070b14] border-b border-slate-800 max-h-36 overflow-y-auto os-scroll space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs font-semibold text-[#D6A63B]">
            <span>{isAr ? 'التنزيلات' : 'Downloads'}</span>
            <button type="button" onClick={() => setShowDownloads(false)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {browserDownloads.length === 0 ? (
            <div className="text-xs text-slate-500">{isAr ? 'لا توجد تنزيلات بعد' : 'No downloads yet'}</div>
          ) : (
            browserDownloads.map((dl) => (
              <div key={dl.id} className="flex items-center justify-between text-xs text-slate-300 font-mono-tabular">
                <span className="truncate">{dl.filename}</span>
                <span className="text-[#2DD4BF] shrink-0">{Math.round(dl.sizeBytes / 1024)} KB</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Main Content Area */}
      {activeTab.target.mode === 'newtab' ? (
        <div className="flex-1 min-h-0 overflow-y-auto os-scroll bg-[#0B1120]">
          <div className="max-w-2xl mx-auto px-6 py-14 space-y-8">
            <div className="flex flex-col items-center text-center space-y-3">
              <KemetLogo className="w-16 h-16 rounded-2xl border border-[#D6A63B]/35 shadow-xl" />
              <h1 className="text-xl font-bold text-white">
                {isAr ? 'متصفح كيميت' : 'Kemet Browser'}
              </h1>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (homeQuery.trim()) navigateTab(homeQuery);
              }}
              className="flex items-center bg-[#070b14] border border-slate-800 focus-within:border-[#D6A63B]/70 rounded-2xl px-4 py-3 gap-3 shadow-xl"
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={homeQuery}
                onChange={(e) => setHomeQuery(e.target.value)}
                placeholder={isAr ? 'ابحث في الويب أو اكتب رابط موقع...' : 'Search the web or enter URL...'}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#D6A63B] hover:brightness-110 text-slate-950 text-xs font-bold cursor-pointer shrink-0"
              >
                {isAr ? 'بحث' : 'Search'}
              </button>
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {QUICK_SITES.map((site) => (
                <button
                  key={site.url}
                  type="button"
                  onClick={() => navigateTab(site.url)}
                  className="p-4 rounded-xl bg-[#070b14] hover:bg-[#111827] border border-slate-800 hover:border-[#D6A63B]/45 flex items-center gap-3 text-right rtl:text-right ltr:text-left transition-colors cursor-pointer"
                >
                  <Globe className={`w-4 h-4 ${site.color} shrink-0`} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{site.label}</div>
                    <div dir="ltr" className="text-[11px] text-slate-400 truncate">
                      {site.url.replace('https://', '')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab.target.mode === 'search' ? (
        <div className="flex-1 min-h-0 flex flex-col bg-[#0B1120]">
          <div className="min-h-9 shrink-0 px-3 py-1.5 bg-[#070b14] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-[11px] text-[#2DD4BF] font-medium truncate min-w-0">
              {isAr
                ? `نتائج البحث المباشر عن: "${activeTab.target.query}"`
                : `Live web search for: "${activeTab.target.query}"`}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleLaunchChrome()}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold cursor-pointer"
              >
                Google Chrome / Chromium
              </button>
              <a
                href={externalTargetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[#D6A63B] hover:brightness-110 text-slate-950 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>{isAr ? 'فتح في نافذة خارجية' : 'Open External'}</span>
              </a>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto os-scroll px-5 py-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {searchFeatured && (
                <div className="rounded-xl bg-[#0e1b2d] border border-[#D6A63B]/50 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-bold text-[#D6A63B]">{searchFeatured.title}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{searchFeatured.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openOsApp('store', { storeAppId: 'google-chrome' })}
                    className="px-4 py-2 rounded-lg bg-[#D6A63B] hover:brightness-110 text-slate-950 text-xs font-bold cursor-pointer shrink-0"
                  >
                    {searchFeatured.buttonLabel}
                  </button>
                </div>
              )}

              {searchLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-[#070b14] border border-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="rounded-xl bg-[#070b14] border border-slate-800 p-6 text-center space-y-3">
                  <p className="text-xs text-slate-300">
                    {isAr
                      ? `لم يتم العثور على نتائج فورية لـ "${activeTab.target.query}". يمكنك فتح البحث في نافذة خارجية.`
                      : `No instant results found for "${activeTab.target.query}".`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((item) => (
                    <article
                      key={item.url}
                      className="rounded-xl bg-[#070b14] hover:bg-[#0d1526] border border-slate-800 hover:border-[#2DD4BF]/40 p-4 space-y-1.5 transition-colors"
                    >
                      <div dir="ltr" className="text-[11px] font-mono-tabular text-[#2DD4BF] truncate">
                        {item.source} · {item.url}
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => navigateTab(item.url)}
                          className="text-sm font-bold text-sky-400 hover:text-sky-300 hover:underline text-start cursor-pointer"
                        >
                          {item.title}
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${item.title} externally`}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{item.snippet}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col bg-[#0B1120]">
          {/* Context Strip with External Fallback & WebKitGTK Re-open */}
          <div className="min-h-9 shrink-0 px-3 py-1.5 bg-[#070b14] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div dir="ltr" className="font-mono-tabular text-[11px] text-[#2DD4BF] truncate min-w-0 flex-1">
              {iframeLoading
                ? `${isAr ? 'جاري التحميل:' : 'Loading:'} ${externalTargetUrl}`
                : externalTargetUrl}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {tauriMode && (
                <button
                  type="button"
                  onClick={() => launchNativeWebWindow(activeTab.target)}
                  className="px-2.5 py-1 rounded-lg bg-[#2DD4BF] hover:brightness-110 text-slate-950 text-[11px] font-bold cursor-pointer"
                >
                  {isAr ? 'نافذة WebKitGTK' : 'WebKitGTK Window'}
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleLaunchChrome()}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold cursor-pointer"
              >
                Google Chrome
              </button>

              {!tauriMode && (
                <a
                  href={externalTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-[#D6A63B] hover:brightness-110 text-slate-950 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{isAr ? 'فتح في نافذة خارجية' : 'Open External'}</span>
                </a>
              )}
            </div>
          </div>

          {tauriMode ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#070b14] border border-[#2DD4BF]/35 flex items-center justify-center">
                <Globe className="w-6 h-6 text-[#2DD4BF]" />
              </div>
              <div className="space-y-1 max-w-lg">
                <h2 className="text-sm font-bold text-white">
                  {isAr ? 'تم توجيه الصفحة إلى محرك WebKitGTK الحقيقي' : 'Opened in Native WebKitGTK Engine'}
                </h2>
                <p dir="ltr" className="text-xs font-mono-tabular text-[#2DD4BF] break-all">
                  {externalTargetUrl}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => launchNativeWebWindow(activeTab.target)}
                  className="px-4 py-2 rounded-xl bg-[#2DD4BF] hover:brightness-110 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  {isAr ? 'إعادة فتح نافذة المتصفح الحقيقية' : 'Re-open WebKitGTK Window'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleLaunchChrome()}
                  className="px-4 py-2 rounded-xl bg-[#D6A63B] hover:brightness-110 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  {isAr ? 'فتح أو تثبيت Google Chrome' : 'Open / Install Google Chrome'}
                </button>
              </div>
            </div>
          ) : iframeError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <p className="text-sm text-slate-300">
                {isAr
                  ? 'تعذر عرض هذه الصفحة داخل الإطار المدمج، يمكنك فتحها مباشرة في نافذة خارجية.'
                  : 'Unable to render this page inside the embedded frame.'}
              </p>
              <a
                href={externalTargetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#D6A63B] text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isAr ? 'فتح في نافذة خارجية' : 'Open in External Window'}</span>
              </a>
            </div>
          ) : (
            iframeSrc && (
              <iframe
                key={`${activeTab.id}-${iframeSrc}`}
                src={iframeSrc}
                title={activeTab.title}
                onLoad={() => setIframeLoading(false)}
                onError={() => {
                  setIframeLoading(false);
                  setIframeError(true);
                }}
                className="w-full h-full flex-1 min-h-0 border-0 bg-white"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
