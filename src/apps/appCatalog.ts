import type { AppId } from '../windowManager/types';

export interface AppCatalogEntry {
  id: AppId;
  title: string;
  arabicTitle: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
}

export const APP_CATALOG: AppCatalogEntry[] = [
  {
    id: 'files',
    title: 'Kemet Vault (Files)',
    arabicTitle: 'مدير الملفات',
    description: 'Browse drives, home directories, and run .exe/.deb/.sh files',
    defaultWidth: 860,
    defaultHeight: 540,
  },
  {
    id: 'terminal',
    title: 'Kemet Terminal',
    arabicTitle: 'التيرمينال',
    description: 'Native bash shell with neofetch, host CLI & VFS utilities',
    defaultWidth: 720,
    defaultHeight: 460,
  },
  {
    id: 'editor',
    title: 'Text Editor',
    arabicTitle: 'محرر النصوص',
    description: 'Edit and save documents directly to the file system',
    defaultWidth: 720,
    defaultHeight: 500,
  },
  {
    id: 'calculator',
    title: 'Calculator',
    arabicTitle: 'الآلة الحاسبة',
    description: 'Standard, Scientific, Programmer, and Unit Converter modules',
    defaultWidth: 440,
    defaultHeight: 580,
  },
  {
    id: 'browser',
    title: 'Kemet Browser',
    arabicTitle: 'متصفح الويب',
    description: 'WebKitGTK native browser engine, proxy mode, bookmarks & downloads',
    defaultWidth: 940,
    defaultHeight: 600,
  },
  {
    id: 'store',
    title: 'Kemet Store',
    arabicTitle: 'متجر كيميت',
    description: 'Install Chrome, Steam, Wine, VS Code, dev bundles & Windows alternatives',
    defaultWidth: 1080,
    defaultHeight: 680,
  },
  {
    id: 'hardware',
    title: 'Hardware & Drivers Hub',
    arabicTitle: 'مركز الجهاز والتعريفات',
    description: 'Real CPU, GPU, RAM, Wi-Fi, Audio & Camera Linux kernel driver status',
    defaultWidth: 880,
    defaultHeight: 560,
  },
  {
    id: 'updates',
    title: 'KemetOS Update Manager',
    arabicTitle: 'مدير التحديثات',
    description: 'Verified SHA-256 system updates, kernel patches, and rollback checkpoints',
    defaultWidth: 880,
    defaultHeight: 560,
  },
  {
    id: 'compatibility',
    title: 'Emulator & Compatibility Center',
    arabicTitle: 'مركز التوافق والمحاكاة',
    description: 'Windows Wine Engine (.exe/.msi), Native Linux ldd ABI & Android KVM/Waydroid checks',
    defaultWidth: 900,
    defaultHeight: 580,
  },
  {
    id: 'media',
    title: 'Media Player',
    arabicTitle: 'مشغل الوسائط',
    description: 'Play audio, video, and images from your host hard disk',
    defaultWidth: 760,
    defaultHeight: 500,
  },
  {
    id: 'camera',
    title: 'Camera',
    arabicTitle: 'الكاميرا',
    description: 'Capture live photos directly to your host Pictures folder',
    defaultWidth: 660,
    defaultHeight: 500,
  },
  {
    id: 'taskmgr',
    title: 'System Monitor',
    arabicTitle: 'مراقب النظام',
    description: 'Real host CPU/RAM/Network telemetry and OS processes',
    defaultWidth: 820,
    defaultHeight: 540,
  },
  {
    id: 'settings',
    title: 'Settings',
    arabicTitle: 'الإعدادات',
    description: 'Ultra-Lite performance mode, wallpapers, Wi-Fi, sound & system specs',
    defaultWidth: 860,
    defaultHeight: 580,
  },
  {
    id: 'recycle',
    title: 'Trash',
    arabicTitle: 'سلة المهملات',
    description: 'Recover deleted VFS files or empty storage',
    defaultWidth: 640,
    defaultHeight: 440,
  },
  {
    id: 'welcome',
    title: 'Welcome to KemetOS',
    arabicTitle: 'ترحيب KemetOS',
    description: 'Interactive KemetOS 1.0 sovereign workspace tour & tips',
    defaultWidth: 640,
    defaultHeight: 460,
  },
  {
    id: 'learn',
    title: 'Learn with KemetOS',
    arabicTitle: 'التعلّم مع كيميت',
    description: 'Guides for terminal, Wine .exe execution, and Debian packages',
    defaultWidth: 640,
    defaultHeight: 460,
  },
  {
    id: 'about',
    title: 'About KemetOS 1.0',
    arabicTitle: 'عن KemetOS 1.0',
    description: 'System identity, kernel version, and detected hardware summary',
    defaultWidth: 560,
    defaultHeight: 460,
  },
];

export function getAppMeta(appId: AppId): AppCatalogEntry {
  return APP_CATALOG.find((a) => a.id === appId) ?? APP_CATALOG[0];
}
