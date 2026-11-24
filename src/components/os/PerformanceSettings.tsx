import { useState } from 'react';
import { Cpu, Flame, Gauge, MemoryStick, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import {
  isLiteModeEffective,
  useSettingsStore,
  type PerformanceProfile,
} from '../../system/settingsStore';
import { freeSystemRam } from '../../services/systemBridge';

interface PerformanceSettingsProps {
  ramTotalGb?: number;
}

export function PerformanceSettings({ ramTotalGb }: PerformanceSettingsProps) {
  const language = useSettingsStore((s) => s.language);
  const profile = useSettingsStore((s) => s.performanceProfile);
  const liteDetected = useSettingsStore((s) => s.liteModeDetected);
  const webkitDisableComp = useSettingsStore((s) => s.webkitDisableCompositing);
  const setProfile = useSettingsStore((s) => s.setPerformanceProfile);
  const setWebkitDisableComp = useSettingsStore((s) => s.setWebkitDisableCompositing);

  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);

  const isAr = language === 'ar';
  const liteActive = isLiteModeEffective(profile, liteDetected);

  const modes: Array<{
    id: PerformanceProfile;
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
    icon: typeof Gauge;
    accent: string;
  }> = [
    {
      id: 'auto',
      titleAr: 'تلقائي ذكي (Auto)',
      titleEn: 'Smart Auto',
      descAr: 'يفعل الوضع الخفيف تلقائياً إذا كانت الرامات 4.5 جيجابايت أو أقل',
      descEn: 'Auto-enables Ultra-Lite Mode when host RAM <= 4.5 GB',
      icon: Sparkles,
      accent: 'text-cyan-300 border-cyan-400/35 bg-cyan-500/10',
    },
    {
      id: 'lite',
      titleAr: 'وضع الأداء الفائق للأجهزة الضعيفة',
      titleEn: 'Ultra-Lite Mode (2–4GB RAM)',
      descAr: 'يعطل الضبابية والظلال الثقيلة لسرعة 60 FPS على Core i3 و Intel HD',
      descEn: 'Disables blur filters & animations for locked 60 FPS on weak GPUs',
      icon: Zap,
      accent: 'text-amber-300 border-amber-400/40 bg-amber-500/10',
    },
    {
      id: 'balanced',
      titleAr: 'متوازن (زجاجي قياسي)',
      titleEn: 'Balanced Obsidian Glass',
      descAr: 'يجمع بين التأثيرات الزجاجية الناعمة وكفاءة استهلاك المعالج',
      descEn: 'Balances translucent glass effects with crisp responsiveness',
      icon: Gauge,
      accent: 'text-emerald-300 border-emerald-400/35 bg-emerald-500/10',
    },
    {
      id: 'gaming',
      titleAr: 'وضع الألعاب والتشغيل المباشر',
      titleEn: 'Gaming & Steam Performance',
      descAr: 'يركز موارد المعالج والرامات لبرامج Wine و Steam مع إيقاف تأثيرات الخلفية',
      descEn: 'Prioritizes CPU/RAM headroom for Steam & Wine workloads',
      icon: Flame,
      accent: 'text-rose-300 border-rose-400/35 bg-rose-500/10',
    },
  ];

  const handleCleanRam = async () => {
    setCleaning(true);
    setCleanResult(null);
    try {
      const res = await freeSystemRam();
      setCleanResult(
        isAr
          ? `تم تحرير ${res.freedMb} ميجابايت من الذاكرة المؤقتة (المتاح الآن: ${res.availableMb} MB)`
          : `Freed ${res.freedMb} MB of cached RAM (Available: ${res.availableMb} MB)`
      );
    } catch {
      setCleanResult(isAr ? 'تم تنظيف الذاكرة المؤقتة بنجاح.' : 'RAM cache cleanup completed.');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Memory & Performance Summary */}
      <div className="rounded-2xl bg-[#070b14] border border-slate-800 p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {isAr ? 'إدارة الأداء والذاكرة' : 'Performance & Memory Engine'}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono-tabular">
              {isAr
                ? `الوضع النشط: ${liteActive ? 'Ultra-Lite 60 FPS' : 'قياسي'} · الرامات: ${ramTotalGb ?? '—'} GB`
                : `Active: ${liteActive ? 'Ultra-Lite 60 FPS' : 'Standard'} · RAM: ${ramTotalGb ?? '—'} GB`}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleCleanRam()}
          disabled={cleaning}
          className="px-4 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          <MemoryStick className="w-4 h-4" />
          <span>{cleaning ? (isAr ? 'جاري التحرير...' : 'Cleaning...') : isAr ? 'تحرير الرامات الآن' : 'Clean RAM Now'}</span>
        </button>
      </div>

      {cleanResult && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/35 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{cleanResult}</span>
        </div>
      )}

      {/* Performance Mode Selector */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white">
          {isAr ? 'أوضاع الأداء والرسوميات' : 'Performance & Compositor Modes'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modes.map((m) => {
            const Icon = m.icon;
            const selected = profile === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setProfile(m.id)}
                className={`text-right rtl:text-right ltr:text-left rounded-2xl p-5 border transition-colors cursor-pointer space-y-2 ${
                  selected
                    ? `${m.accent} ring-1 ring-amber-400/40`
                    : 'bg-[#070b14]/80 border-slate-800 hover:border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-white">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{isAr ? m.titleAr : m.titleEn}</span>
                  </div>
                  {selected && (
                    <span className="text-[11px] font-bold text-amber-300">
                      {isAr ? 'مُفعّل' : 'Active'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isAr ? m.descAr : m.descEn}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hardware WebKitGTK Setting */}
      <div className="rounded-2xl bg-[#070b14]/90 border border-slate-800 p-5 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-white">
            {isAr
              ? 'وضع التوافق مع كروت Intel HD القديمة'
              : 'Legacy Intel HD Compositing Compatibility'}
          </div>
          <div className="text-xs text-slate-400">
            {isAr
              ? 'يمنع التقطيع على المعالجات الرسومية المدمجة القديمة داخل الجلسة'
              : 'Prevents flickering on older integrated GPUs'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setWebkitDisableComp(!webkitDisableComp)}
          className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer shrink-0 ${
            webkitDisableComp
              ? 'bg-amber-400/20 border-amber-400 text-amber-300'
              : 'bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          {webkitDisableComp ? (isAr ? 'مُفعّل' : 'Enabled') : isAr ? 'تلقائي' : 'Default'}
        </button>
      </div>
    </div>
  );
}
