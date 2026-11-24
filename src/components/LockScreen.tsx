import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Power, ShieldCheck, Wifi } from 'lucide-react';
import { useSettingsStore } from '../system/settingsStore';
import { KemetLogo } from './os/KemetLogo';

interface LockScreenProps {
  wallpaperUrl?: string;
  solidColor?: string;
  onUnlock: () => void;
}

export function LockScreen({ wallpaperUrl, solidColor, onUnlock }: LockScreenProps) {
  const username = useSettingsStore((s) => s.username);
  const password = useSettingsStore((s) => s.password);
  const language = useSettingsStore((s) => s.language);
  const clockFormat = useSettingsStore((s) => s.clockFormat);
  const wifiEnabled = useSettingsStore((s) => s.wifiEnabled);

  const [isLoginView, setIsLoginView] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [enteredPass, setEnteredPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAr = language === 'ar';

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password && enteredPass !== password) {
      setError(
        isAr
          ? 'كلمة المرور غير صحيحة. يرجى التحقق من كلمة المرور المحفوظة في الإعدادات.'
          : 'Incorrect password. Check your saved credentials in Settings.'
      );
      return;
    }
    setError(null);
    setEnteredPass('');
    onUnlock();
  };

  const timeStr = now.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: clockFormat === '12h',
  });
  const dateStr = now.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="KemetOS Login Screen"
      dir={isAr ? 'rtl' : 'ltr'}
      style={solidColor ? { backgroundColor: solidColor } : undefined}
      onClick={() => {
        if (!isLoginView) setIsLoginView(true);
      }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070b14] text-slate-100 overflow-hidden select-none"
    >
      {wallpaperUrl && (
        <img
          src={wallpaperUrl}
          alt="KemetOS Wallpaper"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          className="kemet-wallpaper-img absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
        />
      )}
      <div className="absolute inset-0 bg-[#070b14]/75 backdrop-blur-xl pointer-events-none" />

      {/* Top Ambient Status Strip */}
      <div className="absolute top-5 sm:top-6 inset-x-4 sm:inset-x-8 z-20 flex items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2 min-w-0">
          <KemetLogo className="w-7 h-7 rounded-lg shrink-0" />
          <span className="font-bold tracking-wide text-amber-300 whitespace-nowrap">KemetOS 1.0</span>
          <span className="text-slate-500 hidden sm:inline">·</span>
          <span className="text-cyan-300 font-mono-tabular truncate hidden sm:inline">Debian Bookworm amd64</span>
        </div>
        <div className="font-mono-tabular text-slate-300 whitespace-nowrap shrink-0">{timeStr}</div>
      </div>

      {!isLoginView ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsLoginView(true);
          }}
          className="relative z-10 flex flex-col items-center justify-center h-full w-full cursor-pointer text-center px-6"
        >
          <KemetLogo className="w-28 h-28 mb-5 rounded-3xl border border-amber-400/35 shadow-2xl" />
          <div className="text-6xl sm:text-7xl font-bold tracking-tight font-mono-tabular text-white">
            {timeStr}
          </div>
          <div className="text-base sm:text-lg font-medium text-amber-200/90 mt-2">{dateStr}</div>
          <div className="mt-10 text-xs text-cyan-300 font-medium">
            {isAr ? 'اضغط في أي مكان لتسجيل الدخول إلى كيميت' : 'Click anywhere to sign in to KemetOS'}
          </div>
        </div>
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 flex flex-col items-center w-full max-w-md px-6 text-center"
        >
          <div className="w-full rounded-3xl bg-[#0b1120]/90 backdrop-blur-2xl border border-amber-400/25 p-7 shadow-2xl">
            {/* Cyber-Pharaonic Golden Falcon Logo */}
            <div className="mx-auto w-28 h-28 rounded-3xl bg-[#070b14] border-2 border-amber-400/50 shadow-2xl flex items-center justify-center mb-4 p-1.5">
              <KemetLogo className="w-full h-full rounded-2xl" />
            </div>

            <div className="text-xl font-bold text-white tracking-wide">
              {username}@kemetos
            </div>
            <div className="text-xs text-amber-300/90 mt-1 mb-5 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'كيميت أو إس 1.0 — جلسة النظام السيادي' : 'KemetOS 1.0 Sovereign Linux Session'}</span>
            </div>

            <form onSubmit={handleLoginSubmit} className="w-full space-y-3.5">
              <div className="relative flex items-center">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoFocus
                  value={enteredPass}
                  onChange={(e) => {
                    setEnteredPass(e.target.value);
                    if (error) setError(null);
                  }}
                  aria-label="Account password"
                  placeholder={
                    password
                      ? isAr
                        ? 'أدخل كلمة المرور'
                        : 'Enter password'
                      : isAr
                      ? 'اضغط دخول لفتح الجلسة المباشرة (بدون كلمة مرور)'
                      : 'Press Sign In to enter Live Session'
                  }
                  className="w-full bg-[#070b14]/90 border border-slate-700/80 rounded-xl py-3 rtl:pr-4 rtl:pl-10 ltr:pl-4 ltr:pr-10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Toggle password visibility"
                  className="absolute left-3 rtl:left-3 ltr:right-3 text-slate-400 hover:text-cyan-300 cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-l from-amber-500 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isAr ? 'دخول إلى سطح مكتب كيميت' : 'Sign in to KemetOS'}</span>
                {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>

              {error && <div className="text-[11px] text-rose-400 font-medium">{error}</div>}
            </form>

            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
              <button
                type="button"
                onClick={() => setIsLoginView(false)}
                className="flex items-center gap-1 hover:text-amber-300 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isAr ? 'شاشة الساعة' : 'Clock Screen'}</span>
              </button>
              <span className="font-mono-tabular text-cyan-400">
                {isAr ? `كلمة مرور sudo: 1234` : `Live sudo: 1234`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Corner Status & Power Tray */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2.5">
        <div
          title={wifiEnabled ? 'Wi-Fi Ready' : 'Wi-Fi Off'}
          className="p-2.5 rounded-xl bg-[#0b1120]/85 border border-amber-400/20 text-cyan-300"
        >
          <Wifi className="w-4 h-4" />
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          title={isAr ? 'إعادة تشغيل الجلسة' : 'Reload Session'}
          className="p-2.5 rounded-xl bg-[#0b1120]/85 border border-amber-400/20 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <Power className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
