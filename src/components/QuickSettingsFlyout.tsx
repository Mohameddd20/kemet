import { useEffect, useState } from 'react';
import {
  Battery,
  BatteryCharging,
  Bluetooth,
  Contrast,
  Lock,
  Moon,
  Network,
  Plane,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Sun,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { openOsApp } from '../apps/registry';
import { t } from '../system/i18n';
import { useNotificationStore } from '../system/notificationStore';
import { useSettingsStore } from '../system/settingsStore';
import {
  connectWifiNetwork,
  fetchBatteryStatus,
  fetchHardwareControls,
  fetchHardwareNetwork,
  type BatteryStatusInfo,
  type HardwareControlStatus,
  type HardwareNetworkInfo,
} from '../system/systemBridge';

interface QuickSettingsFlyoutProps {
  isBrowserOnline: boolean;
  onClose: () => void;
}

export function QuickSettingsFlyout({ isBrowserOnline, onClose }: QuickSettingsFlyoutProps) {
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const language = useSettingsStore((s) => s.language);
  const taskbarPosition = useSettingsStore((s) => s.taskbarPosition);
  const wifiEnabled = useSettingsStore((s) => s.wifiEnabled);
  const bluetoothEnabled = useSettingsStore((s) => s.bluetoothEnabled);
  const airplaneMode = useSettingsStore((s) => s.airplaneMode);
  const batterySaver = useSettingsStore((s) => s.batterySaver);
  const nightLight = useSettingsStore((s) => s.nightLight);
  const accessibilityHighContrast = useSettingsStore((s) => s.accessibilityHighContrast);
  const brightness = useSettingsStore((s) => s.brightness);
  const volume = useSettingsStore((s) => s.volume);
  const muted = useSettingsStore((s) => s.muted);

  const setWifiEnabled = useSettingsStore((s) => s.setWifiEnabled);
  const setBluetoothEnabled = useSettingsStore((s) => s.setBluetoothEnabled);
  const setAirplaneMode = useSettingsStore((s) => s.setAirplaneMode);
  const setBatterySaver = useSettingsStore((s) => s.setBatterySaver);
  const setNightLight = useSettingsStore((s) => s.setNightLight);
  const setAccessibilityHighContrast = useSettingsStore((s) => s.setAccessibilityHighContrast);
  const setBrightness = useSettingsStore((s) => s.setBrightness);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const setMuted = useSettingsStore((s) => s.setMuted);

  const [showWifiDrawer, setShowWifiDrawer] = useState(false);
  const [netInfo, setNetInfo] = useState<HardwareNetworkInfo | null>(null);
  const [hwControls, setHwControls] = useState<HardwareControlStatus | null>(null);
  const [battery, setBattery] = useState<BatteryStatusInfo | null>(null);
  const [scanningNet, setScanningNet] = useState(false);
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [wifiPassword, setWifiPassword] = useState('');
  const [connectMessage, setConnectMessage] = useState<string | null>(null);

  const loadNetwork = async () => {
    setScanningNet(true);
    try {
      const info = await fetchHardwareNetwork();
      setNetInfo(info);
    } catch {
      // Ignore transient network scan errors
    } finally {
      setScanningNet(false);
    }
  };

  useEffect(() => {
    void loadNetwork();
    void fetchHardwareControls().then(setHwControls).catch(() => undefined);
    void fetchBatteryStatus().then(setBattery).catch(() => undefined);
  }, []);

  const handleWifiConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSsid) return;
    const res = await connectWifiNetwork(selectedSsid, wifiPassword);
    if (res.ok) {
      setConnectMessage(res.message ?? `Connected to ${selectedSsid}`);
      pushNotification('Wi-Fi Connected', `Connected to ${selectedSsid}.`, 'system');
      setSelectedSsid(null);
      setWifiPassword('');
      void loadNetwork();
    } else {
      setConnectMessage(res.error ?? 'Connection failed');
    }
  };

  const effectiveOnline = wifiEnabled && !airplaneMode && isBrowserOnline;
  const edgeSide = language === 'ar' ? 'left-2' : 'right-2';
  const anchorClass =
    taskbarPosition === 'top' ? `top-11 ${edgeSide}` : `bottom-11 ${edgeSide}`;

  return (
    <aside
      role="dialog"
      aria-label={t(language, 'quickSettings')}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      onMouseDown={(e) => e.stopPropagation()}
      className={`fixed ${anchorClass} z-[9992] w-80 sm:w-[360px] rounded-lg os-acrylic os-flyout-enter border border-slate-700/80 overflow-hidden`}
    >
      {/* Wi-Fi Scan Subview or Quick Action Grid */}
      {showWifiDrawer ? (
        <div className="p-3.5 space-y-3 max-h-[340px] overflow-y-auto os-scroll">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
              <Network className="w-4 h-4 os-accent-text" />
              <span>{t(language, 'wifi')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void loadNetwork()}
                aria-label="Scan Wi-Fi"
                className="p-1.5 rounded-sm text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanningNet ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowWifiDrawer(false)}
                className="px-2.5 py-1 rounded-sm bg-slate-800 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                {language === 'ar' ? 'رجوع' : 'Back'}
              </button>
            </div>
          </div>

          {netInfo && (
            <div className="p-2.5 rounded-sm bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
              {netInfo.reason}
            </div>
          )}

          {netInfo?.wifiHardwareAvailable && netInfo.wifiNetworks.length > 0 && (
            <div className="space-y-1.5">
              {netInfo.wifiNetworks.map((net) => (
                <div
                  key={net.ssid}
                  className="flex items-center justify-between p-2 rounded-sm bg-slate-950/70 border border-slate-800 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-100 truncate">
                      {net.ssid} {net.inUse ? '(Connected)' : ''}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono-tabular">
                      {net.signal}% · {net.security}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSsid(net.ssid)}
                    className="px-2.5 py-1 rounded-sm os-accent-bg text-[11px] text-white shrink-0"
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedSsid && (
            <form
              onSubmit={(e) => void handleWifiConnect(e)}
              className="p-2.5 rounded-sm bg-slate-800/80 border border-slate-700 space-y-2"
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-100">
                <Lock className="w-3.5 h-3.5 os-accent-text" />
                <span>{selectedSsid}</span>
              </div>
              <input
                type="password"
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                placeholder="Wi-Fi password..."
                className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2.5 py-1.5 text-xs text-slate-100"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSsid(null)}
                  className="px-2.5 py-1 rounded-sm bg-slate-700 text-xs text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-sm os-accent-bg text-xs text-white font-medium"
                >
                  Join
                </button>
              </div>
            </form>
          )}

          {connectMessage && <div className="text-[11px] text-amber-300">{connectMessage}</div>}

          {netInfo && netInfo.interfaces.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-slate-400">Host Interfaces</div>
              {netInfo.interfaces.map((iface) => (
                <div
                  key={`${iface.name}-${iface.address}`}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-sm bg-slate-950/70 border border-slate-800 text-[11px]"
                >
                  <span className="font-mono text-slate-200">{iface.name}</span>
                  <span className="font-mono-tabular text-slate-400">{iface.address}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3.5 space-y-3.5">
          {/* 6-Tile Windows Quick Action Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex rounded-sm overflow-hidden border border-slate-700/70">
              <button
                type="button"
                role="switch"
                aria-checked={effectiveOnline}
                onClick={() => setWifiEnabled(!wifiEnabled)}
                className={`flex-1 flex flex-col items-start gap-1.5 p-2.5 text-start transition-colors ${
                  effectiveOnline
                    ? 'os-accent-bg text-white'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {effectiveOnline ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span className="text-[11px] font-medium truncate w-full">
                  {t(language, 'wifi')}
                </span>
              </button>
              <button
                type="button"
                aria-label="Inspect Wi-Fi Networks"
                onClick={() => {
                  setShowWifiDrawer(true);
                  void loadNetwork();
                }}
                className={`px-1.5 border-s border-black/20 flex items-center justify-center transition-colors ${
                  effectiveOnline
                    ? 'os-accent-bg text-white/90 hover:brightness-110'
                    : 'bg-slate-800/90 text-slate-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={bluetoothEnabled}
              onClick={() => setBluetoothEnabled(!bluetoothEnabled)}
              className={`flex flex-col items-start gap-1.5 p-2.5 rounded-sm border text-start transition-colors ${
                bluetoothEnabled
                  ? 'os-accent-bg border-transparent text-white'
                  : 'bg-slate-800/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Bluetooth className="w-4 h-4" />
              <span className="text-[11px] font-medium truncate w-full">
                {t(language, 'bluetooth')}
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={airplaneMode}
              onClick={() => setAirplaneMode(!airplaneMode)}
              className={`flex flex-col items-start gap-1.5 p-2.5 rounded-sm border text-start transition-colors ${
                airplaneMode
                  ? 'os-accent-bg border-transparent text-white'
                  : 'bg-slate-800/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Plane className="w-4 h-4" />
              <span className="text-[11px] font-medium truncate w-full">
                {t(language, 'airplaneMode')}
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={batterySaver}
              onClick={() => setBatterySaver(!batterySaver)}
              className={`flex flex-col items-start gap-1.5 p-2.5 rounded-sm border text-start transition-colors ${
                batterySaver
                  ? 'os-accent-bg border-transparent text-white'
                  : 'bg-slate-800/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span className="text-[11px] font-medium truncate w-full">
                {t(language, 'batterySaver')}
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={nightLight}
              onClick={() => setNightLight(!nightLight)}
              className={`flex flex-col items-start gap-1.5 p-2.5 rounded-sm border text-start transition-colors ${
                nightLight
                  ? 'os-accent-bg border-transparent text-white'
                  : 'bg-slate-800/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span className="text-[11px] font-medium truncate w-full">
                {t(language, 'nightLight')}
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={accessibilityHighContrast}
              onClick={() => setAccessibilityHighContrast(!accessibilityHighContrast)}
              className={`flex flex-col items-start gap-1.5 p-2.5 rounded-sm border text-start transition-colors ${
                accessibilityHighContrast
                  ? 'os-accent-bg border-transparent text-white'
                  : 'bg-slate-800/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Contrast className="w-4 h-4" />
              <span className="text-[11px] font-medium truncate w-full">
                {t(language, 'accessibility')}
              </span>
            </button>
          </div>

          {/* Sliders */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2.5">
              <Sun className="w-4 h-4 text-slate-300 shrink-0" />
              <input
                type="range"
                min={40}
                max={110}
                value={brightness}
                aria-label={t(language, 'brightness')}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="flex-1 accent-[var(--os-accent-hover)] cursor-pointer"
              />
              <span className="w-9 text-end text-[11px] font-mono-tabular text-slate-300">
                {brightness}%
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMuted(!muted)}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="text-slate-300 hover:text-white shrink-0"
              >
                {muted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-slate-200" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                aria-label={t(language, 'volume')}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 accent-[var(--os-accent-hover)] cursor-pointer"
              />
              <span className="w-9 text-end text-[11px] font-mono-tabular text-slate-300">
                {muted ? 0 : volume}%
              </span>
            </div>
          </div>

          {hwControls && (
            <div className="text-[10px] text-slate-400 leading-tight">{hwControls.notes}</div>
          )}
        </div>
      )}

      {/* Footer: Live Battery Status & All Settings */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-slate-800 bg-slate-950/80 text-xs">
        <button
          type="button"
          onClick={() => {
            openOsApp('settings', { initialTab: 'power' });
            onClose();
          }}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
        >
          {battery?.charging ? (
            <BatteryCharging className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Battery className="w-4 h-4 os-accent-text shrink-0" />
          )}
          <span className="font-mono-tabular text-[11px]">
            {battery?.available && battery.percentage !== null
              ? `${battery.percentage}%${battery.timeRemaining ? ` · ${battery.timeRemaining}` : ''}`
              : t(language, 'acPower')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            openOsApp('settings', { initialTab: 'system' });
            onClose();
          }}
          aria-label={t(language, 'allSettings')}
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{t(language, 'allSettings')}</span>
        </button>
      </div>
    </aside>
  );
}
