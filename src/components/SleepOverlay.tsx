import { useEffect } from 'react';
import { Moon } from 'lucide-react';
import { t } from '../system/i18n';
import { useSettingsStore } from '../system/settingsStore';

interface SleepOverlayProps {
  onWake: () => void;
}

export function SleepOverlay({ onWake }: SleepOverlayProps) {
  const language = useSettingsStore((s) => s.language);

  useEffect(() => {
    const onKey = () => onWake();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onWake]);

  return (
    <button
      type="button"
      onClick={onWake}
      aria-label={t(language, 'wakeHint')}
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center gap-3 text-slate-400 cursor-pointer"
    >
      <Moon className="w-8 h-8 text-slate-600" />
      <div className="text-sm font-medium text-slate-300">{t(language, 'sleeping')}</div>
      <div className="text-xs text-slate-500">{t(language, 'wakeHint')}</div>
    </button>
  );
}
