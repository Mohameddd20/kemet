import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Cpu,
  Download,
  FileWarning,
  Layers,
  MemoryStick,
  Play,
  PowerOff,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Terminal,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  checkCompatibilityRuntimes,
  inspectBinaryDeps,
  installWinetricksRuntime,
  runWindowsExe,
  setupWaydroidRuntime,
  stopWineServer,
  type CompatibilityRuntimesReport,
} from '../../services/systemBridge';
import {
  detectBinaryType,
  diagnoseLaunchFailure,
  evaluateLowRamSafety,
  type CompatibilityDiagnosis,
} from '../../system/compatibilityLogic';
import { openOsApp } from '../../apps/registry';
import { useSettingsStore } from '../../system/settingsStore';
import { useNotificationStore } from '../../system/notificationStore';

type CompatTabId = 'windows' | 'linux' | 'android' | 'logs';

interface CompatLogEntry {
  id: string;
  at: number;
  source: string;
  text: string;
  level: 'info' | 'warn' | 'error';
}

export function CompatibilityCenter() {
  const language = useSettingsStore((s) => s.language);
  const pushNotification = useNotificationStore((s) => s.pushNotification);
  const isAr = language === 'ar';

  const [tab, setTab] = useState<CompatTabId>('windows');
  const [report, setReport] = useState<CompatibilityRuntimesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [stoppingAll, setStoppingAll] = useState(false);

  // Windows Wine state
  const [exeInput, setExeInput] = useState('/home/kemet/Downloads/setup.exe');
  const [launchingExe, setLaunchingExe] = useState(false);
  const [lastLaunchNotice, setLastLaunchNotice] = useState<CompatibilityDiagnosis | null>(null);
  const [busyTrickId, setBusyTrickId] = useState<string | null>(null);

  // Linux ABI ldd state
  const [lddTarget, setLddTarget] = useState('bash');
  const [lddLoading, setLddLoading] = useState(false);
  const [lddResult, setLddResult] = useState<{
    ok: boolean;
    path: string;
    libraries: Array<{ name: string; resolvedPath: string | null; isMissing: boolean }>;
    missingCount: number;
  } | null>(null);

  // Android Waydroid state
  const [settingUpWaydroid, setSettingUpWaydroid] = useState(false);

  // Diagnostics & logs
  const [diagnostics, setDiagnostics] = useState<CompatibilityDiagnosis[]>([]);
  const [logs, setLogs] = useState<CompatLogEntry[]>([]);

  const appendLog = (source: string, text: string, level: CompatLogEntry['level'] = 'info') => {
    setLogs((prev) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: Date.now(), source, text, level },
      ...prev.slice(0, 49),
    ]);
  };

  const loadRuntimes = async () => {
    setLoading(true);
    try {
      const res = await checkCompatibilityRuntimes();
      setReport(res);
      if (res.winePrefix) {
        const hostHome = res.winePrefix.replace(/\/\.kemet-wine$/, '');
        setExeInput((prev) => (prev === '/home/kemet/Downloads/setup.exe' ? `${hostHome}/Downloads/setup.exe` : prev));
      }
      appendLog(
        'Runtime Probe',
        isAr
          ? `فحص البيئات: الذاكرة المتاحة ${res.availableMb} MB / ${res.totalMb} MB · Wine: ${res.wineInstalled ? 'جاهز' : 'غير مثبت'} · KVM: ${res.kvmAvailable ? 'متاح' : 'غير متاح'}`
          : `Probed runtimes: ${res.availableMb}/${res.totalMb} MB RAM · Wine: ${res.wineInstalled} · KVM: ${res.kvmAvailable}`
      );
    } finally {
      setLoading(false);
    }
  };

  const runLddInspection = async (targetBin: string) => {
    setLddLoading(true);
    try {
      const res = await inspectBinaryDeps(targetBin);
      setLddResult({
        ok: res.ok,
        path: res.path,
        libraries: res.libraries ?? [],
        missingCount: res.missingCount ?? 0,
      });
      appendLog(
        'Native ABI (ldd)',
        `ldd ${res.path} -> ${res.libraries?.length ?? 0} shared libs (${res.missingCount ?? 0} missing)`,
        res.missingCount > 0 ? 'warn' : 'info'
      );
      if (res.missingCount > 0) {
        setDiagnostics((prev) => [
          diagnoseLaunchFailure('Missing shared library (32-bit/i386 or libGL)', { arch: report?.arch }),
          ...prev,
        ]);
      }
    } finally {
      setLddLoading(false);
    }
  };

  useEffect(() => {
    void loadRuntimes();
    void runLddInspection('bash');
  }, []);

  const wineRamGuard = useMemo(
    () => evaluateLowRamSafety(report?.availableMb ?? 1024, report?.totalMb ?? 2048, 'wine'),
    [report]
  );

  const androidRamGuard = useMemo(
    () => evaluateLowRamSafety(report?.availableMb ?? 1024, report?.totalMb ?? 2048, 'android'),
    [report]
  );

  const detectedExe = useMemo(() => detectBinaryType(exeInput), [exeInput]);

  const handleStopAllEmulators = async () => {
    setStoppingAll(true);
    try {
      const res = await stopWineServer();
      for (const l of res.logs) {
        appendLog('Memory Guard (wineserver -k)', l, 'info');
      }
      pushNotification(
        isAr ? 'تحرير ذاكرة المحاكاة' : 'Emulators Stopped',
        isAr
          ? `تم إيقاف عمليات Wine (الذاكرة المتاحة الآن: ${res.availableMb} MB)`
          : `Stopped Wine daemons (${res.availableMb} MB free)`,
        'system'
      );
      await loadRuntimes();
    } finally {
      setStoppingAll(false);
    }
  };

  const handleLaunchWindowsBinary = async () => {
    const clean = exeInput.trim();
    if (!clean) return;
    if (!wineRamGuard.allowed) {
      const diag = diagnoseLaunchFailure('insufficient memory', {
        ext: '.exe',
        freeRamMb: report?.availableMb,
        arch: report?.arch,
      });
      setDiagnostics((prev) => [diag, ...prev]);
      appendLog('Low-RAM Guardrail', diag.reasonAr, 'error');
      setTab('logs');
      return;
    }

    setLaunchingExe(true);
    setLastLaunchNotice(null);
    try {
      const res = await runWindowsExe(clean);
      if (res.ok) {
        appendLog(
          'Kemet Wine Engine',
          `Launched ${clean} via ${res.runner ?? 'wine64'} (WINEPREFIX=${res.winePrefix ?? '~/.kemet-wine'})`,
          'info'
        );
        pushNotification('Kemet Wine Engine', isAr ? `تم تشغيل ${clean} بنجاح.` : `Launched ${clean}.`, 'system');
        await loadRuntimes();
      } else {
        const errMsg = res.error ?? 'Failed to launch Windows executable';
        const diag = diagnoseLaunchFailure(errMsg, {
          ext: clean.toLowerCase().endsWith('.msi') ? '.msi' : '.exe',
          freeRamMb: report?.availableMb,
          arch: report?.arch,
        });
        setLastLaunchNotice(diag);
        setDiagnostics((prev) => [diag, ...prev]);
        appendLog('Kemet Wine Engine', errMsg, 'error');
        pushNotification(diag.titleAr, diag.reasonAr, 'system');
      }
    } finally {
      setLaunchingExe(false);
    }
  };

  const handleInstallWinetricks = async (verb: string) => {
    setBusyTrickId(verb);
    try {
      const res = await installWinetricksRuntime(verb);
      for (const l of res.logs) {
        appendLog('winetricks', l, 'info');
      }
      await loadRuntimes();
    } finally {
      setBusyTrickId(null);
    }
  };

  const handleSetupWaydroid = async () => {
    setSettingUpWaydroid(true);
    try {
      const res = await setupWaydroidRuntime();
      for (const l of res.logs) {
        appendLog('Android / Waydroid', l, res.ok ? 'info' : 'warn');
      }
      if (!res.ok) {
        setDiagnostics((prev) => [
          diagnoseLaunchFailure('Waydroid /dev/kvm missing', {
            ext: '.apk',
            freeRamMb: report?.availableMb,
            arch: report?.arch,
          }),
          ...prev,
        ]);
      }
      await loadRuntimes();
    } finally {
      setSettingUpWaydroid(false);
    }
  };

  const tabs: Array<{ id: CompatTabId; labelAr: string; labelEn: string; icon: typeof Box; badge?: number }> = [
    { id: 'windows', labelAr: 'برامج Windows (Wine Engine)', labelEn: 'Windows (Wine)', icon: Box },
    { id: 'linux', labelAr: 'بيئة Linux (Native ABI)', labelEn: 'Linux (Native ABI)', icon: Cpu },
    { id: 'android', labelAr: 'تطبيقات Android (APK Runtime)', labelEn: 'Android (APK)', icon: Smartphone },
    {
      id: 'logs',
      labelAr: 'سجل الأخطاء والتوافق',
      labelEn: 'Diagnostics & Logs',
      icon: FileWarning,
      badge: diagnostics.length,
    },
  ];

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="flex-1 min-h-0 flex flex-col bg-[#0B1120] text-slate-100 overflow-hidden select-none"
    >
      {/* Top Low-RAM Guardrail & Control Strip */}
      <div className="shrink-0 px-6 py-4 bg-[#070b14] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-bold text-[#D6A63B]">
              {isAr ? 'مركز التوافق والمحاكاة (Compatibility Center)' : 'Emulator & Compatibility Center'}
            </h2>
            <span dir="ltr" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#2DD4BF]/10 border border-[#2DD4BF]/35 text-[#2DD4BF] text-[11px] font-bold font-mono-tabular">
              <MemoryStick className="w-3.5 h-3.5" />
              <span>
                {report ? `${report.availableMb} / ${report.totalMb} MB Free` : '...'}
              </span>
            </span>
            {wineRamGuard.isLowRamDevice && (
              <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/35 text-[#D6A63B] text-[10px] font-bold">
                {isAr ? 'حماية الأجهزة الضعيفة مفعلة' : 'Low-RAM Guard Active'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {isAr
              ? 'تشغيل بيئات المحاكاة عند الطلب فقط (صفر استهلاك في الخلفية عند الإقلاع).'
              : 'On-demand execution only — zero background Wine or VM daemons at boot.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadRuntimes()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'فحص البيئات' : 'Re-check'}</span>
          </button>

          <button
            type="button"
            disabled={stoppingAll}
            onClick={() => void handleStopAllEmulators()}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/45 text-rose-200 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <PowerOff className="w-3.5 h-3.5 text-rose-300" />
            <span>
              {stoppingAll
                ? isAr
                  ? 'جاري الإيقاف...'
                  : 'Stopping...'
                : isAr
                ? 'إيقاف جميع بيئات المحاكاة وتحرير الذاكرة'
                : 'Stop All Emulators & Free RAM'}
            </span>
          </button>
        </div>
      </div>

      {/* Focused 4-Tab Bar */}
      <div className="shrink-0 px-6 py-3 bg-[#090f1d] border-b border-slate-800/80 flex flex-wrap items-center gap-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer flex items-center gap-2 ${
                active
                  ? 'bg-[#2DD4BF]/15 border-[#2DD4BF]/55 text-[#2DD4BF]'
                  : 'bg-[#070b14] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? item.labelAr : item.labelEn}</span>
              {item.badge && item.badge > 0 ? (
                <span className="px-1.5 py-0.2 rounded bg-[#D6A63B] text-slate-950 text-[10px] font-bold font-mono-tabular">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Main Scrollable Content (p-6 gap-5, overflow-y-auto, zero backdrop-blur) */}
      <div className="flex-1 min-h-0 overflow-y-auto os-scroll p-6 space-y-5">
        {/* Low-RAM Warning Banner if Free Memory < Safe Threshold */}
        {report && wineRamGuard.severity !== 'safe' && (
          <div className="rounded-xl bg-[#070b14] border border-amber-400/50 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-amber-200">
              <AlertTriangle className="w-5 h-5 text-[#D6A63B] shrink-0" />
              <span>{isAr ? wineRamGuard.messageAr : wineRamGuard.messageEn}</span>
            </div>
            <button
              type="button"
              onClick={() => void handleStopAllEmulators()}
              className="px-3 py-1.5 rounded-lg bg-[#D6A63B] text-slate-950 text-xs font-bold cursor-pointer"
            >
              {isAr ? 'تحرير الذاكرة الآن' : 'Free Memory Now'}
            </button>
          </div>
        )}

        {/* TAB 1: Windows Programs (Wine Engine) */}
        {tab === 'windows' && (
          <div className="space-y-5">
            {/* Wine Prefix & Daemon Overview */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="rounded-xl bg-[#070b14] border border-slate-800 p-5 space-y-2">
                <div className="text-xs font-bold text-[#D6A63B]">
                  {isAr ? 'بيئة Prefix المعزولة' : 'Isolated WINEPREFIX'}
                </div>
                <div dir="ltr" className="text-xs font-mono-tabular text-[#2DD4BF] truncate">
                  {report?.winePrefix ?? '~/.kemet-wine'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {report?.winePrefixInitialized
                    ? isAr
                      ? 'تمت تهيئة البادئة وجاهزة للتشغيل.'
                      : 'Prefix initialized and ready.'
                    : isAr
                    ? 'تُنشأ تلقائياً عند أول تشغيل (صفر حجم قبل الاستخدام).'
                    : 'Created lazily on first .exe launch.'}
                </div>
              </div>

              <div className="rounded-xl bg-[#070b14] border border-slate-800 p-5 space-y-2">
                <div className="text-xs font-bold text-[#D6A63B]">
                  {isAr ? 'حالة محرك Wine' : 'Wine Engine Status'}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  {report?.wineInstalled ? (
                    <span className="text-[#2DD4BF] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{report.wine64Installed ? 'wine64 + wine32 Ready' : 'wine Ready'}</span>
                    </span>
                  ) : (
                    <span className="text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{isAr ? 'غير مثبت على المضيف الحالي' : 'Wine not installed yet'}</span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {report?.wineRunning
                    ? isAr
                      ? 'wineserver نشط حالياً في الذاكرة'
                      : 'wineserver active in RAM'
                    : isAr
                    ? 'خامل — لا يستهلك أي ذاكرة عند عدم الاستخدام'
                    : 'Idle — 0 MB RAM at rest'}
                </div>
              </div>

              <div className="rounded-xl bg-[#070b14] border border-slate-800 p-5 flex flex-col justify-between gap-3">
                <div className="text-xs font-bold text-white">
                  {isAr ? 'تثبيت أو تحديث طبقة Wine' : 'Wine & Proton Layer'}
                </div>
                <button
                  type="button"
                  onClick={() => openOsApp('store', { storeAppId: 'wine' })}
                  className="px-3.5 py-2 rounded-lg bg-[#2DD4BF] hover:brightness-110 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إدارة Wine من متجر كيميت' : 'Manage Wine in Store'}</span>
                </button>
              </div>
            </section>

            {/* Launch .exe / .msi File */}
            <section className="rounded-xl bg-[#070b14] border border-slate-800 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'تشغيل ملف Windows (.exe / .msi)' : 'Launch Windows Binary (.exe / .msi)'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAr
                      ? 'يتم التحقق من الذاكرة الحرة وتمرير المسار عبر ~/.kemet-wine تلقائياً.'
                      : 'Checks available RAM and launches inside ~/.kemet-wine prefix.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-[#2DD4BF] font-mono-tabular">
                  {isAr ? detectedExe.labelAr : detectedExe.labelEn}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  dir="ltr"
                  value={exeInput}
                  onChange={(e) => setExeInput(e.target.value)}
                  placeholder="/home/kemet/Downloads/installer.exe"
                  className="flex-1 min-w-[260px] bg-[#0B1120] border border-slate-700 focus:border-[#2DD4BF] rounded-xl px-4 py-2.5 text-xs font-mono-tabular text-white focus:outline-none"
                />
                <button
                  type="button"
                  disabled={launchingExe}
                  onClick={() => void handleLaunchWindowsBinary()}
                  className="px-5 py-2.5 rounded-xl bg-[#D6A63B] hover:brightness-110 text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{launchingExe ? (isAr ? 'جاري التشغيل...' : 'Launching...') : isAr ? 'تشغيل عبر Wine' : 'Run with Wine'}</span>
                </button>
              </div>
              {lastLaunchNotice && (
                <div className="rounded-xl bg-[#0B1120] border border-amber-400/40 p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[#D6A63B]">
                      {isAr ? lastLaunchNotice.titleAr : lastLaunchNotice.titleEn}
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {isAr ? lastLaunchNotice.reasonAr : lastLaunchNotice.reasonEn}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('logs')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#2DD4BF] text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    {isAr ? 'عرض التشخيص والحل' : 'View Diagnostics'}
                  </button>
                </div>
              )}
            </section>

            {/* Winetricks DLL Overrides */}
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-[#D6A63B] flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#2DD4BF]" />
                <span>{isAr ? 'مكتبات DLL والحزم الشائعة (winetricks overrides)' : 'Common DLL Overrides (winetricks)'}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(report?.dllOverrides ?? []).map((dll) => {
                  const busy = busyTrickId === dll.id;
                  return (
                    <div
                      key={dll.id}
                      className="rounded-xl bg-[#070b14] border border-slate-800 p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div dir="ltr" className="text-xs font-bold text-white font-mono-tabular">
                          {dll.id}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{dll.label}</div>
                      </div>
                      {dll.installed ? (
                        <span className="px-3 py-1 rounded-lg bg-[#2DD4BF]/15 border border-[#2DD4BF]/35 text-[#2DD4BF] text-[11px] font-bold shrink-0">
                          {isAr ? 'مفعّل' : 'Configured'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleInstallWinetricks(dll.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#D6A63B] text-[11px] font-bold cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {busy ? (isAr ? 'جاري...' : 'Applying...') : isAr ? 'تفعيل Override' : 'Configure'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Installed Windows Apps inside ~/.kemet-wine */}
            <section className="rounded-xl bg-[#070b14] border border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'تطبيقات Windows المثبتة داخل ~/.kemet-wine' : 'Installed Apps inside ~/.kemet-wine'}
              </h3>
              {(report?.wineApps?.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-400">
                  {isAr
                    ? 'لم يتم تثبيت برامج Windows داخل ~/.kemet-wine بعد. افتح أي ملف .exe من مدير الملفات وسيتم تثبيته هنا.'
                    : 'No Windows programs installed inside ~/.kemet-wine yet.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report?.wineApps.map((app) => (
                    <div key={app.folder} className="rounded-lg bg-[#0B1120] border border-slate-800 p-3 flex items-center justify-between text-xs">
                      <span className="font-bold text-white truncate">{app.name}</span>
                      <span className="text-[10px] font-mono-tabular text-[#2DD4BF]">{app.arch}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: Native Linux ABI (ldd & Sandbox Limits) */}
        {tab === 'linux' && (
          <div className="space-y-5">
            {/* Sandbox Resource Limits */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-xl bg-[#070b14] border border-slate-800 p-4 space-y-1">
                <div className="text-[11px] text-slate-400">{isAr ? 'معمارية النواة (ABI)' : 'Kernel ABI Architecture'}</div>
                <div dir="ltr" className="text-sm font-bold font-mono-tabular text-[#2DD4BF]">
                  {report?.arch ?? 'x64'} · {report?.sandboxLimits.cpuCores ?? 4} Cores
                </div>
              </div>
              <div className="rounded-xl bg-[#070b14] border border-slate-800 p-4 space-y-1">
                <div className="text-[11px] text-slate-400">{isAr ? 'حد الملفات المفتوحة (ulimit -n)' : 'Sandbox File Limit (ulimit -n)'}</div>
                <div dir="ltr" className="text-sm font-bold font-mono-tabular text-[#D6A63B]">
                  {report?.sandboxLimits.maxOpenFiles ?? '1024'} descriptors
                </div>
              </div>
              <div className="rounded-xl bg-[#070b14] border border-slate-800 p-4 space-y-1">
                <div className="text-[11px] text-slate-400">{isAr ? 'خادم العرض الرسومي' : 'Display Server'}</div>
                <div dir="ltr" className="text-sm font-bold font-mono-tabular text-white truncate">
                  {report?.sandboxLimits.displayServer ?? 'X11 / Openbox'}
                </div>
              </div>
            </section>

            {/* Active Native Linux Binaries */}
            <section className="rounded-xl bg-[#070b14] border border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#D6A63B]">
                {isAr ? 'البرامج التنفيذية الأصلية على النظام (انقر لفحص ldd)' : 'Active Native Linux Binaries (Click to inspect ldd)'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {(report?.nativeBinaries ?? []).map((bin) => (
                  <button
                    key={bin.name}
                    type="button"
                    disabled={!bin.installed}
                    onClick={() => {
                      setLddTarget(bin.name);
                      void runLddInspection(bin.name);
                    }}
                    className={`p-3 rounded-xl border text-right rtl:text-right ltr:text-left transition-colors ${
                      bin.installed
                        ? 'bg-[#0B1120] hover:border-[#2DD4BF]/50 border-slate-800 cursor-pointer'
                        : 'bg-[#0B1120]/50 border-slate-800/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div dir="ltr" className="text-xs font-bold font-mono-tabular text-white">
                      {bin.name}
                    </div>
                    <div
                      dir={bin.installed ? 'ltr' : undefined}
                      className="text-[10px] mt-1 truncate font-mono-tabular text-[#2DD4BF]"
                    >
                      {bin.installed ? bin.path : isAr ? 'غير مثبت' : 'Not installed'}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Shared Library Dependency Check (ldd) */}
            <section className="rounded-xl bg-[#070b14] border border-slate-800 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2DD4BF]" />
                    <span>{isAr ? 'فحص المكتبات المشتركة (ldd Dependency Check)' : 'Shared Library Inspector (ldd)'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAr
                      ? 'يتحقق من ارتباط الملف التنفيذي بمكتبات النظام (.so) واكتشاف أي مكتبات مفقودة.'
                      : 'Inspects dynamic shared object dependencies and highlights missing .so links.'}
                  </p>
                </div>

                {lddResult && (
                  <span
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold border ${
                      lddResult.missingCount === 0
                        ? 'bg-[#2DD4BF]/10 border-[#2DD4BF]/35 text-[#2DD4BF]'
                        : 'bg-rose-500/15 border-rose-400/40 text-rose-300'
                    }`}
                  >
                    {lddResult.missingCount === 0
                      ? isAr
                        ? `${lddResult.libraries.length} مكتبة مكتملة`
                        : `${lddResult.libraries.length} libs resolved`
                      : isAr
                      ? `${lddResult.missingCount} مكتبة مفقودة`
                      : `${lddResult.missingCount} missing libs`}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  dir="ltr"
                  value={lddTarget}
                  onChange={(e) => setLddTarget(e.target.value)}
                  placeholder="bash or /usr/bin/python3"
                  className="flex-1 min-w-[220px] bg-[#0B1120] border border-slate-700 focus:border-[#2DD4BF] rounded-xl px-4 py-2 text-xs font-mono-tabular text-white focus:outline-none"
                />
                <button
                  type="button"
                  disabled={lddLoading}
                  onClick={() => void runLddInspection(lddTarget)}
                  className="px-4 py-2 rounded-xl bg-[#2DD4BF] hover:brightness-110 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {lddLoading ? (isAr ? 'جاري الفحص...' : 'Inspecting...') : isAr ? 'فحص المكتبات (ldd)' : 'Run ldd'}
                </button>
              </div>

              {lddResult && (
                <div dir="ltr" className="max-h-56 overflow-y-auto os-scroll rounded-xl bg-[#0B1120] border border-slate-800 p-3 space-y-1.5 font-mono-tabular text-[11px]">
                  <div className="text-[#D6A63B] pb-1 border-b border-slate-800">
                    Target: {lddResult.path}
                  </div>
                  {lddResult.libraries.map((lib, idx) => (
                    <div key={`${lib.name}-${idx}`} className="flex items-center justify-between gap-3">
                      <span className="text-slate-200">{lib.name}</span>
                      <span className={lib.isMissing ? 'text-rose-400 font-bold' : 'text-[#2DD4BF] truncate'}>
                        {lib.isMissing ? 'NOT FOUND' : lib.resolvedPath}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: Android Apps (Waydroid / KVM Real Check — Zero Fake APK Execution) */}
        {tab === 'android' && (
          <div className="space-y-5">
            <section className="rounded-xl bg-[#070b14] border border-slate-800 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-[#2DD4BF]" />
                    <span>{isAr ? 'بيئة تشغيل تطبيقات Android (Waydroid LXC)' : 'Android Container Runtime (Waydroid)'}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr
                      ? 'يفحص جاهزية /dev/kvm وحزمة Waydroid والذاكرة الفعلية (>= 2 GB) قبل السماح بتشغيل ملفات APK.'
                      : 'Verifies /dev/kvm virtualization, Waydroid binary, and >= 2GB RAM before enabling APK execution.'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={settingUpWaydroid || !androidRamGuard.allowed}
                  onClick={() => void handleSetupWaydroid()}
                  className="px-4 py-2 rounded-xl bg-[#D6A63B] hover:brightness-110 text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {settingUpWaydroid
                      ? isAr
                        ? 'جاري التحقق والتجهيز...'
                        : 'Checking Setup...'
                      : isAr
                      ? 'تجهيز Waydroid بنقرة واحدة'
                      : '1-Click Waydroid Setup'}
                  </span>
                </button>
              </div>

              {/* Honest Hardware & Runtime Requirement Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl bg-[#0B1120] border border-slate-800 p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white">Waydroid Binary</div>
                    <div className="text-[11px] text-slate-400">apt install waydroid</div>
                  </div>
                  {report?.waydroidInstalled ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2DD4BF]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'مثبت' : 'Installed'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300">
                      <XCircle className="w-4 h-4" />
                      <span>{isAr ? 'غير مثبت' : 'Not Installed'}</span>
                    </span>
                  )}
                </div>

                <div className="rounded-xl bg-[#0B1120] border border-slate-800 p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white">
                      {isAr ? 'تسريع العتاد (/dev/kvm)' : 'Hardware Virtualization (/dev/kvm)'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {report?.cpuVirtualization ? 'VT-x / AMD-V Supported' : 'Kernel KVM node check'}
                    </div>
                  </div>
                  {report?.kvmAvailable ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2DD4BF]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'متاح' : 'Available'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
                      <XCircle className="w-4 h-4" />
                      <span>{isAr ? 'غير مفعّل' : 'Unavailable'}</span>
                    </span>
                  )}
                </div>

                <div className="rounded-xl bg-[#0B1120] border border-slate-800 p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white">
                      {isAr ? 'الحد الأدنى للرامات (>= 2 GB)' : 'Minimum RAM Guard (>= 2 GB)'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {report ? `${report.totalMb} MB Total · ${report.availableMb} MB Free` : '...'}
                    </div>
                  </div>
                  {androidRamGuard.allowed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2DD4BF]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'متوافق' : 'Passed'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{isAr ? 'غير كافٍ' : 'Blocked'}</span>
                    </span>
                  )}
                </div>

                <div className="rounded-xl bg-[#0B1120] border border-slate-800 p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white">
                      {isAr ? 'وضع التشغيل الافتراضي' : 'Boot Daemon Policy'}
                    </div>
                    <div className="text-[11px] text-slate-400">On-demand container only</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#D6A63B]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isAr ? 'مُعطل عند الإقلاع' : 'Zero Boot Overhead'}</span>
                  </span>
                </div>
              </div>

              {(!report?.waydroidInstalled || !report?.kvmAvailable || !androidRamGuard.allowed) && (
                <div className="rounded-xl bg-[#0B1120] border border-amber-400/35 p-4 text-xs text-amber-100 leading-relaxed">
                  {!androidRamGuard.allowed
                    ? isAr
                      ? androidRamGuard.messageAr
                      : androidRamGuard.messageEn
                    : isAr
                    ? 'لن يقوم KemetOS بتشغيل محاكاة وهمية لملفات APK: لتشغيل تطبيقات Android فعلياً يلزم تفعيل Waydroid ووجود /dev/kvm في جلسة Debian ISO أو تفعيل KVM في BIOS.'
                    : 'KemetOS never fakes APK execution: real Waydroid setup requires /dev/kvm hardware virtualization and Waydroid packages inside the Debian ISO.'}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 4: Diagnostics & Execution Logs */}
        {tab === 'logs' && (
          <div className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-[#D6A63B]">
                {isAr ? 'تشخيص أسباب فشل التشغيل وحلولها' : 'Human-Readable Compatibility Diagnostics'}
              </h3>

              {diagnostics.length === 0 ? (
                <div className="rounded-xl bg-[#070b14] border border-[#2DD4BF]/30 p-5 flex items-center gap-3 text-xs text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-[#2DD4BF] shrink-0" />
                  <span>
                    {isAr
                      ? 'لا توجد أخطاء توافق حالية. عند فشل تشغيل أي ملف سيظهر السبب الدقيق وأمر الإصلاح هنا.'
                      : 'No active compatibility errors recorded.'}
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {diagnostics.map((d, idx) => (
                    <div
                      key={`${d.code}-${idx}`}
                      className="rounded-xl bg-[#070b14] border border-amber-400/35 p-4 space-y-2"
                    >
                      <div className="text-xs font-bold text-[#D6A63B]">
                        {isAr ? d.titleAr : d.titleEn}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {isAr ? d.reasonAr : d.reasonEn}
                      </p>
                      {d.fixCommand && (
                        <div dir="ltr" className="p-2.5 rounded-lg bg-[#0B1120] border border-slate-800 font-mono-tabular text-[11px] text-[#2DD4BF]">
                          {d.fixCommand}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl bg-[#070b14] border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#2DD4BF]">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" />
                  <span>{isAr ? 'السجل الزمني لبيئات المحاكاة' : 'Compatibility Execution Log'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  {isAr ? 'مسح' : 'Clear'}
                </button>
              </div>
              <div dir="ltr" className="max-h-56 overflow-y-auto os-scroll font-mono-tabular text-[11px] space-y-1.5">
                {logs.map((l) => (
                  <div
                    key={l.id}
                    className={
                      l.level === 'error'
                        ? 'text-rose-300'
                        : l.level === 'warn'
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                    }
                  >
                    [{new Date(l.at).toLocaleTimeString('en-US')}] [{l.source}] {l.text}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
