import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Download,
  History,
  Lock,
  Package,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import {
  applySystemUpdates,
  checkSystemUpdates,
  rollbackSystemCheckpoint,
  type SystemUpdatesCheckResponse,
} from '../../services/systemBridge';
import {
  isValidSha256Hex,
  type SystemCheckpoint,
  type SystemUpdateItem,
  type UpdateCategory,
} from '../../system/updateManifest';
import { useSettingsStore } from '../../system/settingsStore';
import { useNotificationStore } from '../../system/notificationStore';

const CATEGORY_META: Record<
  UpdateCategory,
  { labelAr: string; labelEn: string; icon: typeof Lock }
> = {
  security: { labelAr: 'تحديثات الأمان', labelEn: 'Security Updates', icon: Lock },
  kernel: { labelAr: 'تحديثات النواة والتعريفات', labelEn: 'Kernel & Drivers', icon: Cpu },
  apps: { labelAr: 'تحديثات التطبيقات', labelEn: 'Application Updates', icon: Package },
};

const CATEGORIES: UpdateCategory[] = ['security', 'kernel', 'apps'];

export function UpdateManager() {
  const language = useSettingsStore((s) => s.language);
  const applyPendingUpdates = useSettingsStore((s) => s.applyPendingUpdates);
  const addStoreOperation = useSettingsStore((s) => s.addStoreOperation);
  const pushNotification = useNotificationStore((s) => s.pushNotification);
  const isAr = language === 'ar';

  const [data, setData] = useState<SystemUpdatesCheckResponse | null>(null);
  const [updates, setUpdates] = useState<SystemUpdateItem[]>([]);
  const [checkpoints, setCheckpoints] = useState<SystemCheckpoint[]>([]);
  const [checking, setChecking] = useState(true);
  const [applying, setApplying] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<UpdateCategory | 'all'>('all');
  const [logs, setLogs] = useState<string[]>([]);

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await checkSystemUpdates();
      if (res.ok) {
        setData(res);
        setUpdates(res.updates ?? []);
        setCheckpoints(res.checkpoints ?? []);
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void runCheck();
  }, []);

  const visibleUpdates = useMemo(() => {
    if (activeCategory === 'all') return updates;
    return updates.filter((u) => u.category === activeCategory);
  }, [activeCategory, updates]);

  const manifestVerified = Boolean(
    data?.manifest?.signatureVerified && isValidSha256Hex(data.manifest.sha256)
  );

  const handleInstallUpdates = async (targetItems: SystemUpdateItem[]) => {
    if (targetItems.length === 0) return;
    setApplying(true);
    try {
      const pkgNames = targetItems.map((u) => u.packageName);
      const res = await applySystemUpdates(
        pkgNames,
        isAr ? `نقطة استرجاع قبل تحديث (${pkgNames.length} حزم)` : `Pre-Update Snapshot (${pkgNames.length} pkgs)`
      );
      if (res.logs?.length) setLogs((prev) => [...prev.slice(-14), ...res.logs]);
      if (res.ok) {
        setUpdates((prev) => prev.filter((u) => !pkgNames.includes(u.packageName)));
        if (Array.isArray(res.checkpoints)) setCheckpoints(res.checkpoints);
        if (targetItems.length === updates.length) applyPendingUpdates();
        addStoreOperation({
          title: isAr ? `تحديث النظام (${pkgNames.length} حزم)` : `System Update (${pkgNames.length} pkgs)`,
          command: `pkexec apt-get install -y ${pkgNames.join(' ')}`,
          status: 'completed',
        });
        pushNotification(
          'KemetOS Update Manager',
          isAr
            ? `تم تطبيق ${res.appliedCount} تحديث موقّع مع إنشاء نقطة استرجاع آمنة.`
            : `Applied ${res.appliedCount} signed updates cleanly.`,
          'system'
        );
      }
    } finally {
      setApplying(false);
    }
  };

  const handleRollback = async (ckpt: SystemCheckpoint) => {
    setRollingBackId(ckpt.id);
    try {
      const res = await rollbackSystemCheckpoint(ckpt.id);
      if (res.logs?.length) setLogs((prev) => [...prev.slice(-14), ...res.logs]);
      if (res.ok && Array.isArray(res.checkpoints)) {
        setCheckpoints(res.checkpoints);
        pushNotification(
          isAr ? 'استرجاع النظام' : 'System Rollback',
          isAr ? `تم تفعيل نقطة الاسترجاع: ${ckpt.label}` : `Restored checkpoint: ${ckpt.label}`,
          'system'
        );
      }
    } finally {
      setRollingBackId(null);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="flex-1 min-h-0 flex flex-col bg-[#0B1120] text-slate-100 overflow-hidden select-none"
    >
      {/* Top Status & Release Manifest Header */}
      <div className="shrink-0 px-6 py-4 bg-[#070b14] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-bold text-white">
              {data?.version ?? 'KemetOS 1.0'}
            </h2>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                manifestVerified
                  ? 'bg-[#2DD4BF]/10 border-[#2DD4BF]/40 text-[#2DD4BF]'
                  : 'bg-rose-500/10 border-rose-400/40 text-rose-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {manifestVerified
                  ? isAr
                    ? 'توقيع SHA-256 موثّق'
                    : 'SHA-256 Verified'
                  : isAr
                  ? 'جاري التحقق من التوقيع'
                  : 'Verifying SHA-256'}
              </span>
            </span>
          </div>
          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
            <span>{data?.osName ?? 'Debian 12 Bookworm'}</span>
            <span>·</span>
            <span>
              {isAr ? 'آخر فحص:' : 'Last checked:'}{' '}
              {data?.checkedAt
                ? new Date(data.checkedAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')
                : '—'}
            </span>
            {data?.manifest?.sha256 && (
              <span dir="ltr" className="font-mono-tabular text-[10px] text-[#D6A63B]">
                sha256:{data.manifest.sha256.slice(0, 16)}…
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={checking}
            onClick={() => void runCheck()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'فحص التحديثات الآن' : 'Check for Updates'}</span>
          </button>

          {updates.length > 0 && (
            <button
              type="button"
              disabled={applying}
              onClick={() => void handleInstallUpdates(updates)}
              className="px-4 py-2 rounded-xl bg-[#D6A63B] hover:brightness-110 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {applying
                  ? isAr
                    ? 'جاري التثبيت...'
                    : 'Updating...'
                  : isAr
                  ? `تثبيت الكل (${updates.length})`
                  : `Install All (${updates.length})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto os-scroll p-6 space-y-6">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-[#D6A63B]/15 border-[#D6A63B]/60 text-[#D6A63B]'
                : 'bg-[#070b14] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            {isAr ? `كل التحديثات (${updates.length})` : `All Updates (${updates.length})`}
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_META[cat].icon;
            const count = updates.filter((u) => u.category === cat).length;
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#2DD4BF]/15 border-[#2DD4BF]/60 text-[#2DD4BF]'
                    : 'bg-[#070b14] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{isAr ? CATEGORY_META[cat].labelAr : CATEGORY_META[cat].labelEn}</span>
                <span className="font-mono-tabular text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Categorized Updates List */}
        {checking && !data ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-[#070b14] border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : visibleUpdates.length === 0 ? (
          <div className="rounded-xl bg-[#070b14] border border-[#2DD4BF]/30 p-6 flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-[#2DD4BF] shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'النظام محدّث بالكامل' : 'KemetOS 1.0 is Up to Date'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? 'جميع حزم الأمان والنواة والتطبيقات موقّعة ومحدّثة.'
                  : 'All security, kernel, and application packages are verified.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleUpdates.map((item) => {
              const CatIcon = CATEGORY_META[item.category].icon;
              return (
                <div
                  key={item.id}
                  className="rounded-xl bg-[#070b14] border border-slate-800 hover:border-slate-700 p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CatIcon className="w-4 h-4 text-[#D6A63B] shrink-0" />
                      <span className="text-sm font-bold text-white">{item.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-[#2DD4BF] font-semibold">
                        {isAr ? CATEGORY_META[item.category].labelAr : CATEGORY_META[item.category].labelEn}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {isAr ? item.summaryAr : item.summaryEn}
                    </p>
                    <div dir="ltr" className="text-[11px] font-mono-tabular text-slate-500 flex flex-wrap gap-3">
                      <span>{item.packageName}</span>
                      <span>
                        {item.currentVersion} → <strong className="text-[#2DD4BF]">{item.newVersion}</strong>
                      </span>
                      <span>{item.sizeLabel}</span>
                      <span>{item.repoSuite}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={applying}
                    onClick={() => void handleInstallUpdates([item])}
                    className="px-3.5 py-2 rounded-lg bg-[#2DD4BF] hover:brightness-110 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isAr ? 'تثبيت التحديث' : 'Install'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Rollback & Snapshot Checkpoints Section */}
        <section className="rounded-xl bg-[#070b14] border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#D6A63B]">
              <History className="w-4 h-4 text-[#2DD4BF]" />
              <span>
                {isAr
                  ? 'نقاط الاسترجاع والنسخ الاحتياطي (Rollback Checkpoints)'
                  : 'System Snapshot & Rollback Checkpoints'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono-tabular">
              {checkpoints.length} {isAr ? 'نقاط محفوظة' : 'snapshots'}
            </span>
          </div>

          <div className="space-y-2.5">
            {checkpoints.map((ckpt) => (
              <div
                key={ckpt.id}
                className={`rounded-xl border p-3.5 flex flex-wrap items-center justify-between gap-3 ${
                  ckpt.active
                    ? 'bg-[#0f172a] border-[#2DD4BF]/45'
                    : 'bg-[#0B1120] border-slate-800'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{ckpt.label}</span>
                    {ckpt.active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2DD4BF]/15 text-[#2DD4BF]">
                        {isAr ? 'الحالة النشطة' : 'Active'}
                      </span>
                    )}
                  </div>
                  <div dir="ltr" className="text-[11px] font-mono-tabular text-slate-400 flex flex-wrap gap-3">
                    <span>v{ckpt.version} · {ckpt.kernel}</span>
                    <span>{new Date(ckpt.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
                    <span className="text-[#D6A63B]">sha256:{ckpt.sha256.slice(0, 14)}…</span>
                  </div>
                </div>

                {!ckpt.active && (
                  <button
                    type="button"
                    disabled={rollingBackId === ckpt.id}
                    onClick={() => void handleRollback(ckpt)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#D6A63B] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isAr ? 'استرجاع لهذه النقطة' : 'Rollback'}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Live Update / Rollback Execution Logs */}
        {logs.length > 0 && (
          <section className="rounded-xl bg-[#070b14] border border-[#2DD4BF]/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#2DD4BF]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>{isAr ? 'سجل التحديث والاسترجاع' : 'Update & Snapshot Log'}</span>
              </span>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            </div>
            <div dir="ltr" className="max-h-36 overflow-y-auto os-scroll font-mono-tabular text-[11px] text-emerald-300 space-y-1">
              {logs.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
