export type StoreCategoryId =
  | 'all'
  | 'browsers'
  | 'media'
  | 'dev'
  | 'gaming'
  | 'compatibility';

export interface StoreCatalogItem {
  id: string;
  name: string;
  arabicName: string;
  publisher: string;
  category: Exclude<StoreCategoryId, 'all'>;
  packageName: string;
  binary: string;
  sizeLabel: string;
  version: string;
  launchMode: 'web' | 'terminal' | 'tauri' | 'emulator';
  launchUrl?: string;
  description: string;
  arabicDescription: string;
  accentBg: string;
  badgeText: string;
}

export const STORE_CATALOG: StoreCatalogItem[] = [
  {
    id: 'store-chrome',
    name: 'Google Chrome',
    arabicName: 'جوجل كروم',
    publisher: 'Google LLC',
    category: 'browsers',
    packageName: 'google-chrome-stable',
    binary: 'google-chrome',
    sizeLabel: '104 MB',
    version: '131.0',
    launchMode: 'web',
    launchUrl: 'https://html.duckduckgo.com/html/?q=NizamOS',
    description: 'Fast web browser with native Linux integration and synced shortcuts.',
    arabicDescription: 'متصفح ويب سريع مع تكامل كامل مع نظام لينكس.',
    accentBg: 'from-sky-500 to-blue-600',
    badgeText: 'CH',
  },
  {
    id: 'store-firefox',
    name: 'Mozilla Firefox',
    arabicName: 'موزيلا فايرفوكس',
    publisher: 'Mozilla Foundation',
    category: 'browsers',
    packageName: 'firefox',
    binary: 'firefox',
    sizeLabel: '82 MB',
    version: '132.0',
    launchMode: 'web',
    launchUrl: 'https://en.m.wikipedia.org/wiki/Mozilla_Firefox',
    description: 'Privacy-focused open-source web browser for Linux & desktop.',
    arabicDescription: 'متصفح ويب مفتوح المصدر يركز على الخصوصية والسرعة.',
    accentBg: 'from-orange-500 to-rose-600',
    badgeText: 'FF',
  },
  {
    id: 'store-vlc',
    name: 'VLC Media Player',
    arabicName: 'مشغل وسائط VLC',
    publisher: 'VideoLAN',
    category: 'media',
    packageName: 'vlc',
    binary: 'vlc',
    sizeLabel: '48 MB',
    version: '3.0.21',
    launchMode: 'tauri',
    description: 'Universal multimedia player supporting MP4, MKV, FLAC, WAV, and streams.',
    arabicDescription: 'مشغل وسائط شامل يدعم كافة صيغ الفيديو والصوت.',
    accentBg: 'from-amber-500 to-orange-600',
    badgeText: 'VLC',
  },
  {
    id: 'store-vscode',
    name: 'Visual Studio Code',
    arabicName: 'فيجوال ستوديو كود',
    publisher: 'Microsoft',
    category: 'dev',
    packageName: 'code',
    binary: 'code',
    sizeLabel: '98 MB',
    version: '1.95',
    launchMode: 'terminal',
    description: 'Extensible code editor with TypeScript, Rust, Git, and terminal support.',
    arabicDescription: 'محرر برمجي متكامل مع دعم TypeScript و Rust والطرفية.',
    accentBg: 'from-blue-600 to-indigo-700',
    badgeText: 'VS',
  },
  {
    id: 'store-gimp',
    name: 'GIMP Image Studio',
    arabicName: 'استوديو الصور GIMP',
    publisher: 'GIMP Team',
    category: 'media',
    packageName: 'gimp',
    binary: 'gimp',
    sizeLabel: '142 MB',
    version: '2.10.38',
    launchMode: 'tauri',
    description: 'Professional open-source image editor and raster graphics studio.',
    arabicDescription: 'برنامج احترافي مفتوح المصدر لتحرير الصور والتصميم.',
    accentBg: 'from-stone-600 to-amber-700',
    badgeText: 'GIMP',
  },
  {
    id: 'store-wine',
    name: 'Wine + Proton Layer',
    arabicName: 'محاكي تشغيل ويندوز Wine',
    publisher: 'WineHQ / Valve',
    category: 'compatibility',
    packageName: 'wine',
    binary: 'wine',
    sizeLabel: '310 MB',
    version: '9.0 LTS',
    launchMode: 'terminal',
    description: 'Compatibility layer allowing Windows .exe applications & DirectX games on Linux.',
    arabicDescription: 'طبقة توافق لتشغيل برامج .exe وألعاب DirectX على النظام مباشرة.',
    accentBg: 'from-rose-600 to-red-700',
    badgeText: 'WINE',
  },
  {
    id: 'store-retroarch',
    name: 'RetroArch Emulator',
    arabicName: 'محاكي الألعاب RetroArch',
    publisher: 'Libretro',
    category: 'gaming',
    packageName: 'retroarch',
    binary: 'retroarch',
    sizeLabel: '165 MB',
    version: '1.19',
    launchMode: 'emulator',
    description: 'Multi-system game console emulator with shaders and controller support.',
    arabicDescription: 'محاكي ألعاب متعدد المنصات مع دعم وحدات التحكم والرسوميات.',
    accentBg: 'from-emerald-600 to-teal-700',
    badgeText: 'RA',
  },
  {
    id: 'store-steam',
    name: 'Steam Gaming Client',
    arabicName: 'منصة ألعاب Steam',
    publisher: 'Valve Corporation',
    category: 'gaming',
    packageName: 'steam',
    binary: 'steam',
    sizeLabel: '240 MB',
    version: 'Proton Ready',
    launchMode: 'web',
    launchUrl: 'https://store.steampowered.com',
    description: 'PC gaming storefront & Proton launcher for native and Windows games.',
    arabicDescription: 'متجر ومنصة ألعاب الكمبيوتر مع دعم Proton لتشغيل الألعاب.',
    accentBg: 'from-slate-700 to-blue-900',
    badgeText: 'STM',
  },
  {
    id: 'store-discord',
    name: 'Discord',
    arabicName: 'ديسكورد',
    publisher: 'Discord Inc.',
    category: 'gaming',
    packageName: 'discord',
    binary: 'discord',
    sizeLabel: '92 MB',
    version: '0.0.72',
    launchMode: 'web',
    launchUrl: 'https://discord.com/app',
    description: 'Voice, video, and community chat hub for gamers and developers.',
    arabicDescription: 'منصة محادثات صوتية ومجتمعات للألعاب والمطورين.',
    accentBg: 'from-indigo-500 to-violet-700',
    badgeText: 'DSC',
  },
];
