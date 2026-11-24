import { memo, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Globe,
  Home,
  Layers,
  LayoutGrid,
  Package,
  Play,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { useSettingsStore } from '../../system/settingsStore';
import {
  installBundle,
  installGoogleChrome,
  installRealApp,
  isAppInstalled,
  launchNativeApp,
  uninstallStorePackage,
} from '../../services/systemBridge';
import { useNotificationStore } from '../../system/notificationStore';
import { openOsApp } from '../../apps/registry';
import type { WindowAppProps } from '../../windowManager/types';
import { AppVectorIcon } from './AppVectorIcons';

type StoreNavTab =
  | 'home'
  | 'packages'
  | 'categories'
  | 'packs'
  | 'installed'
  | 'updates'
  | 'history'
  | 'settings';

type StoreCategoryFilter =
  | 'All'
  | 'Browsers'
  | 'Development'
  | 'Office'
  | 'Creative'
  | 'Multimedia'
  | 'Gaming'
  | 'System';

interface StoreCatalogItem {
  id: string;
  name: string;
  arabicName: string;
  windowsEquivalent?: string;
  alternativeHint?: string;
  category: Exclude<StoreCategoryFilter, 'All'>;
  packageName: string;
  binary: string;
  launchMode: 'web' | 'terminal' | 'tauri' | 'emulator' | 'builtin';
  builtinAppId?: 'taskmgr' | 'browser' | 'editor';
  launchUrl?: string;
  descriptionAr: string;
  descriptionEn: string;
}

const WINDOWS_ALTERNATIVES: StoreCatalogItem[] = [
  {
    id: 'krita',
    name: 'Krita',
    arabicName: 'رسم وتصميم رقمي احترافي',
    windowsEquivalent: 'Adobe Photoshop',
    alternativeHint: 'GIMP',
    category: 'Creative',
    packageName: 'krita',
    binary: 'krita',
    launchMode: 'tauri',
    descriptionAr: 'رسم وتصميم رقمي احترافي وتعديل ملفات PSD.',
    descriptionEn: 'Digital painting and drawing.',
  },
  {
    id: 'libreoffice',
    name: 'LibreOffice',
    arabicName: 'مستندات وجداول وعروض تقديمية',
    windowsEquivalent: 'Microsoft Office',
    alternativeHint: 'ONLYOFFICE',
    category: 'Office',
    packageName: 'libreoffice',
    binary: 'libreoffice',
    launchMode: 'tauri',
    descriptionAr: 'مستندات وجداول وعروض تقديمية على جهازك.',
    descriptionEn: 'Documents, spreadsheets and presentations.',
  },
  {
    id: 'firefox',
    name: 'Firefox',
    arabicName: 'متصفح ومدير تحميلات سريع',
    windowsEquivalent: 'Internet Download Manager',
    alternativeHint: 'Chrome',
    category: 'Browsers',
    packageName: 'firefox-esr',
    binary: 'firefox',
    launchMode: 'web',
    launchUrl: 'https://duckduckgo.com',
    descriptionAr: 'متصفح سريع وآمن مع إدارة كاملة للتنزيلات.',
    descriptionEn: "Mozilla's browser, already on your PC.",
  },
  {
    id: 'ark',
    name: 'Ark',
    arabicName: 'فتح وضغط ملفات RAR و 7z و ZIP',
    windowsEquivalent: 'WinRAR',
    alternativeHint: 'RAR support',
    category: 'Office',
    packageName: 'ark',
    binary: 'ark',
    launchMode: 'tauri',
    descriptionAr: 'فتح وإنشاء ملفات zip و 7z و tar بسهولة.',
    descriptionEn: 'Open and create zip, 7z and tar archives.',
  },
  {
    id: 'kate',
    name: 'Kate',
    arabicName: 'محرر أكواد ونصوص متقدم',
    windowsEquivalent: 'Notepad++',
    alternativeHint: 'VS Code',
    category: 'Development',
    packageName: 'kate',
    binary: 'kate',
    launchMode: 'tauri',
    descriptionAr: 'محرر نصوص وأكواد سريع بتبويبات وتلوين برمجي.',
    descriptionEn: 'Syntax colours, tabs, familiar menus.',
  },
  {
    id: 'taskmgr',
    name: 'System Monitor',
    arabicName: 'مراقب النظام',
    windowsEquivalent: 'Task Manager',
    category: 'System',
    packageName: 'kemet-monitor',
    binary: 'kemet-monitor',
    launchMode: 'builtin',
    builtinAppId: 'taskmgr',
    descriptionAr: 'مراقبة التطبيقات والمعالج والذاكرة وإنهاء المهام.',
    descriptionEn: 'See running apps, CPU and memory.',
  },
];

const NATIVE_STORE_APPS: StoreCatalogItem[] = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    arabicName: 'متصفح جوجل كروم الرسمي',
    category: 'Browsers',
    packageName: 'google-chrome-stable',
    binary: 'google-chrome',
    launchMode: 'web',
    launchUrl: 'https://www.google.com/chrome/',
    descriptionAr: 'متصفح Google Chrome الرسمي لنظام Debian amd64 (بصيغة .deb).',
    descriptionEn: 'Official Google Chrome browser for Debian amd64.',
  },
  {
    id: 'chromium',
    name: 'Chromium Browser',
    arabicName: 'متصفح كروميوم (مثبت افتراضياً في الـ ISO)',
    category: 'Browsers',
    packageName: 'chromium',
    binary: 'chromium',
    launchMode: 'web',
    launchUrl: 'kemet://newtab',
    descriptionAr: 'متصفح Chromium السريع والمبني عليه Chrome — مدمج جاهزاً داخل KemetOS ISO.',
    descriptionEn: 'Fast open-source Chrome-engine browser pre-installed in KemetOS ISO.',
  },
  {
    id: 'steam',
    name: 'Steam',
    arabicName: 'منصة ألعاب ستيم + Proton',
    category: 'Gaming',
    packageName: 'steam',
    binary: 'steam',
    launchMode: 'emulator',
    descriptionAr: 'تشغيل ألعاب Steam و Windows عبر Proton و Vulkan.',
    descriptionEn: 'Native Steam client with Proton gaming support.',
  },
  {
    id: 'wine',
    name: 'Kemet Wine Engine',
    arabicName: 'محرك تشغيل برامج الويندوز (.exe)',
    category: 'Gaming',
    packageName: 'wine',
    binary: 'wine64',
    launchMode: 'emulator',
    descriptionAr: 'تشغيل ملفات Windows .exe و .msi بنقرة مزدوجة.',
    descriptionEn: 'Run Windows .exe/.msi applications natively.',
  },
  {
    id: 'vscode',
    name: 'VS Code',
    arabicName: 'محرر البرمجة Visual Studio Code',
    category: 'Development',
    packageName: 'code',
    binary: 'code',
    launchMode: 'tauri',
    descriptionAr: 'بيئة التطوير المتكاملة للويب و Python و Rust.',
    descriptionEn: 'Code editing redefined with integrated terminal.',
  },
  {
    id: 'vlc',
    name: 'VLC Media Player',
    arabicName: 'مشغل الفيديو والميديا VLC',
    category: 'Multimedia',
    packageName: 'vlc',
    binary: 'vlc',
    launchMode: 'tauri',
    descriptionAr: 'تشغيل جميع صيغ الفيديو 4K والترجمة العربية.',
    descriptionEn: 'Play any video and audio format effortlessly.',
  },
  {
    id: 'obs',
    name: 'OBS Studio',
    arabicName: 'تصوير الشاشة والبث المباشر',
    category: 'Multimedia',
    packageName: 'obs-studio',
    binary: 'obs',
    launchMode: 'tauri',
    descriptionAr: 'تسجيل الشاشة بجودة عالية وبث مباشر احترافي.',
    descriptionEn: 'High-performance screen recording and streaming.',
  },
];

const ALL_CATALOG = [...WINDOWS_ALTERNATIVES, ...NATIVE_STORE_APPS];

const QUICK_PACKS: Array<{
  id: 'coding' | 'gaming';
  heroTitleAr: string;
  heroTitleEn: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icons: string[];
  packages: string[];
}> = [
  {
    id: 'coding',
    heroTitleAr: 'ابدأ البرمجة اليوم',
    heroTitleEn: 'Start coding today',
    titleAr: 'حزمة البرمجة والتطوير',
    titleEn: 'Developer Stack',
    descAr: 'VS Code و Git و Python و Node.js جاهزة بضغطة واحدة.',
    descEn: 'VS Code, Git, Python and Node.js, ready with one click.',
    icons: ['vscode', 'git', 'python', 'nodejs'],
    packages: ['code', 'git', 'python3', 'nodejs'],
  },
  {
    id: 'gaming',
    heroTitleAr: 'شغّل الألعاب وبرامج ويندوز',
    heroTitleEn: 'Gaming & Windows ready',
    titleAr: 'حزمة الألعاب وبرامج Windows',
    titleEn: 'Windows & Gaming Pack',
    descAr: 'محرك Wine 64-bit مع Steam Proton و Google Chrome و VLC.',
    descEn: 'Wine 64-bit with Steam Proton, Chrome and VLC.',
    icons: ['steam', 'wine', 'chrome', 'vlc'],
    packages: ['wine', 'steam', 'vlc'],
  },
];

const CATEGORIES: Array<{ id: StoreCategoryFilter; labelAr: string; labelEn: string }> = [
  { id: 'All', labelAr: 'الكل', labelEn: 'All' },
  { id: 'Browsers', labelAr: 'المتصفحات', labelEn: 'Browsers' },
  { id: 'Development', labelAr: 'التطوير', labelEn: 'Development' },
  { id: 'Office', labelAr: 'المكتب', labelEn: 'Office' },
  { id: 'Creative', labelAr: 'التصميم', labelEn: 'Creative' },
  { id: 'Multimedia', labelAr: 'الوسائط', labelEn: 'Multimedia' },
  { id: 'Gaming', labelAr: 'الألعاب و Wine', labelEn: 'Gaming & Wine' },
  { id: 'System', labelAr: 'النظام', labelEn: 'System' },
];

const OFFICIAL_CHROME_DEB_URL =
  'https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb';

export const KemetStore = memo(function KemetStore({ storeAppId }: WindowAppProps) {
  const language = useSettingsStore((s) => s.language);
  const installStoreApp = useSettingsStore((s) => s.installStoreApp);
  const uninstallStoreApp = useSettingsStore((s) => s.uninstallStoreApp);
  const storeHistory = useSettingsStore((s) => s.storeHistory);
  const addStoreOperation = useSettingsStore((s) => s.addStoreOperation);
  const pendingUpdatesCount = useSettingsStore((s) => s.pendingUpdatesCount);
  const applyPendingUpdates = useSettingsStore((s) => s.applyPendingUpdates);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const isAr = language === 'ar';
  const normalizedFocusApp =
    storeAppId === 'google-chrome' || storeAppId === 'chrome' ? 'google-chrome' : null;

  const [selectedApp, setSelectedApp] = useState<string | null>(normalizedFocusApp);
  const [navTab, setNavTab] = useState<StoreNavTab>(
    storeAppId && !normalizedFocusApp ? 'packages' : 'home'
  );
  const [search, setSearch] = useState(
    storeAppId && !normalizedFocusApp ? storeAppId : ''
  );
  const [categoryFilter, setCategoryFilter] = useState<StoreCategoryFilter>('All');
  const [nativeInstalledMap, setNativeInstalledMap] = useState<Record<string, boolean>>({});
  const [probingHost, setProbingHost] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedPackId, setSelectedPackId] = useState<'coding' | 'gaming' | null>(null);
  const [bundleRunning, setBundleRunning] = useState(false);

  // Dedicated Google Chrome .deb installer state (strictly event-driven, zero fake timers)
  const [chromeInstalling, setChromeInstalling] = useState(false);
  const [chromeProgress, setChromeProgress] = useState<number>(0);
  const [chromeStage, setChromeStage] = useState<string>('');
  const [chromeLogs, setChromeLogs] = useState<string[]>([]);
  const [chromeNotice, setChromeNotice] = useState<string | null>(null);
  const [chromeRequiresTauri, setChromeRequiresTauri] = useState(false);
  const [chromeSizeMb, setChromeSizeMb] = useState<number | null>(null);

  useEffect(() => {
    if (storeAppId === 'google-chrome' || storeAppId === 'chrome') {
      setSelectedApp('google-chrome');
      setNavTab('home');
      setSearch('');
    } else if (storeAppId) {
      setSelectedApp(null);
      setNavTab('packages');
      setSearch(storeAppId);
    }
  }, [storeAppId]);

  const probeInstalledApps = async () => {
    setProbingHost(true);
    try {
      const entries = await Promise.all(
        ALL_CATALOG.map(async (item) => {
          if (item.launchMode === 'builtin') {
            return [item.id, true] as const;
          }
          const checkCmd = item.id === 'chrome' ? 'google-chrome-stable' : item.binary;
          const pkg = item.id === 'chrome' ? 'google-chrome-stable' : item.packageName;
          const check = await isAppInstalled(checkCmd, pkg);
          return [item.id, check.installed] as const;
        })
      );
      const map: Record<string, boolean> = {};
      for (const [id, ok] of entries) {
        map[id] = ok;
      }
      setNativeInstalledMap(map);
    } catch {
      // ignore probe errors
    } finally {
      setProbingHost(false);
    }
  };

  useEffect(() => {
    void probeInstalledApps();
  }, []);

  const installedSet = useMemo(() => {
    const set = new Set<string>(['taskmgr']);
    for (const [id, present] of Object.entries(nativeInstalledMap)) {
      if (present) set.add(id);
    }
    return set;
  }, [nativeInstalledMap]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_CATALOG.filter((item) => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.arabicName.toLowerCase().includes(q) ||
        (item.windowsEquivalent?.toLowerCase().includes(q) ?? false) ||
        item.packageName.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [categoryFilter, search]);

  const handleInstallGoogleChrome = async () => {
    setChromeInstalling(true);
    setChromeProgress(0);
    setChromeStage('');
    setChromeNotice(null);
    setChromeRequiresTauri(false);
    setChromeLogs([
      `$ curl -fL --progress-bar ${OFFICIAL_CHROME_DEB_URL} -o /tmp/google-chrome-stable_current_amd64.deb`,
    ]);

    try {
      const res = await installGoogleChrome((ev) => {
        if (ev.line) {
          setChromeLogs((prev) => [...prev.slice(-40), ev.line as string]);
        }
        if (typeof ev.progress === 'number') {
          setChromeProgress(ev.progress);
        }
        if (ev.stage) {
          setChromeStage(ev.stage);
        }
      });

      if (res.logs?.length) {
        setChromeLogs(res.logs);
      }
      if (typeof res.contentLengthMb === 'number') {
        setChromeSizeMb(res.contentLengthMb);
      }

      if (res.ok && res.nativeInstalled) {
        setNativeInstalledMap((prev) => ({ ...prev, chrome: true }));
        installStoreApp({
          id: 'chrome',
          name: 'Google Chrome',
          arabicName: 'متصفح جوجل كروم الرسمي',
          category: 'Browsers',
          packageName: 'google-chrome-stable',
          binary: 'google-chrome-stable',
          launchMode: 'web',
          launchUrl: 'https://www.google.com',
          badgeText: 'GC',
          accentBg: 'from-amber-500 to-emerald-500',
          hostNote: res.note,
        });
        addStoreOperation({
          title: isAr ? 'تثبيت Google Chrome الرسمي' : 'Install Google Chrome',
          command: 'pkexec apt-get install -y /tmp/google-chrome-stable_current_amd64.deb',
          status: 'completed',
          details: res.note ?? res.binaryPath ?? undefined,
        });
        setChromeNotice(
          res.messageAr ??
            (isAr
              ? 'تم تثبيت Google Chrome الرسمي بنجاح على النظام.'
              : 'Google Chrome installed successfully.')
        );
        pushNotification(
          'Google Chrome',
          res.messageAr ?? (isAr ? 'تم تثبيت Google Chrome بنجاح.' : 'Google Chrome installed.'),
          'system'
        );
      } else {
        setChromeRequiresTauri(Boolean(res.requiresTauriLinux));
        const fallbackMsg =
          res.messageAr ??
          res.error ??
          'التثبيت الفعلي لحزمة Google Chrome (.deb) يتطلب تشغيل KemetOS داخل بيئة Linux/Tauri، ويمكنك تحميل الحزمة الرسمية مباشرة من رابط Google الرسمي';
        setChromeNotice(fallbackMsg);
        addStoreOperation({
          title: isAr ? 'فحص تثبيت Google Chrome' : 'Google Chrome Install Check',
          command: `curl -I ${OFFICIAL_CHROME_DEB_URL}`,
          status: 'failed',
          details: fallbackMsg,
        });
        pushNotification('Google Chrome', fallbackMsg, 'system');
      }
    } finally {
      setChromeInstalling(false);
    }
  };

  const handleInstallItem = async (item: StoreCatalogItem) => {
    if (item.id === 'chrome') {
      setSelectedApp('google-chrome');
      await handleInstallGoogleChrome();
      return;
    }

    setBusyId(item.id);
    setInstallLogs([`[Kemet Store] Preparing ${item.name} (${item.packageName})...`]);
    try {
      const res = await installRealApp(item.id, (line) => {
        setInstallLogs((prev) => [...prev.slice(-20), line]);
      });
      if (res.logs?.length) {
        setInstallLogs((prev) => [...prev.slice(-10), ...(res.logs ?? [])]);
      }

      const actuallyInstalled = Boolean(res.ok && res.nativeInstalled === true);
      if (actuallyInstalled) {
        installStoreApp({
          id: item.id,
          name: item.name,
          arabicName: item.arabicName,
          category: item.category,
          packageName: item.packageName,
          binary: item.binary,
          launchMode: item.launchMode === 'builtin' ? 'tauri' : item.launchMode,
          launchUrl: item.launchUrl,
          badgeText: item.name.slice(0, 2).toUpperCase(),
          accentBg: 'from-teal-500 to-emerald-600',
          hostNote: res.note,
        });
        setNativeInstalledMap((prev) => ({ ...prev, [item.id]: true }));
      }

      const detailText =
        res.note ??
        res.error ??
        (actuallyInstalled
          ? isAr
            ? `تم تثبيت ${item.name} بنجاح.`
            : `${item.name} installed.`
          : isAr
          ? `يتطلب تثبيت ${item.name} (${item.packageName}) تشغيل KemetOS داخل بيئة Linux/Tauri بصلاحيات root.`
          : `Installing ${item.packageName} requires running KemetOS inside Linux/Tauri.`);

      if (!actuallyInstalled) {
        setInstallLogs((prev) => [...prev.slice(-18), detailText]);
      }

      addStoreOperation({
        title: isAr ? `تثبيت ${item.name}` : `Install ${item.name}`,
        command: `pkexec apt-get install -y ${item.packageName}`,
        status: actuallyInstalled ? 'completed' : 'failed',
        details: detailText,
      });
      pushNotification(item.name, detailText, 'system');
    } finally {
      setBusyId(null);
    }
  };

  const handleUninstallItem = async (item: StoreCatalogItem) => {
    if (item.launchMode === 'builtin') return;
    setBusyId(item.id);
    setInstallLogs([`[Kemet Store] Removing ${item.name} (${item.packageName})...`]);
    try {
      const res = await uninstallStorePackage(item.packageName);
      if (res.ok) {
        uninstallStoreApp(item.id);
        setNativeInstalledMap((prev) => ({ ...prev, [item.id]: false }));
      }
      setInstallLogs((prev) => [
        ...prev.slice(-18),
        res.note ?? res.error ?? `pkexec apt-get remove -y ${item.packageName}`,
      ]);
      addStoreOperation({
        title: isAr ? `إزالة ${item.name}` : `Uninstall ${item.name}`,
        command: `pkexec apt-get remove -y ${item.packageName}`,
        status: res.ok ? 'completed' : 'failed',
        details: res.note ?? res.error,
      });
      pushNotification(
        item.name,
        res.note ?? res.error ?? (isAr ? `تمت معالجة إزالة ${item.name}.` : `Processed removal of ${item.name}.`),
        'system'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleLaunchItem = async (item: StoreCatalogItem) => {
    if (item.builtinAppId) {
      openOsApp(item.builtinAppId);
      return;
    }
    const launchCmd = item.id === 'chrome' ? 'google-chrome-stable' : item.binary;
    const launchArgs = item.id === 'chrome' ? ['--no-first-run'] : [];
    const res = await launchNativeApp(launchCmd, launchArgs);
    if (!res.ok && item.launchMode === 'web') {
      openOsApp('browser', { initialUrl: item.launchUrl });
      return;
    }
    pushNotification(
      item.name,
      res.ok
        ? isAr
          ? `تم تشغيل ${item.name}.`
          : `Launched ${item.name}.`
        : res.error ?? 'Ready inside KemetOS Linux.',
      'system'
    );
  };

  const activeSlide = QUICK_PACKS[heroIndex % QUICK_PACKS.length];
  const selectedPack = QUICK_PACKS.find((p) => p.id === selectedPackId) ?? null;

  const handleInstallBundle = async () => {
    if (!selectedPack) return;
    setBundleRunning(true);
    try {
      const res = await installBundle(selectedPack.packages);
      setInstallLogs((prev) => [...prev.slice(-10), res.note]);
      addStoreOperation({
        title: isAr ? selectedPack.titleAr : selectedPack.titleEn,
        command: `pkexec apt-get install -y ${selectedPack.packages.join(' ')}`,
        status: res.ok ? 'completed' : 'failed',
        details: res.note,
      });
      pushNotification('متجر كيميت', res.note, 'system');
    } finally {
      setBundleRunning(false);
    }
  };

  const primaryNav: Array<{ id: StoreNavTab; label: string; icon: typeof Home; badge?: number }> = [
    { id: 'home', label: isAr ? 'الرئيسية' : 'Home', icon: Home },
    { id: 'packages', label: isAr ? 'برامج كيميت' : 'Kemet Software', icon: Sparkles },
    { id: 'categories', label: isAr ? 'التصنيفات' : 'Categories', icon: LayoutGrid },
    { id: 'packs', label: isAr ? 'الحزم' : 'Packs', icon: Layers },
    { id: 'installed', label: isAr ? 'المثبتة' : 'Installed', icon: CheckCircle2 },
    { id: 'updates', label: isAr ? 'التحديثات' : 'Updates', icon: Download, badge: pendingUpdatesCount },
  ];

  const bottomNav: Array<{ id: StoreNavTab; label: string; icon: typeof Clock }> = [
    { id: 'history', label: isAr ? 'السجل' : 'History', icon: Clock },
    { id: 'settings', label: isAr ? 'الإعدادات' : 'Settings', icon: Settings },
  ];

  const renderAppCard = (item: StoreCatalogItem) => {
    const isInstalled = installedSet.has(item.id);
    const isBusy = busyId === item.id;
    const displayName = isAr && item.id === 'taskmgr' ? item.arabicName : item.name;

    return (
      <div
        key={item.id}
        className="rounded-xl bg-[#0e1726]/95 border border-slate-800/90 hover:border-teal-500/35 p-3.5 flex flex-col justify-between gap-3 transition-colors"
      >
        <div className="space-y-2.5">
          {item.windowsEquivalent ? (
            <div className="leading-tight text-start">
              <div className="text-[10px] text-slate-400">{isAr ? 'بديل' : 'Instead of'}</div>
              <div className="text-[11px] font-semibold text-slate-200 mt-0.5 truncate">
                <span dir="ltr" className="inline-block">
                  {item.windowsEquivalent}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-teal-300/80 font-medium text-start">{item.category}</div>
          )}

          <div className="flex items-start gap-2.5">
            <AppVectorIcon id={item.id} className="w-9 h-9 shrink-0" />
            <div className="min-w-0 flex-1 text-start">
              <div className="text-xs sm:text-sm font-bold text-white truncate">{displayName}</div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                {isAr ? item.descriptionAr : item.descriptionEn}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 shrink-0">
            {isInstalled ? (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleLaunchItem(item)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#153138] hover:bg-[#1a3e47] border border-teal-500/35 text-[#2DD4BF] text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  <span>{isAr ? 'فتح' : 'Open'}</span>
                </button>
                {item.launchMode !== 'builtin' && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleUninstallItem(item)}
                    aria-label={`Remove ${item.name}`}
                    title={isAr ? 'إزالة الحزمة' : 'Uninstall package'}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleInstallItem(item)}
                className="px-4 py-1.5 rounded-lg bg-[#2DD4BF] hover:brightness-110 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isBusy ? (isAr ? 'جاري...' : 'Installing...') : isAr ? 'تثبيت' : 'Install'}
              </button>
            )}
          </div>

          {item.alternativeHint && (
            <span className="text-[10px] text-slate-400 truncate">
              {isAr ? `بديل آخر: ${item.alternativeHint}` : `Another option: ${item.alternativeHint}`}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="@container flex-1 min-h-0 flex flex-col bg-[#0b1322] text-slate-100 select-none overflow-hidden"
    >
      <div className="flex-1 min-h-0 flex flex-col @md:flex-row overflow-hidden">
      {/* Clean Responsive Sidebar (Top compact bar on mobile/narrow, 192px rail on desktop) */}
      <aside className="w-full @md:w-[192px] shrink-0 bg-[#080f1c] border-b @md:border-b-0 @md:rtl:border-l @md:ltr:border-r border-slate-800/80 p-2.5 @md:p-3 flex flex-col justify-between gap-2">
        <div className="space-y-2.5 @md:space-y-3.5">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 rtl:right-2.5 ltr:left-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (navTab !== 'packages') setNavTab('packages');
                }}
                placeholder={isAr ? 'ابحث...' : 'Search apps...'}
                className="w-full bg-[#0d1729] border border-slate-800 focus:border-teal-400/60 rounded-lg py-1.5 pr-8 pl-2 rtl:pr-8 rtl:pl-2 ltr:pl-8 ltr:pr-2 text-[11px] text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void probeInstalledApps()}
              title={isAr ? 'تحديث حالة الحزم' : 'Refresh package status'}
              className="w-7 h-7 rounded-lg bg-[#0d1729] border border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-300 hover:text-teal-300 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${probingHost ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <nav className="flex @md:flex-col gap-1 overflow-x-auto [scrollbar-width:none]">
            {primaryNav.map((nav) => {
              const Icon = nav.icon;
              const active = navTab === nav.id && !selectedApp;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => {
                    setSelectedApp(null);
                    setNavTab(nav.id);
                  }}
                  className={`shrink-0 @md:w-full flex items-center justify-between gap-2 px-2.5 py-1.5 @md:py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#142c36] text-[#2DD4BF] border border-teal-500/25'
                      : 'text-slate-300 hover:bg-slate-800/55 hover:text-white border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 @md:w-4 @md:h-4 shrink-0" />
                    <span>{nav.label}</span>
                  </span>
                  {nav.badge && nav.badge > 0 ? (
                    <span className="w-4 h-4 rounded-full bg-[#2DD4BF] text-slate-950 text-[10px] font-bold font-mono-tabular flex items-center justify-center">
                      {nav.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden @md:block space-y-0.5 border-t border-slate-800/80 pt-2.5">
          {bottomNav.map((nav) => {
            const Icon = nav.icon;
            const active = navTab === nav.id && !selectedApp;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => {
                  setSelectedApp(null);
                  setNavTab(nav.id);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/55 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{nav.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Scrollable Canvas */}
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto os-scroll p-3.5 @md:p-5 space-y-4">
        {selectedApp === 'google-chrome' && (
          <section className="rounded-2xl bg-[#0e1726] border border-[#D6A63B]/45 p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-[260px]">
                <AppVectorIcon id="chrome" className="w-14 h-14 shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-white">Google Chrome</h2>
                    <span dir="ltr" className="px-2 py-0.5 rounded bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 text-[#2DD4BF] text-[10px] font-bold font-mono-tabular">
                      Debian 12 amd64 (.deb)
                    </span>
                    <span dir="ltr" className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono-tabular">
                      {chromeSizeMb ? `~${chromeSizeMb} MB` : '~110 MB'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        nativeInstalledMap['chrome']
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {nativeInstalledMap['chrome']
                        ? isAr
                          ? 'مثبّت على النظام'
                          : 'Installed on Host'
                        : isAr
                        ? 'غير مثبّت'
                        : 'Not Installed'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    {isAr
                      ? 'متصفح Google Chrome الرسمي لنظام Debian Linux 64-bit. يتم تحميل حزمة .deb الرسمية مباشرة من خوادم Google وتثبيتها عبر مدير الحزم.'
                      : 'Official Google Chrome browser for Debian Linux amd64, downloaded directly from Google servers and installed via apt.'}
                  </p>
                  <div dir="ltr" className="text-[11px] font-mono-tabular text-[#2DD4BF] break-all">
                    {OFFICIAL_CHROME_DEB_URL}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer shrink-0"
              >
                {isAr ? 'العودة للمتجر' : 'Back to Store'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {nativeInstalledMap['chrome'] ? (
                <button
                  type="button"
                  onClick={() =>
                    void launchNativeApp('google-chrome-stable', ['--no-first-run'])
                  }
                  className="px-5 py-2.5 rounded-xl bg-[#2DD4BF] hover:brightness-110 text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>{isAr ? 'تشغيل Google Chrome الآن' : 'Launch Google Chrome Now'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={chromeInstalling}
                  onClick={() => void handleInstallGoogleChrome()}
                  className="px-5 py-2.5 rounded-xl bg-[#D6A63B] hover:brightness-110 text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {chromeInstalling
                      ? isAr
                        ? 'جاري التحميل والتثبيت...'
                        : 'Downloading & Installing...'
                      : isAr
                      ? 'تحميل وتثبيت Google Chrome الآن'
                      : 'Download & Install Google Chrome'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => openOsApp('browser')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Globe className="w-4 h-4 text-[#2DD4BF]" />
                <span>
                  {isAr ? 'فتح متصفح الويب المدمج (KemetBrowser)' : 'Open Built-in Web Browser'}
                </span>
              </button>
            </div>

            {(chromeInstalling || chromeProgress > 0) && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-300">
                  <span>{chromeStage || 'apt / curl'}</span>
                  <span className="text-[#2DD4BF]">{chromeProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-[#2DD4BF] transition-all duration-200"
                    style={{ width: `${chromeProgress}%` }}
                  />
                </div>
              </div>
            )}

            {chromeNotice && (
              <div
                className={`rounded-xl border p-4 space-y-3 ${
                  chromeRequiresTauri || !nativeInstalledMap['chrome']
                    ? 'bg-amber-500/10 border-[#D6A63B]/45 text-amber-100'
                    : 'bg-emerald-500/10 border-[#2DD4BF]/45 text-emerald-100'
                }`}
              >
                <div className="flex items-start gap-2.5 text-xs leading-relaxed">
                  {chromeRequiresTauri || !nativeInstalledMap['chrome'] ? (
                    <AlertTriangle className="w-4 h-4 text-[#D6A63B] shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-[#2DD4BF] shrink-0 mt-0.5" />
                  )}
                  <p>{chromeNotice}</p>
                </div>

                {(chromeRequiresTauri || !nativeInstalledMap['chrome']) && (
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={OFFICIAL_CHROME_DEB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-[#D6A63B] hover:brightness-110 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>
                        {isAr
                          ? 'تحميل الحزمة الرسمية (.deb) من Google'
                          : 'Download Official Google Chrome (.deb)'}
                      </span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {chromeLogs.length > 0 && (
              <div className="rounded-xl bg-[#070b14] border border-slate-800 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#2DD4BF]">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{isAr ? 'مخرجات التنفيذ الحقيقية' : 'Live Execution Output'}</span>
                </div>
                <div
                  dir="ltr"
                  className="max-h-40 overflow-y-auto os-scroll font-mono-tabular text-[11px] text-emerald-300 space-y-1"
                >
                  {chromeLogs.map((line, i) => (
                    <div key={i} className="break-all">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Live Install / Uninstall Output */}
        {installLogs.length > 0 && !selectedApp && (
          <section className="rounded-xl bg-[#070b14] border border-[#2DD4BF]/35 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#2DD4BF]">
              <span>{isAr ? 'سجل مدير الحزم' : 'Package Manager Output'}</span>
              <button
                type="button"
                onClick={() => setInstallLogs([])}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div dir="ltr" className="max-h-28 overflow-y-auto os-scroll font-mono-tabular text-[11px] text-emerald-300 space-y-1">
              {installLogs.map((l, idx) => (
                <div key={idx}>{l}</div>
              ))}
            </div>
          </section>
        )}

        {/* Home View Matching Screenshot */}
        {!selectedApp && navTab === 'home' && !search && (
          <>
            {/* Hero Pack Banner */}
            <section className="relative rounded-2xl bg-gradient-to-br from-[#0e3942] via-[#0c2734] to-[#0f1d2e] border border-teal-500/25 px-6 @md:px-8 py-5 overflow-hidden">
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => setHeroIndex((prev) => (prev - 1 + QUICK_PACKS.length) % QUICK_PACKS.length)}
                className="hidden @md:flex absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/25 hover:bg-black/45 text-slate-300 items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => setHeroIndex((prev) => (prev + 1) % QUICK_PACKS.length)}
                className="hidden @md:flex absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/25 hover:bg-black/45 text-slate-300 items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex flex-col @md:flex-row items-center justify-between gap-5 px-1 @md:px-4">
                <div className="space-y-2.5 max-w-lg text-start w-full @md:w-auto">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[10px] font-bold">
                    <Package className="w-3 h-3" />
                    <span>{isAr ? 'حزم جاهزة' : 'Packs'}</span>
                  </span>

                  <h2 className="text-lg @md:text-2xl font-extrabold text-white tracking-tight">
                    {isAr ? activeSlide.heroTitleAr : activeSlide.heroTitleEn}
                  </h2>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isAr ? activeSlide.descAr : activeSlide.descEn}
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedPackId(activeSlide.id)}
                      className="px-4 py-2 rounded-lg bg-[#2DD4BF] hover:brightness-110 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      {isAr ? 'عرض الحزمة ←' : 'See the pack →'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNavTab('packs')}
                      className="px-4 py-2 rounded-lg bg-[#0b1322]/70 hover:bg-slate-800 border border-slate-600/60 text-white text-xs font-semibold cursor-pointer"
                    >
                      {isAr ? `كل الحزم (${QUICK_PACKS.length})` : `All packs (${QUICK_PACKS.length})`}
                    </button>
                  </div>
                </div>

                {/* 2x2 Showcase Tile Grid */}
                <div className="rounded-2xl bg-[#09121e]/80 border border-teal-400/20 p-2.5 shadow-2xl shrink-0">
                  <div className="grid grid-cols-2 gap-2">
                    {activeSlide.icons.map((iconId) => (
                      <div
                        key={iconId}
                        className="w-11 h-11 rounded-xl bg-[#101c2f] border border-slate-700/60 flex items-center justify-center"
                      >
                        <AppVectorIcon id={iconId} className="w-8 h-8" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 mt-3.5">
                {QUICK_PACKS.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={p.titleEn}
                    onClick={() => setHeroIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === heroIndex % QUICK_PACKS.length
                        ? 'w-5 bg-[#2DD4BF]'
                        : 'w-1.5 bg-slate-500/70'
                    }`}
                  />
                ))}
              </div>
            </section>

            {/* Coming from Windows Section */}
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isAr ? 'قادم من ويندوز؟' : 'Coming from Windows?'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAr
                      ? 'برامجك المعتادة لها بدائل قوية هنا، ونقترح لك الأفضل.'
                      : 'Your familiar programs have alternatives here, and we suggest the best fit.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNavTab('packages')}
                  className="text-xs font-semibold text-[#2DD4BF] hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isAr ? `عرض الكل (${ALL_CATALOG.length}) ←` : `See all (${ALL_CATALOG.length}) →`}
                </button>
              </div>

              <div className="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-3">
                {WINDOWS_ALTERNATIVES.map(renderAppCard)}
              </div>
            </section>
          </>
        )}

        {/* Categories / Packages / Search View */}
        {!selectedApp && (navTab === 'packages' || navTab === 'categories' || Boolean(search)) && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-bold text-white">
                {isAr ? `برامج وحزم KemetOS (${filteredCatalog.length})` : `Kemet Software (${filteredCatalog.length})`}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {CATEGORIES.map((cat) => {
                const active = categoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                      active
                        ? 'bg-[#142c36] border-teal-500/45 text-[#2DD4BF]'
                        : 'bg-[#080f1c] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {isAr ? cat.labelAr : cat.labelEn}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredCatalog.map(renderAppCard)}
            </div>
          </section>
        )}

        {/* Packs View */}
        {!selectedApp && navTab === 'packs' && !search && (
          <section className="space-y-4">
            <h3 className="text-base font-bold text-white">{isAr ? 'حزم التثبيت السريع' : 'Quick App Packs'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {QUICK_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-2xl bg-[#0e1726] border border-slate-800 p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-white">
                      {isAr ? pack.titleAr : pack.titleEn}
                    </div>
                    <p className="text-xs text-slate-400">{isAr ? pack.descAr : pack.descEn}</p>
                    <div className="flex items-center gap-2 pt-1">
                      {pack.icons.map((ic) => (
                        <AppVectorIcon key={ic} id={ic} className="w-8 h-8" />
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    className="self-start px-4 py-2 rounded-lg bg-[#2DD4BF] hover:brightness-110 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    {isAr ? 'عرض وتثبيت الحزمة' : 'Inspect & Install Pack'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {!selectedApp && navTab === 'installed' && !search && (
          <section className="space-y-4">
            <h3 className="text-base font-bold text-white">
              {isAr ? `التطبيقات المثبتة (${installedSet.size})` : `Installed Apps (${installedSet.size})`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {ALL_CATALOG.filter((item) => installedSet.has(item.id)).map(renderAppCard)}
            </div>
          </section>
        )}

        {!selectedApp && navTab === 'updates' && (
          <section className="rounded-xl bg-[#0e1726] border border-slate-800 p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">
                {pendingUpdatesCount > 0
                  ? isAr
                    ? `يوجد ${pendingUpdatesCount} تحديث متاح للنظام`
                    : `${pendingUpdatesCount} System Update Available`
                  : isAr
                  ? 'جميع الحزم والتعريفات محدثة'
                  : 'All packages are up to date'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Debian Bookworm · non-free-firmware · KemetOS Security Updates
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => openOsApp('updates')}
                className="px-4 py-2 rounded-lg bg-[#D6A63B] text-slate-950 text-xs font-bold cursor-pointer"
              >
                {isAr ? 'فتح مدير التحديثات الكامل' : 'Open Update Manager'}
              </button>
              {pendingUpdatesCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    applyPendingUpdates();
                    addStoreOperation({
                      title: isAr ? 'تحديث حزم النظام' : 'System Upgrade',
                      command: 'pkexec apt-get upgrade -y',
                      status: 'completed',
                    });
                  }}
                  className="px-4 py-2 rounded-lg bg-[#2DD4BF] text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحديث الكل' : 'Update All'}</span>
                </button>
              )}
            </div>
          </section>
        )}

        {!selectedApp && navTab === 'history' && (
          <section className="space-y-3">
            <h3 className="text-base font-bold text-white">{isAr ? 'سجل العمليات' : 'Operation History'}</h3>
            {storeHistory.length === 0 ? (
              <div className="rounded-xl bg-[#0e1726] border border-slate-800 p-5 text-xs text-slate-400">
                {isAr ? 'لا توجد عمليات تثبيت أو إزالة مسجلة بعد.' : 'No package operations recorded yet.'}
              </div>
            ) : (
              storeHistory.map((op) => (
                <div key={op.id} className="rounded-xl bg-[#0e1726] border border-slate-800 p-4 text-xs">
                  <div className="flex justify-between font-semibold text-white">
                    <span>{op.title}</span>
                    <span className={op.status === 'completed' ? 'text-[#2DD4BF]' : 'text-rose-400'}>
                      {op.status}
                    </span>
                  </div>
                  <div dir="ltr" className="font-mono-tabular text-[11px] text-slate-400 mt-1">
                    {op.command}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {!selectedApp && navTab === 'settings' && (
          <section className="rounded-xl bg-[#0e1726] border border-slate-800 p-6 space-y-2 text-xs text-slate-300">
            <h3 className="text-sm font-bold text-white">{isAr ? 'مصادر الحزم' : 'Package Sources'}</h3>
            <p className="text-slate-400 leading-relaxed">
              {isAr
                ? 'يعتمد متجر كيميت على مستودعات Debian 12 الرسمية (main, contrib, non-free, non-free-firmware) وحزم Wine 64-bit و Steam i386.'
                : 'Connected to Debian 12 official repositories with Wine 64-bit and Steam i386 support.'}
            </p>
          </section>
        )}
      </main>

      {/* Bundle Installer Modal */}
      {selectedPack && (
        <div className="fixed inset-0 z-[260] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1120] border border-slate-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {isAr ? selectedPack.titleAr : selectedPack.titleEn}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPackId(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr ? selectedPack.descAr : selectedPack.descEn}
            </p>
            <div dir="ltr" className="p-3 rounded-xl bg-[#070b14] border border-slate-800 font-mono-tabular text-[11px] text-[#2DD4BF]">
              pkexec apt-get install -y {selectedPack.packages.join(' ')}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedPackId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-200 cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={bundleRunning}
                onClick={() => void handleInstallBundle()}
                className="px-4 py-2 rounded-xl bg-[#2DD4BF] hover:brightness-110 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {bundleRunning ? (isAr ? 'جاري التثبيت...' : 'Installing...') : isAr ? 'تثبيت الحزمة الآن' : 'Install Pack'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
});
