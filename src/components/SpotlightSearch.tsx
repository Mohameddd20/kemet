import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, Search, Terminal, X } from 'lucide-react';
import { APP_CATALOG } from '../apps/appCatalog';
import { openOsApp } from '../apps/registry';
import { useSettingsStore } from '../system/settingsStore';

interface SpotlightSearchProps {
  onClose: () => void;
}

interface SpotlightResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'app' | 'calc';
  action: () => void;
}

export const SpotlightSearch = memo(function SpotlightSearch({ onClose }: SpotlightSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const installedStoreApps = useSettingsStore((s) => s.installedStoreApps);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results: SpotlightResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return APP_CATALOG.slice(0, 6).map((app) => ({
        id: app.id,
        title: app.title,
        subtitle: app.description,
        type: 'app' as const,
        action: () => {
          openOsApp(app.id);
        },
      }));
    }

    const matchedApps = APP_CATALOG.filter(
      (a) => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    ).map((a) => ({
      id: a.id,
      title: a.title,
      subtitle: a.description,
      type: 'app' as const,
      action: () => {
        openOsApp(a.id);
      },
    }));

    const matchedStore = installedStoreApps
      .filter((sa) => sa.name.toLowerCase().includes(q))
      .map((sa) => ({
        id: sa.id,
        title: sa.name,
        subtitle: `Installed Store App (${sa.category})`,
        type: 'app' as const,
        action: () => {
          openOsApp('store');
        },
      }));

    // Quick calculation if query looks like math (e.g. 2+2)
    let calcResult: string | null = null;
    if (/^[0-9+\-*/().\s]+$/.test(q) && q.length >= 2) {
      try {
        const val = Function(`'use strict'; return (${q})`)();
        if (typeof val === 'number' && !Number.isNaN(val)) {
          calcResult = String(val);
        }
      } catch {
        // Ignore parse error
      }
    }

    const list: SpotlightResult[] = [...matchedApps, ...matchedStore];
    if (calcResult) {
      const resVal = calcResult;
      list.unshift({
        id: 'calc-res',
        title: `= ${resVal}`,
        subtitle: `Calculation result for "${q}"`,
        type: 'calc' as const,
        action: () => {
          navigator.clipboard?.writeText(resVal);
          openOsApp('calculator');
        },
      });
    }

    return list;
  }, [query, installedStoreApps]);

  return (
    <div
      role="dialog"
      aria-label="Spotlight Quick Launcher"
      className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && results.length > 0) {
                results[0].action();
                onClose();
              }
            }}
            placeholder="Search apps, files, math, or commands..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1 os-scroll">
          {results.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No results found for "{query}". Press Enter to run in terminal.
            </div>
          ) : (
            results.map((item, idx) => (
              <button
                key={item.id + idx}
                type="button"
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-md bg-slate-800 text-sky-300 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                    {item.type === 'calc' ? <Calculator className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">{item.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-300">
                  Press Enter ↵
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
});
