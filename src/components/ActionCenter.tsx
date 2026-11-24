import { useMemo, useState } from 'react';
import {
  Bell,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { t } from '../system/i18n';
import { useNotificationStore } from '../system/notificationStore';
import { useSettingsStore } from '../system/settingsStore';

interface ActionCenterProps {
  onClose: () => void;
  onOpenQuickSettings: () => void;
}

export function ActionCenter({ onClose, onOpenQuickSettings }: ActionCenterProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const language = useSettingsStore((s) => s.language);
  const clockFormat = useSettingsStore((s) => s.clockFormat);
  const taskbarPosition = useSettingsStore((s) => s.taskbarPosition);

  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

  const calendarCells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: Array<{ day: number; currentMonth: boolean }> = [];
    for (let i = firstWeekday - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, currentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, currentMonth: true });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      cells.push({
        day: cells.length - firstWeekday - daysInMonth + 1,
        currentMonth: false,
      });
    }
    return cells;
  }, [viewDate]);

  const isViewingCurrentMonth =
    viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth();

  const weekdays =
    language === 'ar'
      ? ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب']
      : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const monthTitle = viewDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const fullDateHeading = today.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const edgeSide = language === 'ar' ? 'left-2' : 'right-2';
  const anchorClass =
    taskbarPosition === 'top' ? `top-11 ${edgeSide}` : `bottom-11 ${edgeSide}`;

  return (
    <aside
      role="dialog"
      aria-label={t(language, 'notifications')}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      onMouseDown={(e) => e.stopPropagation()}
      className={`fixed ${anchorClass} z-[9992] w-80 sm:w-[370px] rounded-lg os-acrylic action-center-slide-in border border-slate-700/80 overflow-hidden flex flex-col max-h-[610px]`}
    >
      {/* Notifications Section */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
          <Bell className="w-4 h-4 os-accent-text" />
          <span>
            {t(language, 'notifications')} ({notifications.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-100 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>{t(language, 'clearAll')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Action Center"
            className="p-1 rounded-sm text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto os-scroll p-3 space-y-2 min-h-[120px] max-h-[210px]">
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            {t(language, 'noNotifications')}
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between gap-2 p-2.5 rounded-sm bg-slate-950/75 border border-slate-800/90"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-100">
                  <span className="truncate">{n.title}</span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono-tabular shrink-0">
                    {new Date(n.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: clockFormat === '12h',
                    })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 break-words">{n.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeNotification(n.id)}
                aria-label={`Dismiss ${n.title}`}
                className="p-1 rounded-sm text-slate-500 hover:text-slate-200 hover:bg-slate-800 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Interactive Monthly Calendar */}
      <div className="border-t border-slate-800 bg-slate-950/75 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 os-accent-text" />
            <span className="text-xs font-semibold text-slate-100">{fullDateHeading}</span>
          </div>
          <button
            type="button"
            onClick={onOpenQuickSettings}
            className="flex items-center gap-1 px-2 py-1 rounded-sm bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
          >
            <SlidersHorizontal className="w-3 h-3 os-accent-text" />
            <span>{t(language, 'quickSettings')}</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-medium text-slate-200">{monthTitle}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
              }
              aria-label="Previous month"
              className="p-1 rounded-sm text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
              }
              aria-label="Next month"
              className="p-1 rounded-sm text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdays.map((day) => (
            <div key={day} className="text-[10px] font-medium text-slate-500 py-1">
              {day}
            </div>
          ))}
          {calendarCells.map((cell, idx) => {
            const isToday = isViewingCurrentMonth && cell.currentMonth && cell.day === today.getDate();
            const isSelected = cell.currentMonth && cell.day === selectedDay;
            return (
              <button
                key={`${cell.day}-${idx}`}
                type="button"
                disabled={!cell.currentMonth}
                onClick={() => cell.currentMonth && setSelectedDay(cell.day)}
                className={`h-7 rounded-sm text-[11px] font-mono-tabular transition-colors ${
                  isToday
                    ? 'os-accent-bg text-white font-semibold'
                    : isSelected
                      ? 'border border-[var(--os-accent-border)] text-white bg-slate-800'
                      : cell.currentMonth
                        ? 'text-slate-200 hover:bg-slate-800'
                        : 'text-slate-600'
                }`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
