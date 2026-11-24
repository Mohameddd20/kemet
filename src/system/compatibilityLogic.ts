export type DetectedBinaryFormat =
  | 'exe'
  | 'msi'
  | 'deb'
  | 'appimage'
  | 'apk'
  | 'sh'
  | 'elf'
  | 'unknown';

export interface BinaryTypeDetection {
  format: DetectedBinaryFormat;
  runtime: 'wine' | 'apt' | 'native-linux' | 'waydroid' | 'bash' | 'unsupported';
  labelAr: string;
  labelEn: string;
  requiresX11: boolean;
  requiresKvm: boolean;
}

export function detectBinaryType(filePathOrName: string): BinaryTypeDetection {
  const clean = filePathOrName.trim().toLowerCase();
  if (clean.endsWith('.exe')) {
    return {
      format: 'exe',
      runtime: 'wine',
      labelAr: 'تطبيق Windows تنفيذي (.exe)',
      labelEn: 'Windows Executable (.exe)',
      requiresX11: true,
      requiresKvm: false,
    };
  }
  if (clean.endsWith('.msi')) {
    return {
      format: 'msi',
      runtime: 'wine',
      labelAr: 'حزمة تثبيت Windows (.msi)',
      labelEn: 'Windows Installer Package (.msi)',
      requiresX11: true,
      requiresKvm: false,
    };
  }
  if (clean.endsWith('.deb')) {
    return {
      format: 'deb',
      runtime: 'apt',
      labelAr: 'حزمة Debian الرسمية (.deb)',
      labelEn: 'Debian Package (.deb)',
      requiresX11: false,
      requiresKvm: false,
    };
  }
  if (clean.endsWith('.appimage')) {
    return {
      format: 'appimage',
      runtime: 'native-linux',
      labelAr: 'تطبيق Linux محمول (.AppImage)',
      labelEn: 'Linux Portable AppImage',
      requiresX11: true,
      requiresKvm: false,
    };
  }
  if (clean.endsWith('.apk')) {
    return {
      format: 'apk',
      runtime: 'waydroid',
      labelAr: 'تطبيق Android (.apk)',
      labelEn: 'Android Package (.apk)',
      requiresX11: true,
      requiresKvm: true,
    };
  }
  if (clean.endsWith('.sh')) {
    return {
      format: 'sh',
      runtime: 'bash',
      labelAr: 'سكربت Linux Shell (.sh)',
      labelEn: 'Linux Shell Script (.sh)',
      requiresX11: false,
      requiresKvm: false,
    };
  }
  if (clean && !clean.includes('.')) {
    return {
      format: 'elf',
      runtime: 'native-linux',
      labelAr: 'ملف تنفيذي Linux (ELF)',
      labelEn: 'Native Linux Binary (ELF)',
      requiresX11: false,
      requiresKvm: false,
    };
  }
  return {
    format: 'unknown',
    runtime: 'unsupported',
    labelAr: 'صيغة غير مدعومة',
    labelEn: 'Unsupported Format',
    requiresX11: false,
    requiresKvm: false,
  };
}

export interface LowRamSafetyResult {
  allowed: boolean;
  severity: 'safe' | 'warning' | 'blocked';
  isLowRamDevice: boolean;
  minRecommendedFreeMb: number;
  messageAr: string;
  messageEn: string;
}

export function evaluateLowRamSafety(
  freeRamMb: number,
  totalRamMb: number,
  target: 'wine' | 'android' | 'linux'
): LowRamSafetyResult {
  const safeFree = Math.max(0, Math.round(freeRamMb));
  const safeTotal = Math.max(0, Math.round(totalRamMb));
  const isLowRamDevice = safeTotal > 0 && safeTotal <= 4608;

  if (target === 'android') {
    if (safeTotal < 2048) {
      return {
        allowed: false,
        severity: 'blocked',
        isLowRamDevice,
        minRecommendedFreeMb: 900,
        messageAr: `الذاكرة الكلية (${safeTotal} MB) أقل من الحد الأدنى المطلوب لتشغيل حاوية Android (2048 MB).`,
        messageEn: `Total RAM (${safeTotal} MB) is below the 2048 MB minimum required for Android Waydroid container.`,
      };
    }
    if (safeFree < 900) {
      return {
        allowed: false,
        severity: 'blocked',
        isLowRamDevice,
        minRecommendedFreeMb: 900,
        messageAr: `الذاكرة المتاحة حالياً (${safeFree} MB) غير كافية لحاوية Android (مطلوب 900 MB فارغة على الأقل). أوقف بيئات المحاكاة أولاً.`,
        messageEn: `Free RAM (${safeFree} MB) is below 900 MB required for Waydroid. Stop active emulators to reclaim memory.`,
      };
    }
    return {
      allowed: true,
      severity: 'safe',
      isLowRamDevice,
      minRecommendedFreeMb: 900,
      messageAr: `الذاكرة المتاحة (${safeFree} MB) كافية لتشغيل حاوية Android عند الطلب.`,
      messageEn: `Available RAM (${safeFree} MB) meets Waydroid container requirements.`,
    };
  }

  if (target === 'wine') {
    if (safeFree < 256) {
      return {
        allowed: false,
        severity: 'blocked',
        isLowRamDevice,
        minRecommendedFreeMb: 512,
        messageAr: `تحذير حرج: الذاكرة المتاحة (${safeFree} MB) منخفضة جداً لبدء محرك Wine. قم بتحرير الذاكرة أولاً.`,
        messageEn: `Critical: Free RAM (${safeFree} MB) is too low to start Wine safely. Free memory first.`,
      };
    }
    if (safeFree < 512) {
      return {
        allowed: true,
        severity: 'warning',
        isLowRamDevice,
        minRecommendedFreeMb: 512,
        messageAr: `تنبيه: الذاكرة المتاحة (${safeFree} MB) أقل من الموصى به (512 MB). يُنصح بإغلاق التطبيقات غير الضرورية قبل تشغيل برامج Windows.`,
        messageEn: `Warning: Free RAM (${safeFree} MB) is below 512 MB recommended threshold for Wine.`,
      };
    }
    return {
      allowed: true,
      severity: 'safe',
      isLowRamDevice,
      minRecommendedFreeMb: 512,
      messageAr: `الذاكرة المتاحة (${safeFree} MB) مناسبة لتشغيل محرك Wine عند الطلب.`,
      messageEn: `Free RAM (${safeFree} MB) is healthy for on-demand Wine execution.`,
    };
  }

  // native linux
  if (safeFree < 128) {
    return {
      allowed: true,
      severity: 'warning',
      isLowRamDevice,
      minRecommendedFreeMb: 128,
      messageAr: `الذاكرة المتاحة منخفضة (${safeFree} MB) — يُفضل تحرير الذاكرة المؤقتة.`,
      messageEn: `Low free memory (${safeFree} MB) — consider reclaiming cached RAM.`,
    };
  }
  return {
    allowed: true,
    severity: 'safe',
    isLowRamDevice,
    minRecommendedFreeMb: 128,
    messageAr: `البيئة المحلية جاهزة (${safeFree} MB متاحة) بأعلى أداء.`,
    messageEn: `Native Linux ABI ready (${safeFree} MB available).`,
  };
}

export interface LddLibraryEntry {
  name: string;
  resolvedPath: string | null;
  isMissing: boolean;
}

export function parseLddOutput(raw: string): LddLibraryEntry[] {
  const entries: LddLibraryEntry[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes('=>')) {
      const [left, right] = trimmed.split('=>', 2);
      const name = left.trim();
      const rhs = (right ?? '').trim();
      if (rhs.toLowerCase().includes('not found')) {
        entries.push({ name, resolvedPath: null, isMissing: true });
      } else {
        const pathOnly = rhs.replace(/\s*\(0x[0-9a-f]+\)$/i, '').trim();
        entries.push({
          name,
          resolvedPath: pathOnly || 'vdso',
          isMissing: false,
        });
      }
    } else if (trimmed.startsWith('/')) {
      const pathOnly = trimmed.replace(/\s*\(0x[0-9a-f]+\)$/i, '').trim();
      const parts = pathOnly.split('/');
      entries.push({
        name: parts[parts.length - 1] || pathOnly,
        resolvedPath: pathOnly,
        isMissing: false,
      });
    } else if (/\.so(\.\d+)?\b/i.test(trimmed)) {
      const cleanName = trimmed.replace(/\s*\(0x[0-9a-f]+\)$/i, '').trim();
      entries.push({
        name: cleanName,
        resolvedPath: 'linux-vdso',
        isMissing: false,
      });
    }
  }
  return entries;
}

export interface CompatibilityDiagnosis {
  code:
    | 'missing-i386'
    | 'low-ram'
    | 'missing-display'
    | 'missing-kvm-waydroid'
    | 'bad-arch'
    | 'missing-runtime'
    | 'unknown';
  titleAr: string;
  titleEn: string;
  reasonAr: string;
  reasonEn: string;
  fixCommand?: string;
}

export function diagnoseLaunchFailure(
  rawError: string,
  context: { ext?: string; freeRamMb?: number; arch?: string } = {}
): CompatibilityDiagnosis {
  const lower = rawError.toLowerCase();

  if (lower.includes('i386') || lower.includes('32-bit') || lower.includes('wine32')) {
    return {
      code: 'missing-i386',
      titleAr: 'نقص مكتبات 32-bit المطلوبة لبرامج Windows',
      titleEn: 'Missing 32-bit (i386) Compatibility Libraries',
      reasonAr: 'هذا البرنامج يعتمد على بنية 32-bit ولم يتم تفعيل حزم wine32 / i386 على النظام بعد.',
      reasonEn: 'This executable depends on 32-bit libraries that are not installed yet.',
      fixCommand: 'pkexec dpkg --add-architecture i386 && pkexec apt-get update && pkexec apt-get install -y wine32',
    };
  }

  if (
    lower.includes('ram') ||
    lower.includes('memory') ||
    lower.includes('oom') ||
    (typeof context.freeRamMb === 'number' && context.freeRamMb < 256)
  ) {
    return {
      code: 'low-ram',
      titleAr: 'الذاكرة العشوائية (RAM) المتاحة غير كافية',
      titleEn: 'Insufficient Available RAM',
      reasonAr: 'المساحة الحرة في الذاكرة لا تكفي لبدء طبقة المحاكاة دون التأثير على سلاسة النظام.',
      reasonEn: 'Available RAM is below the safety threshold for emulation containers.',
      fixCommand: 'wineserver -k',
    };
  }

  if (lower.includes('kvm') || lower.includes('waydroid')) {
    return {
      code: 'missing-kvm-waydroid',
      titleAr: 'بيئة Android (Waydroid / KVM) غير مفعلة على هذا الجهاز',
      titleEn: 'Waydroid / KVM Virtualization Not Configured',
      reasonAr: 'تشغيل ملفات APK يتطلب وجود /dev/kvm وحزمة Waydroid، أو استخدام جهاز بذاكرة >= 2GB.',
      reasonEn: 'APK execution requires Waydroid and /dev/kvm virtualization with at least 2GB RAM.',
      fixCommand: 'pkexec apt-get install -y waydroid && pkexec waydroid init',
    };
  }

  if (lower.includes('exec format') || lower.includes('architecture') || lower.includes('arm64')) {
    return {
      code: 'bad-arch',
      titleAr: 'معمارية المعالج غير متوافقة',
      titleEn: 'Unsupported CPU Architecture',
      reasonAr: `الملف مبني لمعمارية مختلفة عن معمارية النظام الحالية (${context.arch || 'x86_64'}).`,
      reasonEn: `Binary architecture does not match host (${context.arch || 'x86_64'}).`,
    };
  }

  if (lower.includes('display') || lower.includes('x11') || lower.includes('xorg')) {
    return {
      code: 'missing-display',
      titleAr: 'مطلوب جلسة سطح مكتب رسومية (X11 / Openbox)',
      titleEn: 'X11 / Openbox Graphical Display Required',
      reasonAr: 'الواجهة الحالية تعمل داخل متصفح ويب تجريبي بدون خادم شاشة X11؛ يعمل البرنامج مباشرة داخل نسخة KemetOS ISO أو تطبيق Tauri.',
      reasonEn: 'No X11 display server is active in headless preview; runs natively in KemetOS ISO / Tauri.',
    };
  }

  if (lower.includes('not installed') || lower.includes('which') || lower.includes('enoent')) {
    return {
      code: 'missing-runtime',
      titleAr: 'طبقة التشغيل أو الحزمة غير مثبتة بعد',
      titleEn: 'Compatibility Runtime Not Installed',
      reasonAr: rawError || 'لم يتم العثور على ملف التشغيل المطلوب في النظام.',
      reasonEn: rawError || 'Required runtime binary was not found on the host.',
      fixCommand: context.ext === '.apk' ? 'pkexec apt-get install -y waydroid' : 'pkexec apt-get install -y wine64 wine32 winetricks',
    };
  }

  if (lower.includes('not found') || lower.includes('outside allowed')) {
    return {
      code: 'missing-runtime',
      titleAr: 'الملف التنفيذي غير موجود في المسار المحدد',
      titleEn: 'Executable Not Found at Specified Path',
      reasonAr: 'تأكد من وجود ملف .exe أو .msi داخل المجلد الشخصي (مثل Downloads) أو انقر عليه مباشرة من مدير الملفات.',
      reasonEn: rawError || 'Verify the executable path inside your home directory and try again.',
    };
  }

  return {
    code: 'unknown',
    titleAr: 'تعذر إكمال تشغيل الملف',
    titleEn: 'Execution Compatibility Notice',
    reasonAr: rawError || 'حدث خطأ غير متوقع أثناء فحص التوافق أو التشغيل.',
    reasonEn: rawError || 'Unexpected error during binary launch or compatibility check.',
  };
}
