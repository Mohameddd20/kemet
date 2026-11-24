import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  Calculator,
  Camera,
  Cpu,
  Download,
  FileText,
  Film,
  FolderOpen,
  Gamepad2,
  Globe,
  Info,
  Layers,
  Lock,
  LogOut,
  Moon,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Terminal,
  Video,
} from 'lucide-react';
import type { AppId, WindowAppProps } from '../../windowManager/types';
import { useSettingsStore } from '../../system/settingsStore';
import {
  fetchHostRoots,
  launchNativeApp,
  listDirectory,
  runPowerAction,
  type HostFsEntry,
  type PowerActionType,
} from '../../services/systemBridge';
import { useNotificationStore } from '../../system/notificationStore';
import { searchSystemEverything } from '../../system/searchEngine';
import { APP_CATALOG } from '../../apps/appCatalog';
import { openBrowserOrChromeStore } from '../../apps/registry';
import { KemetLogo } from './KemetLogo';

interface KemetPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApp: (appId: AppId, props?: Omit<WindowAppProps, 'windowId'>) => void;
  onPowerUiAction: (action: PowerActionType) => void;
}

interface PortalAppTile {
  id: string;
  labelAr: string;
  labelEn: string;
  favorite: boolean;
  appId?: AppId;
  nativeBin?: string;
  storePackageId?: string;
  icon: typeof FolderOpen;
  gradient: string;
}

const PORTAL_APPS: PortalAppTile[] = [
  { id: 'files', labelAr: 'مدير الملفات', labelEn: 'Files', favorite: true, appId: 'files', icon: FolderOpen, gradient: 'from-amber-400 to-amber-600' },
  { id: 'browser', labelAr: 'متصفح كيميت', labelEn: 'Kemet Browser', favorite: true, appId: 'browser', icon: Globe, gradient: 'from-cyan-400 to-blue-600' },
  { id: 'store', labelAr: 'متجر كيميت', labelEn: 'Kemet Store', favorite: true, appId: 'store', icon: ShoppingBag, gradient: 'from-emerald-400 to-teal-600' },
  { id: 'terminal', labelAr: 'التيرمينال', labelEn: 'Terminal', favorite: true, appId: 'terminal', icon: Terminal, gradient: 'from-slate-700 to-slate-900' },
  { id: 'hardware', labelAr: 'مركز التعريفات', labelEn: 'Driver Center', favorite: true, appId: 'hardware', icon: Cpu, gradient: 'from-amber-500 to-orange-600' },
  { id: 'updates', labelAr: 'مدير التحديثات', labelEn: 'Update Manager', favorite: true, appId: 'updates', icon: RefreshCw, gradient: 'from-teal-500 to-cyan-600' },
  { id: 'compatibility', labelAr: 'مركز التوافق والمحاكاة', labelEn: 'Compatibility Center', favorite: true, appId: 'compatibility', icon: Layers, gradient: 'from-amber-400 to-teal-600' },
  { id: 'settings', labelAr: 'الإعدادات', labelEn: 'Settings', favorite: true, appId: 'settings', icon: Settings, gradient: 'from-indigo-500 to-slate-700' },
  { id: 'editor', labelAr: 'محرر النصوص', labelEn: 'Text Editor', favorite: true, appId: 'editor', icon: FileText, gradient: 'from-teal-400 to-emerald-600' },
  { id: 'taskmgr', labelAr: 'مراقب النظام', labelEn: 'System Monitor', favorite: true, appId: 'taskmgr', icon: Activity, gradient: 'from-emerald-500 to-green-700' },
  { id: 'calculator', labelAr: 'الآلة الحاسبة', labelEn: 'Calculator', favorite: true, appId: 'calculator', icon: Calculator, gradient: 'from-sky-500 to-indigo-600' },
  { id: 'media', labelAr: 'مشغل الوسائط', labelEn: 'Media Player', favorite: false, appId: 'media', icon: Film, gradient: 'from-rose-500 to-pink-600' },
  { id: 'camera', labelAr: 'الكاميرا', labelEn: 'Camera', favorite: false, appId: 'camera', icon: Camera, gradient: 'from-violet-500 to-purple-700' },
  { id: 'welcome', labelAr: 'ترحيب KemetOS', labelEn: 'Welcome Guide', favorite: true, appId: 'welcome', icon: Sparkles, gradient: 'from-amber-400 to-yellow-600' },
  { id: 'learn', labelAr: 'التعلّم مع كيميت', labelEn: 'Learn KemetOS', favorite: false, appId: 'learn', icon: BookOpen, gradient: 'from-blue-500 to-indigo-600' },
  { id: 'about', labelAr: 'عن KemetOS', labelEn: 'About KemetOS', favorite: false, appId: 'about', icon: Info, gradient: 'from-cyan-500 to-slate-700' },
  { id: 'chrome', labelAr: 'Google Chrome', labelEn: 'Google Chrome', favorite: true, nativeBin: 'google-chrome', storePackageId: 'chrome', icon: Globe, gradient: 'from-amber-500 to-red-500' },
  { id: 'steam', labelAr: 'Steam', labelEn: 'Steam Gaming', favorite: true, nativeBin: 'steam', storePackageId: 'steam', icon: Gamepad2, gradient: 'from-blue-700 to-slate-900' },
  { id: 'vlc', labelAr: 'VLC Player', labelEn: 'VLC', favorite: false, nativeBin: 'vlc', storePackageId: 'vlc', icon: Video, gradient: 'from-orange-500 to-amber-600' },
  { id: 'obs', labelAr: 'OBS Studio', labelEn: 'OBS Studio', favorite: false, nativeBin: 'obs', storePackageId: 'obs', icon: Video, gradient: 'from-slate-800 to-slate-950' },
];

export function KemetPortal({
  isOpen,
  onClose,
  onOpenApp,
  onPowerUiAction,
}: KemetPortalProps) {
  const language = useSettingsStore((s) => s.language);
  const username = useSettingsStore((s) => s.username);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'favorites' | 'all'>('favorites');
  const [missingNativePrompt, setMissingNativePrompt] = useState<PortalAppTile | null>(null);
  const [hostFiles, setHostFiles] = useState<HostFsEntry[]>([]);

  const isAr = language === 'ar';

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void fetchHostRoots()
      .then((roots) => Promise.all([listDirectory(roots.homeDir), listDirectory(roots.documentsDir).catch(() => null)]))
      .then(([homeRes, docsRes]) => {
        if (!active) return;
        const combined = [...(homeRes?.items ?? []), ...(docsRes?.items ?? [])].filter(
          (i) => !i.name.startsWith('.')
        );
        setHostFiles(combined);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isOpen]);

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PORTAL_APPS.filter((item) => {
      if (!q && tab === 'favorites' && !item.favorite) return false;
      if (!q) return true;
      return (
        item.labelAr.toLowerCase().includes(q) ||
        item.labelEn.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [query, tab]);

  // Local Search across files & settings commands when user types a query
  const localFileAndSettingsMatches = useMemo(() => {
    if (!query.trim()) return [];
    const results = searchSystemEverything(
      query,
      APP_CATALOG.map((a) => ({
        id: a.id,
        title: a.title,
        arabicTitle: a.arabicTitle,
        description: a.description,
      })),
      hostFiles.map((f) => ({ name: f.name, path: f.path })),
      []
    );
    return results.filter((r) => r.kind === 'file' || r.kind === 'command' || r.kind === 'math').slice(0, 6);
  }, [query, hostFiles]);

  if (!isOpen) return null;

  const handleTileClick = async (tile: PortalAppTile) => {
    if (tile.id === 'browser' || tile.id === 'chrome') {
      await openBrowserOrChromeStore();
      onClose();
      return;
    }

    if (tile.appId) {
      onOpenApp(tile.appId);
      onClose();
      return;
    }

    if (tile.nativeBin) {
      const res = await launchNativeApp(tile.nativeBin);
      if (res.ok) {
        pushNotification(
          tile.labelEn,
          isAr ? `تم تشغيل ${tile.labelAr} كنافذة لينكس حقيقية.` : `Launched native ${tile.labelEn}.`,
          'system'
        );
        onClose();
        return;
      }
      setMissingNativePrompt(tile);
    }
  };

  const triggerPower = async (action: PowerActionType) => {
    await runPowerAction(action);
    onPowerUiAction(action);
    onClose();
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-[#070b14]/75 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto os-scroll rounded-3xl bg-[#0B1120] border border-amber-400/30 shadow-2xl"
      >
        {/* Top Search & Tabs */}
        <div className="p-5 border-b border-slate-800/80 space-y-4">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-cyan-300 absolute right-4 rtl:right-4 ltr:left-4 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isAr
                  ? 'ابحث محلياً في التطبيقات والملفات والإعدادات...'
                  : 'Search local apps, files & settings...'
              }
              className="w-full bg-[#070b14] border border-cyan-400/45 focus:border-amber-400 rounded-2xl py-3 pr-11 pl-4 rtl:pr-11 rtl:pl-4 ltr:pl-11 ltr:pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab('favorites')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  tab === 'favorites'
                    ? 'bg-gradient-to-l from-amber-500 to-amber-400 text-slate-950'
                    : 'bg-[#070b14] text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {isAr ? 'المفضلة' : 'Favorites'}
              </button>
              <button
                type="button"
                onClick={() => setTab('all')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  tab === 'all'
                    ? 'bg-gradient-to-l from-cyan-500 to-teal-400 text-slate-950'
                    : 'bg-[#070b14] text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {isAr ? `كل التطبيقات (${PORTAL_APPS.length})` : `All Apps (${PORTAL_APPS.length})`}
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-mono-tabular hidden sm:inline">
              Super / Alt + Space
            </span>
          </div>
        </div>

        {/* Missing Native Binary Smart Install Prompt */}
        {missingNativePrompt && (
          <div className="mx-5 mt-4 rounded-2xl bg-amber-500/10 border border-amber-400/35 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-amber-100">
              <strong className="text-amber-300">{missingNativePrompt.labelEn}</strong>:{' '}
              {isAr
                ? 'غير مثبت على النظام بعد. افتح متجر كيميت لتثبيت الحزمة الحقيقية بنقرة واحدة.'
                : 'Not installed on host yet. Open Kemet Store for 1-click installation.'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenApp('store', { storeAppId: missingNativePrompt.storePackageId });
                  setMissingNativePrompt(null);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تثبيت من متجر كيميت' : 'Install via Kemet Store'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMissingNativePrompt(null)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Dismiss'}
              </button>
            </div>
          </div>
        )}

        {/* Instant Local Search Results (Files & Settings) */}
        {localFileAndSettingsMatches.length > 0 && (
          <div className="px-5 pt-4 space-y-1.5">
            <div className="text-[11px] font-bold text-cyan-300">
              {isAr ? 'الملفات وأوامر النظام المطابقة' : 'Matching Local Files & Settings'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {localFileAndSettingsMatches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (m.kind === 'file' && m.filePath) {
                      onOpenApp('files', { initialDir: m.filePath.split('/').slice(0, -1).join('/') });
                    } else if (m.commandAction === 'lock') {
                      void triggerPower('lock');
                      return;
                    } else if (m.commandAction === 'restart') {
                      void triggerPower('reboot');
                      return;
                    } else if (m.commandAction === 'sleep') {
                      void triggerPower('sleep');
                      return;
                    } else if (m.commandAction?.startsWith('settings-')) {
                      onOpenApp('settings', {
                        initialTab: m.commandAction === 'settings-network' ? 'network' : 'performance',
                      });
                    } else if (m.appId) {
                      onOpenApp(m.appId);
                    }
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl bg-[#070b14] hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs cursor-pointer"
                >
                  <span className="truncate font-semibold text-white">{m.title}</span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{m.subtitle}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6-Column SVG App Grid */}
        <div className="p-5 grid grid-cols-3 sm:grid-cols-6 gap-3 max-h-[360px] overflow-y-auto os-scroll">
          {filteredApps.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => void handleTileClick(tile)}
                className="group flex flex-col items-center justify-center gap-2.5 p-3 rounded-2xl bg-[#070b14]/85 hover:bg-amber-400/10 border border-slate-800/80 hover:border-amber-400/40 transition-colors cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tile.gradient} flex items-center justify-center shadow-lg`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200 group-hover:text-amber-200 text-center leading-tight line-clamp-2">
                  {isAr ? tile.labelAr : tile.labelEn}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom User Identity & Power Strip */}
        <div className="px-5 py-3.5 bg-[#070b14] border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <KemetLogo className="w-8 h-8 rounded-lg border border-amber-400/35" />
            <div>
              <div className="text-xs font-bold text-white">{username || 'kemet'}@kemetos</div>
              <div className="text-[10px] text-cyan-400">KemetOS 1.0 Sovereign Shell</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void triggerPower('lock')}
              title={isAr ? 'قفل الجلسة' : 'Lock Session'}
              className="p-2 rounded-xl bg-slate-900 hover:bg-amber-400/20 border border-slate-800 text-slate-300 hover:text-amber-300 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void triggerPower('logout')}
              title={isAr ? 'تسجيل الخروج' : 'Log Out'}
              className="p-2 rounded-xl bg-slate-900 hover:bg-cyan-400/20 border border-slate-800 text-slate-300 hover:text-cyan-300 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void triggerPower('sleep')}
              title={isAr ? 'وضع السكون' : 'Sleep'}
              className="p-2 rounded-xl bg-slate-900 hover:bg-indigo-400/20 border border-slate-800 text-slate-300 hover:text-indigo-300 cursor-pointer"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void triggerPower('reboot')}
              title={isAr ? 'إعادة التشغيل' : 'Restart'}
              className="p-2 rounded-xl bg-slate-900 hover:bg-amber-400/20 border border-slate-800 text-slate-300 hover:text-amber-300 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void triggerPower('poweroff')}
              title={isAr ? 'إيقاف التشغيل' : 'Power Off'}
              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/25 border border-slate-800 text-slate-300 hover:text-rose-300 cursor-pointer"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
