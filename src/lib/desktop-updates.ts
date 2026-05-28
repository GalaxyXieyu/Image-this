export type DesktopUpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'disabled'
  | 'unsupported'
  | 'error';

export interface DesktopUpdateState {
  supported: boolean;
  enabled: boolean;
  status: DesktopUpdateStatus;
  currentVersion: string;
  targetVersion: string | null;
  progress: number;
  message: string;
  installMode: 'on-quit' | null;
  feedUrl: string;
  error: string | null;
  downloadedFileName: string | null;
}

export interface DesktopUpdatesApi {
  getStatus: () => Promise<DesktopUpdateState | null>;
  check: () => Promise<DesktopUpdateState | null>;
  restartAndInstall: () => Promise<boolean>;
  installOnQuit: () => Promise<boolean>;
  subscribe: (callback: (state: DesktopUpdateState) => void) => () => void;
}

export function getDesktopUpdatesApi(): DesktopUpdatesApi | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.electron?.updates ?? null;
}

export function isDesktopApp() {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(window.electron?.isElectron);
}
