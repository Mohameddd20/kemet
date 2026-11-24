import { memo, useEffect, useRef, useState } from 'react';
import {
  Battery,
  BatteryCharging,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import {
  isLiteModeEffective,
  useSettingsStore,
} from '../../system/settingsStore';
import {
  fetchBatteryStatus,
  fetchHardwareNetwork,
  freeSystemRam,
  subscribeThrottledTelemetry,
  type RealSystemMetrics,
} from '../../services/systemBridge';
import type { BatteryStatusInfo } from '../../system/systemBridge';
import { KemetLogo } from './KemetLogo';
import { QuickSettings } from './QuickSettings';
import { useWindowStore } from '../../windowManager/useWindowStore';

interface TopTelemetryBarProps {
  onOpenHardwareHub: () => void;
  onOpenSettings: (tab?: string) => void;
}

export const TopTelemetryBar = memo(function TopTelemetryBar({
  onOpenHardwareHub,
  onOpenSettings,
}: TopTelemetryBarProps) {
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const volume = useSettingsStore((s) => s.volume);
  const muted = useSettingsStore((s) => s.muted);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const setMuted = useSettingsStore((s) => s.setMuted);
  const wifiEnabled = useSettingsStore((s) => s.wifiEnabled);
  const clockFormat = useSettingsStore((s) => s.clockFormat);
  const profile = useSettingsStore((s) => s.performanceProfile);
  const liteDetected = useSettingsStore((s) => s.liteModeDetected);

  const isAr = language === 'ar';
  const liteActive = isLiteModeEffective(profile, liteDetected);

  const [metrics, setMetrics] = useState<RealSystemMetrics | null>(null);
  const [battery, setBattery] = useState<BatteryStatusInfo | null>(null);
  const [networkLabel, setNetworkLabel] = useState<string>('eth0');
  const [now, setNow] = useState(() => new Date());
  const [openPopover, setOpenPopover] = useState<'ram' | 'volume' | 'quick' | null>(null);
  const [cleaningRam, setCleaningRam] = useState(false);
  const [freedNotice, setFreedNotice] = useState<string | null>(null);
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const windowFocusSignature = useWindowStore((s) =>
    s.windows.map((w) => `${w.id}:${w.zIndex}:${w.isMinimized ? 1 : 0}`).join('|')
  );

  // Auto-close popover whenever a window is focused or a new app is launched
  useEffect(() => {
    setOpenPopover(null);
  }, [windowFocusSignature]);

  useEffect(() => {
    if (!openPopover) return;
    const handleGlobalPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const inBar = Boolean(topBarRef.current?.contains(target));
      const inPopover = Boolean(popoverRef.current?.contains(target));
      if (!inBar && !inPopover) {
        setOpenPopover(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPopover(null);
      }
    };
    window.addEventListener('pointerdown', handleGlobalPointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', handleGlobalPointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [openPopover]);

  useEffect(() => {
    const interval = liteActive ? 5000 : 2500;
    return subscribeThrottledTelemetry(interval, (data) => {
      setMetrics(data);
    });
  }, [liteActive]);

  useEffect(() => {
    let active = true;
    const probeEnv = async () => {
      try {
        const [bat, net] = await Promise.all([
          fetchBatteryStatus(),
          fetchHardwareNetwork().catch(() => null),
        ]);
        if (!active) return;
        setBattery(bat);
        const connected = net?.wifiNetworks?.find((w: { inUse?: boolean; ssid?: string }) => w.inUse);
        const realNic = net?.interfaces?.find((i: { name: string }) => i.name !== 'lo');
        if (connected?.ssid) setNetworkLabel(connected.ssid);
        else if (realNic?.name) setNetworkLabel(realNic.name);
      } catch {
        // ignore probe errors
      }
    };
    void probeEnv();
    const timer = setInterval(() => void probeEnv(), 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const handleCleanRam = async () => {
    setCleaningRam(true);
    setFreedNotice(null);
    try {
      const res = await freeSystemRam();
      setFreedNotice(
        isAr
          ? `تم تحرير ${res.freedMb} MB (المتاح: ${res.availableMb} MB)`
          : `Freed ${res.freedMb} MB (Avail: ${res.availableMb} MB)`
      );
    } catch {
      setFreedNotice(isAr ? 'تم تحرير الذاكرة المؤقتة.' : 'RAM caches cleared.');
    } finally {
      setCleaningRam(false);
    }
  };

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: clockFormat === '12h',
  });
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}/${now.getFullYear()}`;

  const cpuPct = metrics ? Math.round(metrics.cpuPercent) : 0;
  const ramPct = metrics ? Math.round(metrics.memory.usedPercent) : 0;
  const ramUsedGb = metrics ? (metrics.memory.usedMb / 1024).toFixed(1) : '—';
  const ramTotalGb = metrics ? (metrics.memory.totalMb / 1024).toFixed(1) : '—';

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`fixed top-2.5 left-1/2 -translate-x-1/2 ${
        openPopover ? 'z-[210]' : 'z-50'
      } select-none w-max max-w-[calc(100vw-16px)]`}
    >
      {/* Ultra-Slim Centered Telemetry Pill */}
      <div
        ref={topBarRef}
        dir="ltr"
        className="h-8 px-2 sm:px-3 flex items-center gap-1 sm:gap-3 rounded-full bg-[#0b1324]/92 backdrop-blur-md border border-teal-400/25 shadow-[0_8px_28px_rgba(0,0,0,0.65)] text-[10px] sm:text-[11px] whitespace-nowrap overflow-x-auto [scrollbar-width:none]"
      >
        <button
          type="button"
          onClick={onOpenHardwareHub}
          className="flex items-center gap-1.5 text-amber-300 font-bold hover:text-amber-200 transition-colors cursor-pointer shrink-0"
        >
          <KemetLogo className="w-4 h-4 rounded-full" />
          <span>KemetOS</span>
          {liteActive && <Zap className="w-3 h-3 text-teal-300" aria-label="Ultra-Lite Mode" />}
        </button>

        {/* Mini Telemetry Meter */}
        <button
          type="button"
          onClick={() => setOpenPopover(openPopover === 'ram' ? null : 'ram')}
          className="flex items-center gap-2 text-slate-200 hover:text-teal-300 transition-colors cursor-pointer font-mono-tabular shrink-0"
          title={isAr ? 'استهلاك المعالج والذاكرة' : 'CPU & Memory Telemetry'}
        >
          <span className="text-[10px] text-amber-300 font-semibold">{cpuPct}%</span>
          <span className="w-10 h-1.5 rounded-full bg-slate-800 overflow-hidden hidden sm:inline-flex">
            <span
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              style={{ width: `${Math.max(8, Math.min(100, cpuPct))}%` }}
            />
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          <span className="text-[10px] text-teal-300 font-semibold">{ramPct}%</span>
        </button>

        <span className="hidden sm:inline text-slate-700/80">|</span>

        {/* Language Toggle */}
        <button
          type="button"
          onClick={() => setLanguage(isAr ? 'en' : 'ar')}
          className="text-[11px] font-bold text-slate-200 hover:text-teal-300 cursor-pointer shrink-0"
          title={isAr ? 'تبديل اللغة' : 'Switch Language'}
        >
          {isAr ? 'AR' : 'EN'}
        </button>

        {/* Wi-Fi */}
        <button
          type="button"
          onClick={() => onOpenSettings('network')}
          title={wifiEnabled ? networkLabel : 'Offline'}
          className="hidden sm:flex items-center text-slate-300 hover:text-teal-300 transition-colors cursor-pointer shrink-0"
        >
          {wifiEnabled ? (
            <Wifi className="w-3.5 h-3.5 text-teal-300" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {/* Volume */}
        <button
          type="button"
          onClick={() => setOpenPopover(openPopover === 'volume' ? null : 'volume')}
          aria-label="Volume"
          className="text-slate-300 hover:text-teal-300 transition-colors cursor-pointer shrink-0"
        >
          {muted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        {/* Battery if laptop */}
        {battery?.available && battery.percentage !== null && (
          <div className="hidden md:flex items-center gap-1 text-[10px] font-mono-tabular text-slate-300 shrink-0">
            {battery.charging ? (
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Battery className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>{battery.percentage}%</span>
          </div>
        )}

        {/* Quick Settings */}
        <button
          type="button"
          onClick={() => setOpenPopover(openPopover === 'quick' ? null : 'quick')}
          aria-label={isAr ? 'الإعدادات السريعة' : 'Quick Settings'}
          title={isAr ? 'الإعدادات السريعة' : 'Quick Settings'}
          className={`transition-colors cursor-pointer shrink-0 ${
            openPopover === 'quick' ? 'text-teal-300' : 'text-slate-300 hover:text-teal-300'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        <span className="text-slate-700/80 hidden sm:inline">|</span>

        {/* Compact Date + Time */}
        <div className="text-[11px] font-mono-tabular text-slate-200 whitespace-nowrap shrink-0 flex items-center gap-1.5">
          <span className="text-slate-400 hidden sm:inline">{dateStr}</span>
          <span>{timeStr}</span>
        </div>
      </div>

      {/* Popover Wrapper */}
      {openPopover && (
        <div ref={popoverRef}>
          {openPopover === 'quick' && (
            <QuickSettings
              onClose={() => setOpenPopover(null)}
              onOpenSettings={onOpenSettings}
            />
          )}

          {openPopover === 'ram' && (
            <div className="mt-2 mx-auto w-72 rounded-2xl bg-[#0B1120] border border-teal-400/25 p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-amber-300">{isAr ? 'استهلاك الموارد' : 'Live Resources'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setOpenPopover(null);
                    onOpenSettings('performance');
                  }}
                  className="text-[11px] text-teal-300 hover:underline cursor-pointer"
                >
                  {isAr ? 'إعدادات الأداء' : 'Performance'}
                </button>
              </div>

              <div className="space-y-1.5 text-xs font-mono-tabular">
                <div className="flex justify-between text-slate-300">
                  <span>{isAr ? 'المعالج:' : 'CPU:'}</span>
                  <span className="text-teal-300">{cpuPct}%</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>{isAr ? 'الذاكرة:' : 'RAM:'}</span>
                  <span className="text-amber-200">
                    {ramUsedGb} / {ramTotalGb} GB
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 to-amber-400"
                    style={{ width: `${Math.min(100, ramPct)}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleCleanRam()}
                disabled={cleaningRam}
                className="w-full py-2 px-3 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{cleaningRam ? (isAr ? 'جاري...' : 'Cleaning...') : isAr ? 'تحرير الرامات' : 'Clean RAM'}</span>
              </button>

              {freedNotice && (
                <div className="text-[11px] text-emerald-300 text-center">{freedNotice}</div>
              )}
            </div>
          )}

          {openPopover === 'volume' && (
            <div className="mt-2 mx-auto w-64 rounded-2xl bg-[#0B1120] border border-teal-400/25 p-4 shadow-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span>{isAr ? 'الصوت' : 'Volume'}</span>
                <span className="font-mono-tabular text-teal-300">{muted ? '0%' : `${volume}%`}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMuted(!muted)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-teal-300" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
