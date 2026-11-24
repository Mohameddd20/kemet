import { useEffect, type ReactNode } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  dividerBefore?: boolean;
  onSelect: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  isRtl?: boolean;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, isRtl = true, items, onClose }: ContextMenuProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
  const menuW = 220;
  const menuH = items.length * 36 + 16;

  const left = Math.min(Math.max(12, x), Math.max(12, vw - menuW - 12));
  const top = Math.min(Math.max(12, y), Math.max(12, vh - menuH - 12));

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ top, left }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-[300] w-[220px] rounded-2xl bg-[#0B1120] border border-amber-400/25 p-1.5 shadow-2xl text-xs space-y-0.5 os-menu-enter"
    >
      {items.map((item) => (
        <div key={item.id}>
          {item.dividerBefore && <div className="my-1 h-px bg-slate-800/90" />}
          <button
            type="button"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onSelect();
              onClose();
            }}
            className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-right rtl:text-right ltr:text-left transition-colors ${
              item.disabled
                ? 'text-slate-600 opacity-60 cursor-not-allowed'
                : item.danger
                ? 'text-rose-300 hover:bg-rose-500/15 cursor-pointer'
                : 'text-slate-200 hover:bg-slate-800/80 hover:text-amber-200 cursor-pointer'
            }`}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span className="truncate font-medium">{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
