import { RotateCcw, Trash2 } from 'lucide-react';
import { t } from '../system/i18n';
import { useNotificationStore } from '../system/notificationStore';
import { useSettingsStore } from '../system/settingsStore';
import { useDesktopStore } from '../system/desktopStore';
import { mkdirHost, writeHostFile } from '../services/systemBridge';
import type { AppId } from '../windowManager/types';
import { useVfsStore } from '../vfs/vfsStore';

export function RecycleBinApp() {
  const language = useSettingsStore((s) => s.language);
  const recycleBin = useSettingsStore((s) => s.recycleBin);
  const removeFromRecycleBin = useSettingsStore((s) => s.removeFromRecycleBin);
  const emptyRecycleBin = useSettingsStore((s) => s.emptyRecycleBin);

  const restoreCoreShortcut = useDesktopStore((s) => s.restoreCoreShortcut);
  const addVirtualShortcut = useDesktopStore((s) => s.addVirtualShortcut);

  const saveFile = useVfsStore((s) => s.saveFile);
  const mkdir = useVfsStore((s) => s.mkdir);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const handleRestore = async (id: string) => {
    const item = recycleBin.find((r) => r.id === id);
    if (!item) return;

    try {
      if (item.source === 'desktop-shortcut' && item.shortcutId) {
        restoreCoreShortcut(item.shortcutId);
      } else if (item.source === 'desktop-virtual' && item.appId && item.vectorId) {
        addVirtualShortcut({
          id: item.shortcutId ?? `virt-${Date.now()}`,
          appId: item.appId as AppId,
          vectorId: item.vectorId,
          initialDir: item.initialDir,
          labelAr: item.labelAr ?? item.name,
          labelEn: item.labelEn ?? item.name,
          description: item.content || item.name,
        });
      } else if (item.source === 'host') {
        if (item.type === 'folder') {
          await mkdirHost(item.originalPath);
        } else {
          await writeHostFile(item.originalPath, item.content);
        }
        window.dispatchEvent(new CustomEvent('kemetos-desktop-refresh'));
      } else {
        if (item.type === 'folder') {
          mkdir(item.originalParentPath, item.name);
        } else {
          saveFile(item.originalParentPath, item.name, item.content);
        }
      }
      removeFromRecycleBin(id);
      pushNotification(
        language === 'ar' ? 'تمت الاستعادة' : 'Item Restored',
        language === 'ar' ? `تمت استعادة ${item.name}.` : `Restored ${item.originalPath}.`,
        'files'
      );
    } catch (err) {
      pushNotification(
        item.name,
        err instanceof Error ? err.message : 'Restore failed',
        'files'
      );
    }
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="flex flex-col h-full bg-slate-900 text-slate-100"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
          <Trash2 className="w-4 h-4 os-accent-text" />
          <span>
            {t(language, 'recycleBin')} ({recycleBin.length})
          </span>
        </div>

        <button
          type="button"
          disabled={recycleBin.length === 0}
          onClick={() => {
            emptyRecycleBin();
            pushNotification('Recycle Bin Emptied', 'All deleted items removed.', 'files');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:pointer-events-none text-xs font-medium text-white transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t(language, 'emptyRecycleBin')}</span>
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto os-scroll p-3">
        {recycleBin.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <Trash2 className="w-10 h-10 text-slate-600 mb-3" />
            <div className="text-sm font-medium text-slate-300">
              {language === 'ar' ? 'سلة المحذوفات فارغة' : 'Recycle Bin is empty'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar'
                ? 'الملفات المحذوفة من نظام الملفات الافتراضي ستظهر هنا.'
                : 'Files deleted from Browser VFS appear here for recovery.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recycleBin.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-sm bg-slate-950/70 border border-slate-800"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-100 truncate">{item.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    {item.originalPath} · {new Date(item.deletedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleRestore(item.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-sm os-accent-bg text-[11px] font-medium text-white cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t(language, 'restore')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromRecycleBin(item.id)}
                    className="px-2 py-1 rounded-sm bg-slate-800 hover:bg-red-700 text-[11px] text-slate-200"
                  >
                    {t(language, 'deletePermanently')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
