
import { useState, useEffect } from 'react';
import { APIService } from '@/services/apiService';

export const useAPIService = () => {
  const [apiService, setApiService] = useState<APIService | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // 从localStorage读取设置
    const savedSettings = localStorage.getItem('aiImageSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      
      if (settings.gptApiKey && settings.qwenApiKey) {
        const service = new APIService({
          gptApiUrl: settings.gptApiUrl,
          gptApiKey: settings.gptApiKey,
          qwenApiKey: settings.qwenApiKey,
          tempFileServerUrl: settings.tempFileServerUrl
        });
        
        setApiService(service);
        setIsConfigured(true);
      }
    }
  }, []);

  const updateConfiguration = (config: {
    gptApiUrl: string;
    gptApiKey: string;
    qwenApiKey: string;
    tempFileServerUrl?: string;
  }) => {
    const service = new APIService(config);
    setApiService(service);
    setIsConfigured(true);
  };

  return {
    apiService,
    isConfigured,
    updateConfiguration
  };
};
