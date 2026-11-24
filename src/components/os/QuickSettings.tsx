import { useEffect, useState } from 'react';
import { Moon, Settings, Sun, Volume2, VolumeX, Wifi, WifiOff, Zap } from 'lucide-react';
import { isLiteModeEffective, useSettingsStore } from '../../system/settingsStore';
import { fetchHardwareNetwork } from '../../services/systemBridge';

interface QuickSettingsProps {
  onClose: () => void;
  onOpenSettings: (tab?: string) => void;
}

export function QuickSettings({ onClose, onOpenSettings }: QuickSettingsProps) {
  const language = useSettingsStore((s) => s.language);
  const wifiEnabled = useSettingsStore((s) => s.wifiEnabled);
  const setWifiEnabled = useSettingsStore((s) => s.setWifiEnabled);
  const volume = useSettingsStore((s) => s.volume);
  const muted = useSettingsStore((s) => s.muted);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const setMuted = useSettingsStore((s) => s.setMuted);
  const brightness = useSettingsStore((s) => s.brightness);
  const setBrightness = useSettingsStore((s) => s.setBrightness);
  const nightLight = useSettingsStore((s) => s.nightLight);
  const setNightLight = useSettingsStore((s) => s.setNightLight);
  const performanceProfile = useSettingsStore((s) => s.performanceProfile);
  const setPerformanceProfile = useSettingsStore((s) => s.setPerformanceProfile);
  const liteDetected = useSettingsStore((s) => s.liteModeDetected);

  const isAr = language === 'ar';
  const liteActive = isLiteModeEffective(performanceProfile, liteDetected);
  const [networkName, setNetworkName] = useState<string>(isAr ? 'الشبكة النشطة' : 'Active Network');

  useEffect(() => {
    let active = true;
    void fetchHardwareNetwork()
      .then((net) => {
        if (!active) return;
        const connected = net.wifiNetworks?.find((w) => w.inUse);
        const nic = net.interfaces?.find((i) => !i.internal);
        if (connected?.ssid) setNetworkName(connected.ssid);
        else if (nic?.name) setNetworkName(nic.name);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      onClick={(e) => e.stopPropagation()}
      className="mt-2 mx-auto w-80 rounded-2xl bg-[#0B1120] border border-teal-400/25 p-4 shadow-2xl space-y-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-amber-300">
          {isAr ? 'الإعدادات السريعة' : 'Quick Settings'}
        </span>
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenSettings('performance');
          }}
          className="text-[11px] text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Settings className="w-3 h-3" />
          <span>{isAr ? 'كل الإعدادات' : 'All Settings'}</span>
        </button>
      </div>

      {/* 3 Core Hardware Toggles */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setWifiEnabled(!wifiEnabled)}
          className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-colors ${
            wifiEnabled
              ? 'bg-teal-500/20 border-teal-400/50 text-teal-200'
              : 'bg-[#111827] border-slate-800 text-slate-400'
          }`}
        >
          {wifiEnabled ? <Wifi className="w-4 h-4 text-cyan-300" /> : <WifiOff className="w-4 h-4" />}
          <span className="truncate max-w-full">{wifiEnabled ? networkName : isAr ? 'غير متصل' : 'Off'}</span>
        </button>

        <button
          type="button"
          onClick={() => setNightLight(!nightLight)}
          className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-colors ${
            nightLight
              ? 'bg-amber-400/20 border-amber-400/50 text-amber-200'
              : 'bg-[#111827] border-slate-800 text-slate-400'
          }`}
        >
          <Moon className="w-4 h-4 text-amber-300" />
          <span>{isAr ? 'الوضع الليلي' : 'Night Light'}</span>
        </button>

        <button
          type="button"
          onClick={() => setPerformanceProfile(liteActive ? 'balanced' : 'lite')}
          className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-colors ${
            liteActive
              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
              : 'bg-[#111827] border-slate-800 text-slate-400'
          }`}
        >
          <Zap className="w-4 h-4 text-cyan-300" />
          <span>{isAr ? 'أداء فائق' : 'Ultra-Lite'}</span>
        </button>
      </div>

      {/* Real Hardware Brightness & Volume Sliders */}
      <div className="space-y-3 pt-1 border-t border-slate-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAr ? 'السطوع' : 'Brightness'}</span>
            </span>
            <span className="font-mono-tabular text-amber-200">{brightness}%</span>
          </div>
          <input
            type="range"
            min={40}
            max={110}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              className="flex items-center gap-1.5 cursor-pointer hover:text-white"
            >
              {muted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
              )}
              <span>{isAr ? 'الصوت' : 'Volume'}</span>
            </button>
            <span className="font-mono-tabular text-cyan-200">{muted ? '0%' : `${volume}%`}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
