import { useEffect, useState } from 'react';
import { BookOpen, Cpu, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import { fetchRealSystemSpecs, type RealHardwareSpecs } from '../../services/systemBridge';
import { openOsApp } from '../../apps/registry';
import { KemetLogo } from './KemetLogo';

export function WelcomeModalApp() {
  return (
    <div dir="rtl" className="h-full bg-[#0b1120] text-slate-100 p-6 overflow-y-auto os-scroll space-y-5">
      <div className="flex items-center gap-4">
        <KemetLogo className="w-16 h-16 rounded-2xl border border-amber-400/40 shrink-0" />
        <div>
          <h2 className="text-xl font-bold text-amber-300">مرحباً بك في KemetOS 1.0 (كيميت أو إس)</h2>
          <p className="text-xs text-cyan-300 mt-1">
            نظام لينكس عربي سيادي متكامل بتصميم فرعوني سيبراني وأداء فائق للأجهزة الضعيفة والقوية
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-2xl bg-[#070b14] border border-slate-800 p-4 space-y-1.5">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>تعريفات تلقائية كاملة</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            يدمج جميع تعريفات الواي فاي والكاميرا والصوت وكروت الشاشة تلقائياً بدون تدخل يدوي.
          </p>
        </div>
        <div className="rounded-2xl bg-[#070b14] border border-slate-800 p-4 space-y-1.5">
          <div className="font-bold text-cyan-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>برامج حقيقية + Wine</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            شغّل Google Chrome و Steam وملفات الويندوز .exe مباشرة بنقرة مزدوجة من مدير الملفات.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 pt-2">
        <button
          type="button"
          onClick={() => openOsApp('store')}
          className="px-4 py-2 rounded-xl bg-gradient-to-l from-amber-500 to-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
        >
          استكشاف متجر كيميت
        </button>
        <button
          type="button"
          onClick={() => openOsApp('hardware')}
          className="px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-xs font-bold cursor-pointer"
        >
          فحص الجهاز والتعريفات
        </button>
      </div>
    </div>
  );
}

export function LearnModalApp() {
  return (
    <div dir="rtl" className="h-full bg-[#0b1120] text-slate-100 p-6 overflow-y-auto os-scroll space-y-4">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-amber-300" />
        <h2 className="text-lg font-bold text-white">التعلّم السريع مع KemetOS 1.0</h2>
      </div>

      <div className="space-y-3 text-xs">
        <div className="rounded-2xl bg-[#070b14] border border-slate-800 p-4 space-y-1">
          <div className="font-bold text-cyan-300">1. اختصار بوابة التطبيقات والبحث</div>
          <p className="text-slate-400">اضغط Alt + Space في أي وقت لفتح بوابة كيميت والبحث عن أي تطبيق.</p>
        </div>
        <div className="rounded-2xl bg-[#070b14] border border-slate-800 p-4 space-y-1">
          <div className="font-bold text-amber-300">2. وضع الأجهزة الضعيفة (2GB–4GB RAM)</div>
          <p className="text-slate-400">
            يفعل النظام وضع Ultra-Lite 60 FPS تلقائياً على الأجهزة ذات الرامات المحدودة، كما يمكنك تحرير الرامات بنقرة واحدة من الشريط العلوي.
          </p>
        </div>
        <div className="rounded-2xl bg-[#070b14] border border-slate-800 p-4 space-y-1">
          <div className="font-bold text-emerald-300">3. التيرمينال الحقيقي</div>
          <p className="text-slate-400">جرب فتح التيرمينال وكتابة neofetch لعرض مواصفات العتاد المكتشفة من نواة Linux.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => openOsApp('terminal', { initialCommand: 'neofetch' })}
        className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
      >
        <Terminal className="w-4 h-4" />
        <span>تشغيل neofetch في التيرمينال</span>
      </button>
    </div>
  );
}

export function AboutKemetModalApp() {
  const [specs, setSpecs] = useState<RealHardwareSpecs | null>(null);

  useEffect(() => {
    void fetchRealSystemSpecs().then(setSpecs);
  }, []);

  return (
    <div dir="rtl" className="h-full bg-[#0b1120] text-slate-100 p-6 overflow-y-auto os-scroll space-y-5">
      <div className="flex flex-col items-center text-center gap-3">
        <KemetLogo className="w-24 h-24 rounded-3xl border-2 border-amber-400/45 shadow-2xl" />
        <div>
          <h2 className="text-xl font-bold text-amber-300">KemetOS 1.0 (كيميت أو إس)</h2>
          <p className="text-xs text-cyan-300 mt-0.5">Debian 12 Bookworm amd64 · Openbox + Tauri + React</p>
        </div>
      </div>

      {specs && (
        <div className="rounded-2xl bg-[#070b14] border border-slate-800 p-4 space-y-2 text-xs font-mono-tabular">
          <div className="flex items-center gap-2 text-amber-300 font-bold mb-1">
            <Cpu className="w-4 h-4" />
            <span>المواصفات المكتشفة لهذا الجهاز</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>CPU:</span>
            <span className="text-white truncate max-w-[260px]">{specs.cpuModel}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>RAM:</span>
            <span className="text-cyan-300">{specs.ramTotalGb} GB</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>GPU:</span>
            <span className="text-white truncate max-w-[260px]">{specs.gpuModel}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Wi-Fi:</span>
            <span className="text-emerald-300 truncate max-w-[260px]">{specs.wifiChipset}</span>
          </div>
        </div>
      )}
    </div>
  );
}
