import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calculator,
  Command,
  FileText,
  Globe,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { APP_CATALOG } from '../apps/appCatalog';
import { APP_ICONS, openInstalledStoreApp, openOsApp } from '../apps/registry';
import { t } from '../system/i18n';
import { searchSystemEverything, type UnifiedSearchResult } from '../system/searchEngine';
import { useSettingsStore } from '../system/settingsStore';
import { searchNodes } from '../vfs/treeOps';
import { useVfsStore } from '../vfs/vfsStore';

interface SearchFlyoutProps {
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onLock: () => void;
  onSleep: () => void;
  onRestart: () => void;
}

type SearchFilter = 'all' | 'app' | 'file' | 'web';

export function SearchFlyout({
  query,
  onQueryChange,
  onClose,
  onLock,
  onSleep,
  onRestart,
}: SearchFlyoutProps) {
  const tree = useVfsStore((s) => s.tree);
  const language = useSettingsStore((s) => s.language);
  const taskbarPosition = useSettingsStore((s) => s.taskbarPosition);
  const taskbarAlignment = useSettingsStore((s) => s.taskbarAlignment);
  const pinnedWebApps = useSettingsStore((s) => s.pinnedWebApps);
  const installedStoreApps = useSettingsStore((s) => s.installedStoreApps);

  const [filter, setFilter] = useState<SearchFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const vfsFiles = useMemo(
    () =>
      searchNodes(tree, '', 60)
        .filter((e) => e.node.type === 'file')
        .map((e) => ({ name: e.node.name, path: e.path })),
    [tree]
  );

  const allResults = useMemo(
    () => searchSystemEverything(query, APP_CATALOG, vfsFiles, pinnedWebApps, installedStoreApps),
    [query, vfsFiles, pinnedWebApps, installedStoreApps]
  );

  const filteredResults = useMemo(() => {
    if (filter === 'all') return allResults;
    if (filter === 'app') {
      return allResults.filter(
        (r) => r.kind === 'app' || r.kind === 'storeapp' || r.kind === 'command'
      );
    }
    if (filter === 'file') return allResults.filter((r) => r.kind === 'file');
    return allResults.filter((r) => r.kind === 'web' || r.kind === 'webapp');
  }, [allResults, filter]);

  const activeResult =
    filteredResults.find((r) => r.id === selectedId) ?? filteredResults[0] ?? null;

  const executeResult = (item: UnifiedSearchResult) => {
    if (item.commandAction === 'lock') {
      onClose();
      onLock();
      return;
    }
    if (item.commandAction === 'sleep') {
      onClose();
      onSleep();
      return;
    }
    if (item.commandAction === 'restart') {
      onClose();
      onRestart();
      return;
    }
    if (item.commandAction === 'settings-network') {
      openOsApp('settings', { initialTab: 'network' });
      onClose();
      return;
    }
    if (item.commandAction === 'settings-language') {
      openOsApp('settings', { initialTab: 'time' });
      onClose();
      return;
    }
    if (item.commandAction === 'settings-power') {
      openOsApp('settings', { initialTab: 'power' });
      onClose();
      return;
    }

    if (item.kind === 'storeapp' && item.storeAppId) {
      const sa = installedStoreApps.find((s) => s.id === item.storeAppId);
      if (sa) {
        void openInstalledStoreApp(sa);
      } else {
        openOsApp('store', { storeAppId: item.storeAppId });
      }
      onClose();
      return;
    }

    if (item.kind === 'file' && item.filePath) {
      openOsApp('editor', { filePath: item.filePath, storageMode: 'vfs' });
      onClose();
      return;
    }

    if ((item.kind === 'web' || item.kind === 'webapp') && item.url) {
      openOsApp('browser', { initialUrl: item.url });
      onClose();
      return;
    }

    if (item.appId) {
      openOsApp(item.appId);
      onClose();
    }
  };

  const posClass =
    taskbarPosition === 'top'
      ? taskbarAlignment === 'center'
        ? 'top-10 left-1/2 -translate-x-1/2'
        : language === 'ar'
          ? 'top-10 right-11'
          : 'top-10 left-11'
      : taskbarAlignment === 'center'
        ? 'bottom-10 left-1/2 -translate-x-1/2'
        : language === 'ar'
          ? 'bottom-10 right-11'
          : 'bottom-10 left-11';

  return (
    <section
      role="dialog"
      aria-label={t(language, 'searchPanelTitle')}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      onMouseDown={(e) => e.stopPropagation()}
      className={`fixed ${posClass} z-[9992] w-[min(94vw,660px)] h-[460px] rounded-lg os-acrylic os-flyout-enter border border-slate-700/80 overflow-hidden flex flex-col`}
    >
      {/* Top Filter & Query Header */}
      <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-950/70">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && activeResult) {
                  e.preventDefault();
                  executeResult(activeResult);
                } else if (e.key === 'Escape') {
                  onClose();
                }
              }}
              placeholder={t(language, 'searchPlaceholder')}
              aria-label={t(language, 'searchPanelTitle')}
              className="w-full bg-slate-900 border border-slate-700 focus:border-[var(--os-accent-hover)] rounded-sm ps-9 pe-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Search"
            className="p-2 rounded-sm text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {(
            [
              { id: 'all', label: language === 'ar' ? 'الكل' : 'All' },
              { id: 'app', label: language === 'ar' ? 'التطبيقات' : 'Apps' },
              { id: 'file', label: language === 'ar' ? 'المستندات' : 'Documents' },
              { id: 'web', label: language === 'ar' ? 'الويب' : 'Web' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${
                filter === tab.id
                  ? 'os-accent-bg text-white'
                  : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results & Preview Split */}
      <div className="flex-1 min-h-0 flex">
        {/* Left List */}
        <div className="w-1/2 border-e border-slate-800 overflow-y-auto os-scroll p-2 space-y-1">
          {filteredResults.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              {language === 'ar' ? 'لا توجد نتائج مطابقة.' : 'No matching items found.'}
            </div>
          ) : (
            filteredResults.map((item) => {
              const isSelected = activeResult?.id === item.id;
              const AppIcon = item.appId ? APP_ICONS[item.appId] : null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedId(item.id)}
                  onClick={() => executeResult(item)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-start transition-colors ${
                    isSelected
                      ? 'os-accent-soft-bg text-white border border-[var(--os-accent-border)]'
                      : 'text-slate-200 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <div className="w-7 h-7 rounded-sm bg-slate-800 flex items-center justify-center shrink-0">
                    {item.kind === 'math' ? (
                      <Calculator className="w-4 h-4 os-accent-text" />
                    ) : item.kind === 'file' ? (
                      <FileText className="w-4 h-4 text-sky-400" />
                    ) : item.kind === 'command' ? (
                      <Command className="w-4 h-4 text-amber-400" />
                    ) : item.kind === 'web' || item.kind === 'webapp' ? (
                      <Globe className="w-4 h-4 text-emerald-400" />
                    ) : AppIcon ? (
                      <AppIcon className="w-4 h-4 os-accent-text" />
                    ) : (
                      <Sparkles className="w-4 h-4 os-accent-text" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{item.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Preview Card */}
        <div className="w-1/2 p-4 flex flex-col justify-between bg-slate-950/45">
          {activeResult ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-sm os-accent-soft-bg border border-[var(--os-accent-border)] flex items-center justify-center shrink-0">
                  {activeResult.appId ? (
                    (() => {
                      const Icon = APP_ICONS[activeResult.appId];
                      return <Icon className="w-5 h-5 os-accent-text" />;
                    })()
                  ) : (
                    <Command className="w-5 h-5 os-accent-text" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {activeResult.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wide">
                    {activeResult.kind}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-sm bg-slate-900/90 border border-slate-800 text-xs text-slate-300 break-words">
                {activeResult.subtitle}
              </div>

              <button
                type="button"
                onClick={() => executeResult(activeResult)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-sm os-accent-bg text-xs font-medium text-white transition-colors"
              >
                <span>{language === 'ar' ? 'فتح' : 'Open'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              {language === 'ar'
                ? 'ابدأ الكتابة للبحث في التطبيقات والملفات والأوامر.'
                : 'Start typing to search apps, files, math, and commands.'}
            </div>
          )}

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
            {language === 'ar'
              ? 'تلميح: جرب كتابة عملية حسابية مثل 24 * 8'
              : 'Tip: Try typing math like 24 * 8 or "wifi"'}
          </div>
        </div>
      </div>
    </section>
  );
}
