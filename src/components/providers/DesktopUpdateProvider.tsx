'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from '@/components/ui/use-toast';
import {
  getDesktopUpdatesApi,
  isDesktopApp,
  type DesktopUpdateState,
} from '@/lib/desktop-updates';

interface DesktopUpdateContextValue {
  isDesktop: boolean;
  state: DesktopUpdateState | null;
  refreshStatus: () => Promise<DesktopUpdateState | null>;
  checkForUpdates: () => Promise<DesktopUpdateState | null>;
  restartToUpdate: () => Promise<void>;
  installOnQuit: () => Promise<void>;
}

const DesktopUpdateContext = createContext<DesktopUpdateContextValue | null>(null);

export function DesktopUpdateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DesktopUpdateState | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const desktop = isDesktopApp();

  useEffect(() => {
    const updatesApi = getDesktopUpdatesApi();
    if (!updatesApi) {
      return undefined;
    }

    let active = true;

    updatesApi.getStatus().then((status) => {
      if (active) {
        setState(status);
      }
    }).catch((error) => {
      console.error('Failed to read desktop update status:', error);
    });

    const unsubscribe = updatesApi.subscribe((nextState) => {
      if (active) {
        setState(nextState);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!state) {
      return;
    }

    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = state.status;

    if (previousStatus === state.status) {
      return;
    }

    if (state.status === 'available') {
      toast({
        title: '发现新版本',
        description: state.message || `正在后台下载 ${state.targetVersion ?? '最新版本'}。`,
      });
      return;
    }

    if (state.status === 'downloaded') {
      toast({
        title: '更新已下载',
        description: '新版本已经准备好，可以立即重启安装，也可以退出应用时安装。',
      });
      return;
    }

    if (state.status === 'error') {
      toast({
        title: '自动更新失败',
        description: state.error || state.message || '更新服务暂时不可用，但应用可以继续使用。',
        variant: 'destructive',
      });
    }
  }, [state]);

  const value = useMemo<DesktopUpdateContextValue>(() => {
    const updatesApi = getDesktopUpdatesApi();

    return {
      isDesktop: desktop,
      state,
      refreshStatus: async () => {
        if (!updatesApi) {
          return null;
        }
        const nextState = await updatesApi.getStatus();
        setState(nextState);
        return nextState;
      },
      checkForUpdates: async () => {
        if (!updatesApi) {
          return null;
        }
        const nextState = await updatesApi.check();
        setState(nextState);
        return nextState;
      },
      restartToUpdate: async () => {
        if (!updatesApi) {
          return;
        }
        await updatesApi.restartAndInstall();
      },
      installOnQuit: async () => {
        if (!updatesApi) {
          return;
        }
        const nextState = await updatesApi.installOnQuit();
        if (nextState) {
          const refreshedState = await updatesApi.getStatus();
          setState(refreshedState);
        }
      },
    };
  }, [desktop, state]);

  return (
    <DesktopUpdateContext.Provider value={value}>
      {children}
    </DesktopUpdateContext.Provider>
  );
}

export function useDesktopUpdates() {
  const context = useContext(DesktopUpdateContext);

  if (!context) {
    throw new Error('useDesktopUpdates must be used inside DesktopUpdateProvider');
  }

  return context;
}
