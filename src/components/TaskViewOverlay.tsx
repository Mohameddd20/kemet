import { Minimize2, X } from 'lucide-react';
import { APP_ICONS } from '../apps/registry';
import { t } from '../system/i18n';
import { useSettingsStore } from '../system/settingsStore';
import { useWindowStore } from '../windowManager/useWindowStore';

interface TaskViewOverlayProps {
  onClose: () => void;
}

export function TaskViewOverlay({ onClose }: TaskViewOverlayProps) {
  const windows = useWindowStore((s) => s.windows);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeAll = useWindowStore((s) => s.minimizeAll);
  const language = useSettingsStore((s) => s.language);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(language, 'taskView')}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9993] bg-slate-950/75 backdrop-blur-2xl flex flex-col p-6 sm:p-10 overflow-y-auto os-scroll"
    >
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto mb-6">
        <div>
          <h2 className="text-base font-semibold text-white">{t(language, 'taskView')}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{t(language, 'newDesktopHint')}</p>
        </div>

        <div className="flex items-center gap-2">
          {windows.length > 0 && (
            <button
              type="button"
              onClick={() => {
                minimizeAll();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>{t(language, 'showDesktop')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Task View"
            className="p-2 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {windows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          {language === 'ar' ? 'لا توجد نوافذ مفتوحة حالياً.' : 'No open windows on this desktop.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl w-full mx-auto">
          {windows.map((win) => {
            const Icon = APP_ICONS[win.appId];
            return (
              <div
                key={win.id}
                className="group rounded-md bg-slate-900/90 border border-slate-700/80 hover:border-[var(--os-accent-border)] overflow-hidden shadow-xl transition-colors flex flex-col"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/70">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-3.5 h-3.5 os-accent-text shrink-0" />
                    <span className="text-xs font-medium text-slate-100 truncate">{win.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => closeWindow(win.id)}
                    aria-label={`Close ${win.title}`}
                    className="p-1 rounded-sm text-slate-400 hover:text-white hover:bg-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    focusWindow(win.id);
                    onClose();
                  }}
                  className="h-36 p-4 flex flex-col items-center justify-center gap-2 text-center hover:bg-slate-800/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-md os-accent-soft-bg border border-[var(--os-accent-border)] flex items-center justify-center">
                    <Icon className="w-6 h-6 os-accent-text" />
                  </div>
                  <div className="text-xs text-slate-300 font-medium">{win.title}</div>
                  <div className="text-[11px] text-slate-500 font-mono-tabular">
                    {win.isMaximized
                      ? 'Maximized'
                      : win.isMinimized
                        ? 'Minimized'
                        : `${win.width}×${win.height}`}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
