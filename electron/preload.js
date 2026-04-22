const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  updates: {
    getStatus: () => ipcRenderer.invoke('updates:get-status'),
    check: () => ipcRenderer.invoke('updates:check'),
    restartAndInstall: () => ipcRenderer.invoke('updates:restart-and-install'),
    subscribe: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('desktop-update-status', listener);
      return () => {
        ipcRenderer.removeListener('desktop-update-status', listener);
      };
    },
  },
  platform: process.platform,
  isElectron: true,
});
