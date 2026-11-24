import type { ComponentType } from 'react';

export type AppId =
  | 'files'
  | 'terminal'
  | 'editor'
  | 'calculator'
  | 'settings'
  | 'taskmgr'
  | 'browser'
  | 'media'
  | 'camera'
  | 'store'
  | 'recycle'
  | 'hardware'
  | 'updates'
  | 'compatibility'
  | 'welcome'
  | 'learn'
  | 'about';

export interface WindowAppProps {
  windowId: string;
  filePath?: string;
  initialDir?: string;
  initialTab?: string;
  initialUrl?: string;
  initialCommand?: string;
  storageMode?: 'host' | 'vfs';
  mediaPath?: string;
  storeAppId?: string;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowInstance {
  id: string;
  appId: AppId;
  title: string;
  component: ComponentType<WindowAppProps>;
  isMinimized: boolean;
  isMaximized: boolean;
  isClosing?: boolean;
  isMinimizing?: boolean;
  isRestoring?: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  props?: Omit<WindowAppProps, 'windowId'>;
}

export interface OpenWindowParams {
  id?: string;
  appId: AppId;
  title: string;
  component: ComponentType<WindowAppProps>;
  defaultWidth: number;
  defaultHeight: number;
  props?: Omit<WindowAppProps, 'windowId'>;
  viewportWidth?: number;
  viewportHeight?: number;
}
