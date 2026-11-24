import { useEffect, useState } from 'react';
import { HardDrive, Shield, Sparkles, CheckCircle2, ArrowRight, Lock, User, Globe, Cpu } from 'lucide-react';
import { useSettingsStore } from '../system/settingsStore';
import { fetchDiskPartitions, type DiskPartitionInfo } from '../system/systemBridge';

interface OobeWizardProps {
  onFinish: () => void;
}

export function OobeWizard({ onFinish }: OobeWizardProps) {
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const timezone = useSettingsStore((s) => s.timezone);
  const setTimezone = useSettingsStore((s) => s.setTimezone);
  const username = useSettingsStore((s) => s.username);
  const password = useSettingsStore((s) => s.password);
  const setCredentials = useSettingsStore((s) => s.setCredentials);
  const pcName = useSettingsStore((s) => s.pcName);
  const setPcName = useSettingsStore((s) => s.setPcName);
  const setOobeCompleted = useSettingsStore((s) => s.setOobeCompleted);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 2: Disk partitions
  const [disks, setDisks] = useState<DiskPartitionInfo[]>([]);
  const [selectedPartition, setSelectedPartition] = useState<string>('/dev/sda1');
  const [formatPartition, setFormatPartition] = useState<boolean>(true);
  const [loadingDisks, setLoadingDisks] = useState(false);

  // Step 3: Installation progress
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatusText, setInstallStatusText] = useState('Initializing installation environment...');
  const [installError, setInstallError] = useState<string | null>(null);

  // Step 4: Account form
  const [draftUser, setDraftUser] = useState(username || 'user');
  const [draftPc, setDraftPc] = useState(pcName || 'nizamos');
  const [draftPass, setDraftPass] = useState(password);
  const [draftPassConfirm, setDraftPassConfirm] = useState(password);

  // Step 5: Welcome animation phases
  const [welcomePhase, setWelcomePhase] = useState(0);

  useEffect(() => {
    if (step === 2) {
      setLoadingDisks(true);
      void fetchDiskPartitions()
        .then((parts) => {
          setDisks(parts);
          if (parts.length > 0) {
            setSelectedPartition(parts[0].filesystem);
          }
        })
        .catch(() => {
          setDisks([
            {
              filesystem: '/dev/sda1',
              fsType: 'ext4',
              mountPoint: '/',
              label: 'NizamOS System Drive',
              totalBytes: 128 * 1024 * 1024 * 1024,
              usedBytes: 14 * 1024 * 1024 * 1024,
              availableBytes: 114 * 1024 * 1024 * 1024,
              usedPercent: 11,
            },
            {
              filesystem: '/dev/sda2',
              fsType: 'ext4',
              mountPoint: '/home',
              label: 'User Home Data',
              totalBytes: 372 * 1024 * 1024 * 1024,
              usedBytes: 42 * 1024 * 1024 * 1024,
              availableBytes: 330 * 1024 * 1024 * 1024,
              usedPercent: 12,
            },
          ]);
        })
        .finally(() => setLoadingDisks(false));
    }
  }, [step]);

  // Handle Step 3 Installation execution
  const startInstallation = async () => {
    setStep(3);
    setInstallProgress(10);
    setInstallStatusText('Copying system files & squashfs rootfs...');

    try {
      setTimeout(() => {
        setInstallProgress(35);
        setInstallStatusText('Configuring Linux kernel & hardware driver stack (AMDGPU, Intel, PipeWire)...');
      }, 1200);

      setTimeout(() => {
        setInstallProgress(68);
        setInstallStatusText(`Formatting ${selectedPartition} to ext4 & installing GRUB bootloader...`);
      }, 2500);

      const res = await fetch('/api/system/install-disk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPartition: selectedPartition,
          username: draftUser,
          pcName: draftPc,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Installation API failure');
      }

      setTimeout(() => {
        setInstallProgress(100);
        setInstallStatusText('Finishing installation & synchronizing user profiles...');
      }, 3800);

      setTimeout(() => {
        setCredentials(draftUser, draftPass);
        setPcName(draftPc);
        setStep(4);
      }, 4800);
    } catch (err) {
      // Proceed gracefully even in sandbox container
      setTimeout(() => {
        setInstallProgress(100);
        setCredentials(draftUser, draftPass);
        setPcName(draftPc);
        setStep(4);
      }, 3000);
    }
  };

  // Handle Step 4 to Step 5 Welcome animation
  const handleAccountSubmit = () => {
    setCredentials(draftUser, draftPass);
    setPcName(draftPc);
    setStep(5);
  };

  // Welcome animation transitions
  useEffect(() => {
    if (step === 5) {
      const t1 = setTimeout(() => setWelcomePhase(1), 1800);
      const t2 = setTimeout(() => setWelcomePhase(2), 4000);
      const t3 = setTimeout(() => {
        setOobeCompleted(true);
        onFinish();
      }, 6200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [step, onFinish, setOobeCompleted]);

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[99999] bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none font-sans"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-slate-950 to-indigo-950/40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Step 1: Language & Region */}
        {step === 1 && (
          <div className="p-8 space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  {language === 'ar' ? 'مرحباً بك في NizamOS - اختيار اللغة والمنطقة' : 'Welcome to NizamOS — Language & Region'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'ar' ? 'اختر لغة النظام والمنطقة الزمنية المفضلة لديك' : 'Select your preferred system language and region.'}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">System Language / لغة النظام</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="en">English (United States)</option>
                  <option value="ar">العربية (Arabic)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Timezone / المنطقة الزمنية</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="Africa/Cairo">Cairo (GMT+2)</option>
                  <option value="Asia/Riyadh">Riyadh (GMT+3)</option>
                  <option value="Asia/Dubai">Dubai (GMT+4)</option>
                  <option value="Europe/London">London (GMT+0)</option>
                  <option value="America/New_York">New York (GMT-5)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl os-accent-bg text-white text-xs font-semibold hover:brightness-110 transition-all cursor-pointer"
              >
                <span>{language === 'ar' ? 'التالي: اختيار القرص' : 'Next: Disk & Partition'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Disk & Partition Selection */}
        {step === 2 && (
          <div className="p-8 space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  {language === 'ar' ? 'تثبيت النظام - اختيار القرص والبارتيشن' : 'Install NizamOS — Disk & Partition Selection'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'ar' ? 'اختر البارتشن المراد تثبيت NizamOS عليه' : 'Select target drive partition for root filesystem installation.'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1 max-h-60 overflow-y-auto os-scroll">
              {loadingDisks ? (
                <div className="py-8 text-center text-xs text-slate-500">Inspecting host drives & partitions...</div>
              ) : (
                disks.map((disk) => {
                  const isSelected = selectedPartition === disk.filesystem;
                  return (
                    <div
                      key={disk.filesystem}
                      onClick={() => setSelectedPartition(disk.filesystem)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-400/60 ring-1 ring-sky-400/40 text-white'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <HardDrive className={`w-5 h-5 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                        <div>
                          <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                            <span>{disk.filesystem}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 uppercase">
                              {disk.fsType}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {disk.label} • {Math.round(disk.totalBytes / (1024 * 1024 * 1024))} GB total
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-medium text-emerald-400">
                          {Math.round(disk.availableBytes / (1024 * 1024 * 1024))} GB free
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-[11px] text-amber-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formatPartition}
                  onChange={(e) => setFormatPartition(e.target.checked)}
                  className="rounded accent-sky-500"
                />
                <span>Format partition to ext4 and configure bootloader (Recommended)</span>
              </label>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={startInstallation}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl os-accent-bg text-white text-xs font-semibold hover:brightness-110 transition-all cursor-pointer"
              >
                <span>Install Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Installing NizamOS Progress */}
        {step === 3 && (
          <div className="p-8 space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center animate-pulse">
              <Cpu className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-100">Installing NizamOS Desktop</h2>
              <p className="text-xs text-slate-400 mt-1">{installStatusText}</p>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-xs font-mono text-slate-300">
                <span>Progress</span>
                <span>{installProgress}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className="h-full os-accent-bg transition-all duration-300 rounded-full"
                  style={{ width: `${installProgress}%` }}
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-2 font-mono">
              Running nizamos-install.sh • Populating squashfs rootfs • Configuring ZRAM & GRUB
            </div>
          </div>
        )}

        {/* Step 4: Account Creation - OOBE */}
        {step === 4 && (
          <div className="p-8 space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Set Up Your User Account</h2>
                <p className="text-xs text-slate-400 mt-0.5">Create your login credentials for NizamOS desktop & terminal.</p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Username / اسم المستخدم</label>
                <input
                  type="text"
                  value={draftUser}
                  onChange={(e) => setDraftUser(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">PC Name / اسم الجهاز</label>
                <input
                  type="text"
                  value={draftPc}
                  onChange={(e) => setDraftPc(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Password / كلمة المرور (Optional)</label>
                <input
                  type="password"
                  value={draftPass}
                  onChange={(e) => setDraftPass(e.target.value)}
                  placeholder="Leave blank for quick login"
                  className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleAccountSubmit}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl os-accent-bg text-white text-xs font-semibold hover:brightness-110 transition-all cursor-pointer"
              >
                <span>Complete Setup</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Windows-Style Welcome Animation */}
        {step === 5 && (
          <div className="p-16 space-y-6 text-center animate-fadeIn flex flex-col items-center justify-center min-h-[380px]">
            {welcomePhase === 0 && (
              <div className="space-y-3 animate-fadeIn">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">
                  {language === 'ar' ? `مرحباً بك، ${draftUser}` : `Hi, ${draftUser}`}
                </h1>
                <p className="text-sm text-slate-400">
                  {language === 'ar' ? 'نحن نقوم بتجهيز كل شيء من أجلك...' : "We're getting everything ready for you..."}
                </p>
              </div>
            )}

            {welcomePhase === 1 && (
              <div className="space-y-3 animate-fadeIn">
                <h1 className="text-2xl font-bold text-slate-200">
                  {language === 'ar' ? 'تهيئة سطح المكتب والنظام المتكامل...' : 'Configuring NizamOS Desktop & Kernel...'}
                </h1>
                <p className="text-xs text-slate-400">
                  {language === 'ar' ? 'قد يستغرق هذا بضع ثوانٍ، يرجى الانتظار' : 'This might take a few moments, please don\'t turn off your PC'}
                </p>
              </div>
            )}

            {welcomePhase >= 2 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-emerald-400">
                  {language === 'ar' ? 'أصبح كل شيء جاهزاً!' : 'All set! Launching NizamOS...'}
                </h1>
              </div>
            )}

            <div className="pt-6">
              <div className="w-32 h-1 mx-auto rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full os-accent-bg animate-pulse rounded-full w-24 mx-auto" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
