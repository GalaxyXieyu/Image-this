'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserPreferences } from '@/types/quality-review';

const STORAGE_KEY = 'ai-images-user-preferences';

const defaultPreferences: UserPreferences = {
  hideBatchWarning: false,
  defaultReviewEnabled: false,
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  // 从 localStorage 加载偏好设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({ ...defaultPreferences, ...parsed });
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
      setIsLoaded(true);
    }
  }, []);

  // 更新单个偏好设置
  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // 重置所有偏好设置
  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    preferences,
    updatePreference,
    resetPreferences,
    isLoaded,
  };
}
