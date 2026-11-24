import type { AppId, WindowAppProps } from '../windowManager/types';

type LauncherFn = (appId: AppId, props?: Omit<WindowAppProps, 'windowId'>) => string;

let registeredLauncher: LauncherFn | null = null;

export function setAppLauncher(fn: LauncherFn) {
  registeredLauncher = fn;
}

export function launchApp(
  appId: AppId,
  props?: Omit<WindowAppProps, 'windowId'>
): string | null {
  if (!registeredLauncher) return null;
  return registeredLauncher(appId, props);
}
