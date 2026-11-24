import { memo, useState } from 'react';
import { Apple, ChevronDown } from 'lucide-react';
import { useWindowStore } from '../windowManager/useWindowStore';
import { getTopFocusedWindowId } from '../windowManager/windowLogic';
import { openOsApp } from '../apps/registry';

export const TopMenuBar = memo(function TopMenuBar() {
  const windows = useWindowStore((s) => s.windows);
  const topId = getTopFocusedWindowId(windows);
  const activeWin = windows.find((w) => w.id === topId);

  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const appTitle = activeWin ? activeWin.title : 'NizamOS Desktop';

  return (
    <header
      role="banner"
      className="relative z-[9990] flex items-center justify-between h-6 px-3 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 text-[11px] text-slate-200 select-none shrink-0"
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => openOsApp('settings', { initialTab: 'system' })}
          className="flex items-center gap-1.5 hover:text-white transition-colors focus-visible:outline-none"
        >
          <Apple className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-100">NizamOS</span>
        </button>

        <span className="font-medium text-slate-100">{appTitle}</span>

        <div className="hidden sm:flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
              className="px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div
                onMouseLeave={() => setActiveMenu(null)}
                className="absolute top-6 left-0 w-44 py-1 rounded bg-slate-900 border border-slate-700 shadow-xl z-50 text-slate-200"
              >
                <button
                  type="button"
                  onClick={() => {
                    openOsApp('files');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-sky-600 hover:text-white text-[11px]"
                >
                  New Window...
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openOsApp('settings');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-sky-600 hover:text-white text-[11px]"
                >
                  Preferences...
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => openOsApp('editor')}
            className="px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => openOsApp('taskmgr')}
            className="px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => openOsApp('terminal')}
            className="px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
          >
            Window
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-slate-300">
        <span className="font-mono-tabular">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </header>
  );
});
