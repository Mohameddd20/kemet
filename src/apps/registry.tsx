import type { ComponentType } from 'react';
import {
  Activity,
  BookOpen,
  Calculator,
  Camera,
  Cpu,
  FileText,
  Film,
  FolderOpen,
  Globe,
  Info,
  Layers,
  RefreshCw,
  Settings,
  ShoppingBag,
  Sparkles,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useNotificationStore } from '../system/notificationStore';
import { isAppInstalled, launchNativeApp } from '../services/systemBridge';
import { launchExternalLinuxApp } from '../system/systemBridge';
import type { AppId, WindowAppProps } from '../windowManager/types';
import { setAppLauncher } from '../windowManager/launcher';
import { useWindowStore } from '../windowManager/useWindowStore';
import { getAppMeta } from './appCatalog';
import { CalculatorApp } from './CalculatorApp';
import { CameraApp } from './CameraApp';
import { MediaPlayerApp } from './MediaPlayerApp';
import { RecycleBinApp } from './RecycleBinApp';
import { TaskManagerApp } from './TaskManagerApp';
import { TextEditorApp } from './TextEditorApp';
import { FileManager } from '../components/os/FileManager';
import { TerminalApp } from '../components/os/TerminalApp';
import { KemetBrowser } from '../components/os/KemetBrowser';
import { KemetStore } from '../components/os/KemetStore';
import { SettingsApp } from '../components/os/SettingsApp';
import { HardwareHub } from '../components/os/HardwareHub';
import { UpdateManager } from '../components/os/UpdateManager';
import { CompatibilityCenter } from '../components/os/CompatibilityCenter';
import {
  AboutKemetModalApp,
  LearnModalApp,
  WelcomeModalApp,
} from '../components/os/DesktopModals';
import { useSettingsStore } from '../system/settingsStore';

export const APP_COMPONENTS: Record<AppId, ComponentType<WindowAppProps>> = {
  files: FileManager,
  terminal: TerminalApp,
  editor: TextEditorApp,
  calculator: CalculatorApp,
  browser: KemetBrowser,
  media: MediaPlayerApp,
  camera: CameraApp,
  store: KemetStore,
  taskmgr: TaskManagerApp,
  settings: SettingsApp,
  recycle: RecycleBinApp,
  hardware: HardwareHub,
  updates: UpdateManager,
  compatibility: CompatibilityCenter,
  welcome: WelcomeModalApp,
  learn: LearnModalApp,
  about: AboutKemetModalApp,
};

export const APP_ICONS: Record<AppId, ComponentType<{ className?: string }>> = {
  files: FolderOpen,
  terminal: Terminal,
  editor: FileText,
  calculator: Calculator,
  browser: Globe,
  media: Film,
  camera: Camera,
  store: ShoppingBag,
  taskmgr: Activity,
  settings: Settings,
  recycle: Trash2,
  hardware: Cpu,
  updates: RefreshCw,
  compatibility: Layers,
  welcome: Sparkles,
  learn: BookOpen,
  about: Info,
};

export function openOsApp(
  appId: AppId,
  props?: Omit<WindowAppProps, 'windowId'>
): string {
  const meta = getAppMeta(appId);
  const component = APP_COMPONENTS[appId];
  const isAr = useSettingsStore.getState().language === 'ar';
  const baseTitle = isAr ? meta.arabicTitle : meta.title;
  return useWindowStore.getState().openWindow({
    appId,
    title: props?.filePath ? `${baseTitle} — ${props.filePath.split('/').pop()}` : baseTitle,
    component,
    defaultWidth: meta.defaultWidth,
    defaultHeight: meta.defaultHeight,
    props,
  });
}

export async function openInstalledStoreApp(app: {
  id: string;
  name: string;
  binary: string;
  launchMode: 'web' | 'terminal' | 'tauri' | 'emulator';
  launchUrl?: string;
}): Promise<void> {
  const native = await launchExternalLinuxApp(app.binary);
  if (native.ok) {
    useNotificationStore
      .getState()
      .pushNotification('Launched Native App', `Started ${app.name} (${app.binary}).`, 'system');
    return;
  }
  if (app.launchMode === 'web' && app.launchUrl) {
    openOsApp('browser', { initialUrl: app.launchUrl });
    return;
  }
  if (app.launchMode === 'tauri') {
    openOsApp('media');
    return;
  }
  openOsApp('terminal', { storageMode: 'host' });
  useNotificationStore
    .getState()
    .pushNotification(
      app.name,
      `Opened Host Terminal. Run "${app.binary}" directly inside native Linux / ISO.`,
      'system'
    );
}

export async function openBrowserOrChromeStore(): Promise<void> {
  const probe = (cmd: string) =>
    Promise.race([
      isAppInstalled(cmd, cmd).catch(() => ({
        installed: false,
        path: null,
      })),
      new Promise<{ installed: false; path: null }>((resolve) =>
        setTimeout(() => resolve({ installed: false, path: null }), 800)
      ),
    ]);

  const [chromeCheck, chromiumCheck] = await Promise.all([
    probe('google-chrome-stable'),
    probe('chromium'),
  ]);

  if (chromeCheck.installed) {
    const res = await launchNativeApp('google-chrome-stable', ['--no-first-run']);
    if (res.ok) return;
  }
  if (chromiumCheck.installed) {
    const res = await launchNativeApp('chromium', ['--no-first-run']);
    if (res.ok) return;
  }
  openOsApp('store', { storeAppId: 'google-chrome' });
}

// Register global launcher bridge once
setAppLauncher(openOsApp);
