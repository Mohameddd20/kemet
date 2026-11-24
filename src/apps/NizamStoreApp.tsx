import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Code2,
  Cpu,
  Download,
  ExternalLink,
  Film,
  Gamepad2,
  Globe,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useNotificationStore } from '../system/notificationStore';
import { useSettingsStore, type InstalledStoreApp } from '../system/settingsStore';
import { installStorePackage, launchExternalLinuxApp } from '../system/systemBridge';
import { launchApp } from '../windowManager/launcher';
import type { WindowAppProps } from '../windowManager/types';
import { STORE_CATALOG, type StoreCatalogItem, type StoreCategoryId } from './storeCatalog';

const CATEGORIES: Array<{
  id: StoreCategoryId;
  label: string;
  arabicLabel: string;
  icon: typeof ShoppingBag;
}> = [
  { id: 'all', label: 'Discover', arabicLabel: 'استكشاف', icon: Sparkles },
  { id: 'browsers', label: 'Browsers', arabicLabel: 'المتصفحات', icon: Globe },
  { id: 'media', label: 'Media & Design', arabicLabel: 'الوسائط والتصميم', icon: Film },
  { id: 'dev', label: 'Developer Tools', arabicLabel: 'أدوات البرمجة', icon: Code2 },
  { id: 'gaming', label: 'Gaming & Emulators', arabicLabel: 'الألعاب والمحاكيات', icon: Gamepad2 },
  { id: 'compatibility', label: 'Wine & Proton', arabicLabel: 'تشغيل ويندوز', icon: Cpu },
];

export function NizamStoreApp({ storeAppId }: WindowAppProps) {
  const language = useSettingsStore((s) => s.language);
  const installedStoreApps = useSettingsStore((s) => s.installedStoreApps);
  const installStoreApp = useSettingsStore((s) => s.installStoreApp);
  const uninstallStoreApp = useSettingsStore((s) => s.uninstallStoreApp);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const [category, setCategory] = useState<StoreCategoryId>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const installedIds = useMemo(
    () => new Set(installedStoreApps.map((a) => a.id)),
    [installedStoreApps]
  );

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return STORE_CATALOG.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (storeAppId && !q && category === 'all') {
        // Prioritize searched or focused item if opened from Search
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.arabicName.includes(search.trim()) ||
        item.description.toLowerCase().includes(q) ||
        item.packageName.toLowerCase().includes(q)
      );
    });
  }, [category, search, storeAppId]);

  const handleInstall = async (item: StoreCatalogItem) => {
    setBusyId(item.id);
    setStatusNote(null);
    try {
      const res = await installStorePackage(item.packageName);
      installStoreApp({
        id: item.id,
        name: item.name,
        arabicName: item.arabicName,
        category: item.category,
        packageName: item.packageName,
        binary: item.binary,
        launchMode: item.launchMode,
        launchUrl: item.launchUrl,
        badgeText: item.badgeText,
        accentBg: item.accentBg,
        hostNote: res.note,
      });
      setStatusNote(res.note ?? `${item.name} installed.`);
      pushNotification(
        language === 'ar' ? `تم تثبيت ${item.arabicName}` : `Installed ${item.name}`,
        res.note ?? 'Added to Desktop Shortcuts and Start Menu.',
        'system'
      );
    } catch (err) {
      setStatusNote(err instanceof Error ? err.message : 'Installation failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleUninstall = (item: StoreCatalogItem) => {
    uninstallStoreApp(item.id);
    pushNotification(
      language === 'ar' ? `تمت إزالة ${item.arabicName}` : `Removed ${item.name}`,
      'Removed from NizamOS Desktop & Start Menu.',
      'system'
    );
  };

  const handleOpenApp = async (item: StoreCatalogItem | InstalledStoreApp) => {
    const native = await launchExternalLinuxApp(item.binary);
    if (native.ok) {
      pushNotification('Launched Native App', `Started ${item.name} (${item.binary}).`, 'system');
      return;
    }
    if (item.launchMode === 'web' && item.launchUrl) {
      launchApp('browser', { initialUrl: item.launchUrl });
      return;
    }
    if (item.launchMode === 'tauri') {
      launchApp('media');
      return;
    }
    launchApp('terminal', { storageMode: 'host' });
    pushNotification(
      item.name,
      `Opened Host Terminal. Run "${item.binary}" directly inside native Linux / ISO.`,
      'system'
    );
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="flex h-full bg-slate-900 text-slate-100"
    >
      {/* Store Category Sidebar */}
      <aside className="w-52 shrink-0 border-e border-slate-800 bg-slate-950/70 p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
          <div className="w-7 h-7 rounded-md os-accent-bg flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {language === 'ar' ? 'متجر Nizam' : 'Nizam Store'}
            </div>
            <div className="text-[10px] text-slate-400">
              {installedStoreApps.length} {language === 'ar' ? 'مثبت' : 'installed'}
            </div>
          </div>
        </div>

        <div className="space-y-0.5 flex-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-xs font-medium text-start transition-colors ${
                  active
                    ? 'os-accent-soft-bg os-accent-text'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {language === 'ar' ? cat.arabicLabel : cat.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-800 px-2 text-[11px] text-slate-500">
          {language === 'ar'
            ? 'حزم APT / Flatpak / Wine'
            : 'APT · Flatpak · Wine Bridge'}
        </div>
      </aside>

      {/* Main Store Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/40">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'ابحث عن متصفحات، ألعاب، أو محاكي Wine...'
                  : 'Search Chrome, VLC, VS Code, Wine, Steam...'
              }
              aria-label="Search Nizam Store"
              className="w-full bg-slate-950 border border-slate-800 focus:border-[var(--os-accent-hover)] rounded-sm ps-9 pe-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <span className="text-[11px] text-slate-400 font-mono-tabular shrink-0">
            {visibleItems.length} {language === 'ar' ? 'تطبيق' : 'packages'}
          </span>
        </div>

        {statusNote && (
          <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800 text-[11px] text-sky-300 font-mono">
            {statusNote}
          </div>
        )}

        <div className="flex-1 overflow-y-auto os-scroll p-4 space-y-5">
          {/* Featured Gaming & Wine Hero */}
          {category === 'all' && !search.trim() && (
            <div className="p-4 rounded-md bg-gradient-to-r from-slate-950 via-sky-950/70 to-indigo-950/80 border border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-lg">
                <div className="text-[11px] font-semibold uppercase tracking-wider os-accent-text">
                  {language === 'ar' ? 'بيئة الألعاب وبرامج ويندوز' : 'Gaming & Windows Compatibility'}
                </div>
                <h3 className="text-sm font-semibold text-white">
                  {language === 'ar'
                    ? 'شغّل تطبيقات .exe وألعاب Linux بضغطة زر'
                    : 'Run .exe Windows Apps, RetroArch & Steam via Wine + Proton'}
                </h3>
                <p className="text-xs text-slate-300">
                  {language === 'ar'
                    ? 'ثبت البرامج لتظهر مباشرة في قائمة ابدأ وعلى سطح المكتب.'
                    : 'Installed packages register directly on your Desktop, Start Menu, and System Search.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCategory('gaming')}
                className="px-3.5 py-2 rounded-sm os-accent-bg text-xs font-medium text-white shrink-0 whitespace-nowrap"
              >
                {language === 'ar' ? 'استكشف الألعاب' : 'Browse Gaming'}
              </button>
            </div>
          )}

          {/* Package Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleItems.map((item) => {
              const isInstalled = installedIds.has(item.id);
              const isBusy = busyId === item.id;
              return (
                <article
                  key={item.id}
                  className="flex flex-col justify-between p-3.5 rounded-md bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-md bg-gradient-to-br ${item.accentBg} flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md`}
                    >
                      {item.badgeText}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="text-xs font-semibold text-slate-100 truncate">
                          {language === 'ar' ? item.arabicName : item.name}
                        </h4>
                        {isInstalled && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.publisher} · {item.version}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                        {language === 'ar' ? item.arabicDescription : item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2 min-w-0">
                    <span className="text-[11px] text-slate-500 font-mono-tabular truncate min-w-0">
                      {item.packageName} · {item.sizeLabel}
                    </span>

                    {isInstalled ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleOpenApp(item)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-emerald-600 hover:bg-emerald-500 text-[11px] font-medium text-white whitespace-nowrap"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{language === 'ar' ? 'فتح' : 'Open'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUninstall(item)}
                          aria-label={`Uninstall ${item.name}`}
                          className="p-1.5 rounded-sm bg-slate-800 hover:bg-red-950/70 text-slate-300 hover:text-red-300 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleInstall(item)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-sm os-accent-bg text-[11px] font-medium text-white disabled:opacity-50 shrink-0 whitespace-nowrap"
                      >
                        <Download className="w-3 h-3" />
                        <span>
                          {isBusy
                            ? language === 'ar'
                              ? 'جاري...'
                              : 'Installing...'
                            : language === 'ar'
                              ? 'تثبيت'
                              : 'Install'}
                        </span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
