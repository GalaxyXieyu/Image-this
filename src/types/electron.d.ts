import type { DesktopUpdatesApi } from '@/lib/desktop-updates';

export type DesktopLogInfo = {
  directory: string;
  defaultDirectory: string;
  isCustom: boolean;
  appLogFile: string | null;
  errorLogFile: string | null;
};

export type DesktopLogFile = {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
};

export type DesktopLogsApi = {
  getInfo: () => Promise<DesktopLogInfo>;
  listFiles: () => Promise<DesktopLogFile[]>;
  readTail: (payload: { fileName: string; maxBytes?: number }) => Promise<{ fileName: string; content: string }>;
  openDirectory: () => Promise<boolean>;
  chooseDirectory: () => Promise<DesktopLogInfo>;
  resetDirectory: () => Promise<DesktopLogInfo>;
};

declare global {
  interface Window {
    electron?: {
      selectFile?: () => Promise<string[]>;
      selectDirectory?: () => Promise<string[]>;
      updates?: DesktopUpdatesApi;
      logs?: DesktopLogsApi;
      platform?: string;
      isElectron?: boolean;
    };
  }
}

export {};
