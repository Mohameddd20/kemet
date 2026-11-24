import { useEffect } from 'react';
import type { ComponentType } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  danger?: boolean;
  dividerBefore?: boolean;
  onSelect: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const menuWidth = 208;
  const approxHeight = items.length * 36 + 16;
  const maxX = typeof window !== 'undefined' ? window.innerWidth - menuWidth - 12 : x;
  const maxY = typeof window !== 'undefined' ? window.innerHeight - approxHeight - 12 : y;
  const clampedX = Math.max(8, Math.min(x, maxX));
  const clampedY = Math.max(8, Math.min(y, maxY));

  return (
    <div
      role="menu"
      aria-label="Context Menu"
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: clampedX, top: clampedY }}
      className="fixed z-[9998] w-52 rounded-xl os-acrylic os-menu-enter border border-slate-700/80 p-1.5"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id}>
            {item.dividerBefore && <div className="my-1 border-t border-slate-800" />}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                item.onSelect();
                onClose();
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                item.danger
                  ? 'text-red-300 hover:bg-red-600/20 hover:text-red-200'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-85" />}
              <span className="truncate">{item.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
