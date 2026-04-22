import type { DesktopUpdatesApi } from '@/lib/desktop-updates';

declare global {
  interface Window {
    electron?: {
      selectFile?: () => Promise<string[]>;
      selectDirectory?: () => Promise<string[]>;
      updates?: DesktopUpdatesApi;
      platform?: string;
      isElectron?: boolean;
    };
  }
}

export {};
