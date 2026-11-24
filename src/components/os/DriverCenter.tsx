import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Cpu,
  Download,
  Monitor,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Usb,
  Volume2,
  Wifi,
} from 'lucide-react';
import {
  runDriverAction,
  scanFullDrivers,
  type DriverGroupKey,
  type DriverHealthStatus,
  type DriverInventoryItem,
} from '../../services/systemBridge';
import { useSettingsStore } from '../../system/settingsStore';
import { useNotificationStore } from '../../system/notificationStore';

const GROUP_META: Record<
  DriverGroupKey,
  { labelAr: string; labelEn: string; icon: typeof Cpu }
> = {
  cpu: { labelAr: 'المعالج', labelEn: 'Processor', icon: Cpu },
  gpu: { labelAr: 'كرت الشاشة', labelEn: 'Graphics (GPU)', icon: Monitor },
  network: { labelAr: 'الشبكة والواي فاي', labelEn: 'Network & Wi-Fi', icon: Wifi },
  audio: { labelAr: 'الصوت', labelEn: 'Audio Engine', icon: Volume2 },
  camera: { labelAr: 'الكاميرا', labelEn: 'Camera (V4L2)', icon: Camera },
  usb: { labelAr: 'أجهزة USB', labelEn: 'USB Devices', icon: Usb },
};

const GROUP_ORDER: DriverGroupKey[] = ['cpu', 'gpu', 'network', 'audio', 'camera', 'usb'];

export function DriverCenter() {
  const language = useSettingsStore((s) => s.language);
  const pushNotification = useNotificationStore((s) => s.pushNotification);
  const isAr = language === 'ar';

  const [drivers, setDrivers] = useState<DriverInventoryItem[]>([]);
  const [kernelRelease, setKernelRelease] = useState('Linux 6.1-amd64');
  const [scannedAt, setScannedAt] = useState<number | null>(null);
  const [scanning, setScanning] = useState(true);
  const [activeGroup, setActiveGroup] = useState<DriverGroupKey | 'all'>('all');
  const [busyDriverId, setBusyDriverId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const performScan = async () => {
    setScanning(true);
    try {
      const res = await scanFullDrivers();
      if (res.ok && Array.isArray(res.drivers)) {
        setDrivers(res.drivers);
        setKernelRelease(res.kernelRelease || 'Linux 6.1-amd64');
        setScannedAt(res.scannedAt || Date.now());
      }
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    void performScan();
  }, []);

  const visibleGroups = useMemo(() => {
    const keys = activeGroup === 'all' ? GROUP_ORDER : [activeGroup];
    return keys
      .map((key) => ({
        key,
        meta: GROUP_META[key],
        items: drivers.filter((d) => d.group === key),
      }))
      .filter((g) => g.items.length > 0);
  }, [activeGroup, drivers]);

  const counts = useMemo(() => {
    let installed = 0;
    let updates = 0;
    let missing = 0;
    for (const d of drivers) {
      if (d.status === 'installed') installed += 1;
      else if (d.status === 'update-available') updates += 1;
      else missing += 1;
    }
    return { installed, updates, missing };
  }, [drivers]);

  const handleAction = async (
    item: DriverInventoryItem,
    action: 'install' | 'reprobe' | 'rollback'
  ) => {
    setBusyDriverId(item.id);
    try {
      const res = await runDriverAction({
        action,
        kernelModule: item.kernelModule,
        previousModule: item.previousModule,
        aptPackage: item.aptPackage,
      });
      setLogs((prev) => [...prev.slice(-14), ...(res.logs ?? [])]);
      if (res.ok) {
        setDrivers((prev) =>
          prev.map((d) =>
            d.id === item.id
              ? {
                  ...d,
                  kernelModule: res.activeModule || d.kernelModule,
                  status: (res.status as DriverHealthStatus) || 'installed',
                }
              : d
          )
        );
        pushNotification(
          item.name,
          action === 'rollback'
            ? isAr
              ? `تمت استعادة التعريف السابق (${res.activeModule || item.previousModule}).`
              : `Rolled back to ${res.activeModule || item.previousModule}.`
            : action === 'reprobe'
            ? isAr
              ? `تم التحقق من وحدة النواة (${item.kernelModule}).`
              : `Re-probed ${item.kernelModule}.`
            : isAr
            ? `تم تثبيت وتفعيل التعريف (${item.aptPackage}).`
            : `Installed ${item.aptPackage}.`,
          'system'
        );
      }
    } finally {
      setBusyDriverId(null);
    }
  };

  const renderStatusBadge = (status: DriverHealthStatus) => {
    if (status === 'installed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2DD4BF]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isAr ? 'مُثبّت ويعمل' : 'Installed & Active'}</span>
        </span>
      );
    }
    if (status === 'update-available') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D6A63B]">
          <Download className="w-3.5 h-3.5" />
          <span>{isAr ? 'متاح للتحديث' : 'Update Available'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>{isAr ? 'غير مُعرّف' : 'Driver Missing'}</span>
      </span>
    );
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="flex-1 min-h-0 flex flex-col bg-[#0B1120] text-slate-100 overflow-hidden select-none"
    >
      {/* Top Header Strip */}
      <div className="shrink-0 px-6 py-4 bg-[#070b14] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-[#D6A63B]">
              {isAr ? 'مركز التعريفات والأجهزة (Driver Center)' : 'Hardware & Driver Center'}
            </h2>
            <span className="text-[11px] font-mono-tabular text-[#2DD4BF]">
              {kernelRelease}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {isAr
              ? `مفحوص فعلياً: ${counts.installed} يعمل · ${counts.updates} قابل للتحديث · ${counts.missing} يحتاج تعريف`
              : `Live Probe: ${counts.installed} Active · ${counts.updates} Updatable · ${counts.missing} Unconfigured`}
            {scannedAt && (
              <span className="mx-2 text-slate-500">
                ({new Date(scannedAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')})
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void performScan()}
          disabled={scanning}
          className="px-4 py-2 rounded-xl bg-[#2DD4BF] hover:brightness-110 text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{isAr ? 'فحص العتاد الآن' : 'Scan Hardware'}</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="shrink-0 px-6 py-3 bg-[#090f1d] border-b border-slate-800/80 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveGroup('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap border ${
            activeGroup === 'all'
              ? 'bg-[#D6A63B]/15 border-[#D6A63B]/60 text-[#D6A63B]'
              : 'bg-[#070b14] border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          {isAr ? `الكل (${drivers.length})` : `All (${drivers.length})`}
        </button>
        {GROUP_ORDER.map((key) => {
          const Icon = GROUP_META[key].icon;
          const count = drivers.filter((d) => d.group === key).length;
          const active = activeGroup === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveGroup(key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                active
                  ? 'bg-[#2DD4BF]/15 border-[#2DD4BF]/60 text-[#2DD4BF]'
                  : 'bg-[#070b14] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? GROUP_META[key].labelAr : GROUP_META[key].labelEn}</span>
              <span className="text-[10px] opacity-75 font-mono-tabular">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Main Scrollable Groups */}
      <div className="flex-1 min-h-0 overflow-y-auto os-scroll p-6 space-y-6">
        {scanning && drivers.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-[#111827] border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          visibleGroups.map(({ key, meta, items }) => {
            const GroupIcon = meta.icon;
            return (
              <section key={key} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#D6A63B]">
                  <GroupIcon className="w-4 h-4 text-[#2DD4BF]" />
                  <span>{isAr ? meta.labelAr : meta.labelEn}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {items.map((item) => {
                    const isBusy = busyDriverId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl bg-[#070b14] border border-slate-800 hover:border-slate-700 p-4 flex flex-col justify-between gap-3.5"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-white truncate">
                                {item.name}
                              </h3>
                              <div dir="ltr" className="text-[11px] font-mono-tabular text-slate-400 mt-0.5 truncate">
                                {item.vendorDeviceId}
                              </div>
                            </div>
                            <div className="shrink-0">{renderStatusBadge(item.status)}</div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                            <div>
                              <span className="text-slate-500">
                                {isAr ? 'وحدة النواة:' : 'Kernel Module:'}
                              </span>{' '}
                              <span dir="ltr" className="font-mono-tabular text-[#2DD4BF] font-semibold">
                                {item.kernelModule}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-300">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#D6A63B] shrink-0" />
                              <span>{item.repoSource}</span>
                            </div>
                          </div>
                        </div>

                        {/* Safe Driver Action Flow */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/70">
                          <span dir="ltr" className="text-[10px] font-mono-tabular text-slate-500">
                            {item.aptPackage}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleAction(item, 'reprobe')}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>{isAr ? 'إعادة فحص' : 'Re-probe'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleAction(item, 'rollback')}
                              title={isAr ? `استرجاع إلى ${item.previousModule}` : `Rollback to ${item.previousModule}`}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#D6A63B] text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{isAr ? 'استرجاع' : 'Rollback'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleAction(item, 'install')}
                              className="px-3 py-1.5 rounded-lg bg-[#2DD4BF] hover:brightness-110 text-slate-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Download className="w-3 h-3" />
                              <span>
                                {item.status === 'installed'
                                  ? isAr
                                    ? 'تحديث'
                                    : 'Update'
                                  : isAr
                                  ? 'تثبيت التعريف'
                                  : 'Install Driver'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        {/* Live Operation Logs */}
        {logs.length > 0 && (
          <section className="rounded-xl bg-[#070b14] border border-[#2DD4BF]/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#2DD4BF]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>{isAr ? 'سجل عمليات التعريفات المباشر (modprobe / apt)' : 'Live Driver Operation Log'}</span>
              </span>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            </div>
            <div dir="ltr" className="max-h-36 overflow-y-auto os-scroll font-mono-tabular text-[11px] text-emerald-300 space-y-1">
              {logs.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
