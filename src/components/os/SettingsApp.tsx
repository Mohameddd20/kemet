import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Gauge,
  Image as ImageIcon,
  Info,
  RefreshCw,
  Shield,
  Volume2,
  Wifi,
} from 'lucide-react';
import {
  ACCENT_PALETTES,
  useSettingsStore,
  type AccentColorId,
} from '../../system/settingsStore';
import { PRESET_WALLPAPERS } from '../../system/wallpapers';
import {
  connectWifiNetwork,
  fetchHardwareNetwork,
  fetchRealSystemSpecs,
  fetchSystemHealth,
  type RealHardwareSpecs,
} from '../../services/systemBridge';
import type { HardwareNetworkInfo, SystemHealthReport } from '../../system/systemBridge';
import { openOsApp } from '../../apps/registry';
import type { WindowAppProps } from '../../windowManager/types';
import { PerformanceSettings } from './PerformanceSettings';
import { KemetLogo } from './KemetLogo';

type SettingsTabId = 'appearance' | 'performance' | 'network' | 'audio' | 'updates' | 'account' | 'about';

export function SettingsApp({ initialTab }: WindowAppProps) {
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const wallpaper = useSettingsStore((s) => s.wallpaper);
  const setWallpaper = useSettingsStore((s) => s.setWallpaper);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const volume = useSettingsStore((s) => s.volume);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const brightness = useSettingsStore((s) => s.brightness);
  const setBrightness = useSettingsStore((s) => s.setBrightness);
  const username = useSettingsStore((s) => s.username);
  const password = useSettingsStore((s) => s.password);
  const setCredentials = useSettingsStore((s) => s.setCredentials);

  const isAr = language === 'ar';
  const [tab, setTab] = useState<SettingsTabId>(
    (initialTab as SettingsTabId) || 'performance'
  );
  const [specs, setSpecs] = useState<RealHardwareSpecs | null>(null);
  const [networkInfo, setNetworkInfo] = useState<HardwareNetworkInfo | null>(null);
  const [wifiPass, setWifiPass] = useState('');
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [wifiMsg, setWifiMsg] = useState<string | null>(null);

  const [newUser, setNewUser] = useState(username);
  const [newPass, setNewPass] = useState(password);
  const [savedNotice, setSavedNotice] = useState(false);
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  useEffect(() => {
    void fetchRealSystemSpecs().then(setSpecs);
    void fetchHardwareNetwork().then(setNetworkInfo).catch(() => undefined);
    void fetchSystemHealth().then(setHealth).catch(() => undefined);
  }, []);

  const navTabs: Array<{ id: SettingsTabId; labelAr: string; labelEn: string; icon: typeof Gauge }> = [
    { id: 'performance', labelAr: 'الأداء والطاقة', labelEn: 'Performance & Power', icon: Gauge },
    { id: 'appearance', labelAr: 'المظهر والخلفية', labelEn: 'Appearance', icon: ImageIcon },
    { id: 'network', labelAr: 'الشبكة والواي فاي', labelEn: 'Network & Wi-Fi', icon: Wifi },
    { id: 'audio', labelAr: 'الصوت والسطوع', labelEn: 'Audio & Display', icon: Volume2 },
    { id: 'updates', labelAr: 'التحديثات والأمان', labelEn: 'Updates & Security', icon: RefreshCw },
    { id: 'account', labelAr: 'حساب المستخدم', labelEn: 'Account', icon: Shield },
    { id: 'about', labelAr: 'حول النظام', labelEn: 'About System', icon: Info },
  ];

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="flex-1 min-h-0 flex bg-[#0b1120] text-slate-100 select-none overflow-hidden"
    >
      {/* Clean Category Sidebar */}
      <aside className="w-[210px] shrink-0 bg-[#070b14] border-l rtl:border-l ltr:border-r border-slate-800/90 p-3.5 space-y-1.5 overflow-y-auto os-scroll">
        <div className="px-3 py-2.5 flex items-center gap-2.5 border-b border-slate-800/80 mb-2">
          <KemetLogo className="w-7 h-7 rounded-lg" />
          <div className="text-xs font-bold text-white">
            {isAr ? 'الإعدادات' : 'Settings'}
          </div>
        </div>

        {navTabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-amber-400/15 border border-amber-400/40 text-amber-300'
                  : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{isAr ? item.labelAr : item.labelEn}</span>
            </button>
          );
        })}
      </aside>

      {/* Spacious Scrollable Panel */}
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto os-scroll p-8">
        <div className="max-w-3xl space-y-6 pb-8">
          {tab === 'performance' && <PerformanceSettings ramTotalGb={specs?.ramTotalGb} />}

          {tab === 'appearance' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-base font-bold text-white mb-4">
                  {isAr ? 'خلفيات سطح المكتب' : 'Desktop Wallpapers'}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {PRESET_WALLPAPERS.map((wp) => {
                    const active = wallpaper.kind === 'preset' && wallpaper.id === wp.id;
                    return (
                      <button
                        key={wp.id}
                        type="button"
                        onClick={() => setWallpaper({ kind: 'preset', id: wp.id })}
                        className={`rounded-xl overflow-hidden border transition-colors cursor-pointer text-right ${
                          active ? 'border-amber-400 ring-2 ring-cyan-400/30' : 'border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <img
                          src={wp.url}
                          alt={wp.label}
                          loading="eager"
                          decoding="async"
                          className="w-full h-28 object-cover"
                        />
                        <div className="px-3 py-2 text-xs font-semibold bg-[#070b14] text-slate-200 truncate">
                          {wp.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'لون التمييز واللغة' : 'Accent Color & Language'}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {(Object.keys(ACCENT_PALETTES) as AccentColorId[]).map((id) => {
                    const p = ACCENT_PALETTES[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setAccentColor(id)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer flex items-center gap-2 ${
                          accentColor === id
                            ? 'bg-[#070b14] border-amber-400 text-white'
                            : 'bg-[#070b14]/70 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: p.accent }}
                        />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLanguage('ar')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                      isAr ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    العربية (RTL)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                      !isAr ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    English (LTR)
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'network' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-white">
                {isAr ? 'الشبكة والواي فاي' : 'Network & Wi-Fi'}
              </h3>
              <div className="rounded-xl bg-[#070b14] border border-slate-800 p-4 text-xs text-slate-300">
                {networkInfo?.reason ?? (isAr ? 'جاري فحص بطاقة الشبكة...' : 'Scanning network adapter...')}
              </div>

              {networkInfo?.wifiNetworks.map((net) => (
                <div
                  key={net.ssid}
                  className="rounded-xl bg-[#070b14] border border-slate-800 p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-white">{net.ssid}</div>
                    <div className="text-xs text-slate-400 font-mono-tabular mt-0.5">
                      Signal: {net.signal}% · {net.security || 'Open'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSsid(net.ssid)}
                    className="px-4 py-2 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-200 text-xs font-bold cursor-pointer"
                  >
                    {net.inUse ? (isAr ? 'متصل' : 'Connected') : isAr ? 'اتصال' : 'Connect'}
                  </button>
                </div>
              ))}

              {selectedSsid && (
                <div className="rounded-xl bg-[#070b14] border border-amber-400/35 p-5 space-y-3">
                  <div className="text-xs font-bold text-amber-300">
                    {isAr ? `الاتصال بشبكة: ${selectedSsid}` : `Connect to ${selectedSsid}`}
                  </div>
                  <input
                    type="password"
                    value={wifiPass}
                    onChange={(e) => setWifiPass(e.target.value)}
                    placeholder={isAr ? 'كلمة مرور الشبكة' : 'Wi-Fi Password'}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await connectWifiNetwork(selectedSsid, wifiPass);
                      setWifiMsg(res.message || res.error || 'Done');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    {isAr ? 'اتصال' : 'Connect'}
                  </button>
                  {wifiMsg && <div className="text-xs text-cyan-300">{wifiMsg}</div>}
                </div>
              )}
            </div>
          )}

          {tab === 'audio' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-[#070b14] border border-slate-800 p-5 space-y-3">
                <div className="flex justify-between text-sm font-bold text-white">
                  <span>{isAr ? 'مستوى الصوت' : 'Master Volume'}</span>
                  <span className="font-mono-tabular text-cyan-300">{volume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              <div className="rounded-xl bg-[#070b14] border border-slate-800 p-5 space-y-3">
                <div className="flex justify-between text-sm font-bold text-white">
                  <span>{isAr ? 'سطوع الشاشة' : 'Display Brightness'}</span>
                  <span className="font-mono-tabular text-amber-300">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={110}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          )}

          {tab === 'updates' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-[#070b14] border border-cyan-400/25 p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-400/35 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-teal-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isAr ? 'النظام محدث بالكامل — KemetOS 1.0' : 'System Up to Date — KemetOS 1.0'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {specs?.osName ?? 'Debian 12 Bookworm'} · {specs?.kernel ?? 'Linux'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => openOsApp('updates')}
                    className="px-4 py-2 rounded-xl bg-[#D6A63B] hover:brightness-110 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    {isAr ? 'فتح مدير التحديثات' : 'Open Update Manager'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openOsApp('hardware')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold cursor-pointer"
                  >
                    {isAr ? 'مركز التعريفات' : 'Driver Center'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openOsApp('compatibility')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#2DD4BF] text-xs font-bold cursor-pointer"
                  >
                    {isAr ? 'مركز التوافق والمحاكاة' : 'Compatibility Center'}
                  </button>
                  <button
                    type="button"
                    disabled={checkingUpdates}
                    onClick={async () => {
                      setCheckingUpdates(true);
                      try {
                        const fresh = await fetchSystemHealth();
                        setHealth(fresh);
                      } finally {
                        setCheckingUpdates(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'فحص النظام والتحديثات' : 'Check System & Updates'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {isAr ? 'فحص سلامة النظام والتعريفات' : 'System Integrity & Subsystems'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(health?.checks ?? []).map((chk) => (
                    <div
                      key={chk.id}
                      className="rounded-xl bg-[#070b14] border border-slate-800 p-4 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">
                          {isAr ? chk.arabicTitle : chk.title}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-400">
                          {isAr ? 'سليم' : 'Verified'}
                        </span>
                      </div>
                      <div dir="ltr" className="text-[11px] text-cyan-300 truncate">
                        {chk.device}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{chk.driver}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'account' && (
            <div className="space-y-4 max-w-md rounded-xl bg-[#070b14] border border-slate-800 p-6">
              <h3 className="text-base font-bold text-white">
                {isAr ? 'حساب المستخدم' : 'User Account'}
              </h3>
              <input
                type="text"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                placeholder="Username (default: kemet)"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder={isAr ? 'كلمة المرور لشاشة القفل' : 'Lock Screen Password'}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  setCredentials(newUser, newPass);
                  setSavedNotice(true);
                  setTimeout(() => setSavedNotice(false), 2000);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer"
              >
                {isAr ? 'حفظ' : 'Save'}
              </button>
              {savedNotice && (
                <div className="text-xs text-emerald-300">
                  {isAr ? 'تم حفظ الإعدادات.' : 'Settings saved.'}
                </div>
              )}
            </div>
          )}

          {tab === 'about' && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-[#070b14] border border-slate-800 p-6 flex items-center gap-5">
                <KemetLogo className="w-16 h-16 rounded-2xl border border-amber-400/35 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-white">KemetOS 1.0</h2>
                  <p className="text-xs text-slate-400 font-mono-tabular mt-1">
                    {specs?.osName ?? 'Debian 12 (Bookworm)'} · {specs?.kernel ?? 'Linux'}
                  </p>
                </div>
              </div>

              {specs && (
                <div className="rounded-2xl bg-[#070b14] border border-slate-800 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono-tabular">
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Cpu className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span className="truncate">{specs.cpuModel}</span>
                  </div>
                  <div className="text-amber-200">
                    {isAr ? `الذاكرة: ${specs.ramTotalGb} GB` : `RAM: ${specs.ramTotalGb} GB`}
                  </div>
                  <div className="text-slate-300 truncate">{specs.gpuModel}</div>
                  <div className="text-emerald-300 truncate">{specs.wifiChipset}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
