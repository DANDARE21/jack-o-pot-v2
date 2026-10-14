const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },

  // Window Controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen'),
  onMaximizeChange: (callback) => {
    const handler = (_event, isMax) => callback(isMax);
    ipcRenderer.on('window:maximized-change', handler);
    return () => ipcRenderer.removeListener('window:maximized-change', handler);
  },
  onFullscreenChange: (callback) => {
    const handler = (_event, isFull) => callback(isFull);
    ipcRenderer.on('window:fullscreen-change', handler);
    return () => ipcRenderer.removeListener('window:fullscreen-change', handler);
  },

  // Native System Features
  showNotification: (options) => ipcRenderer.invoke('system:notification', options),
  beep: () => ipcRenderer.invoke('system:beep'),
  openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
  openUserDataFolder: () => ipcRenderer.invoke('system:open-user-data'),
  
  // File System & Dialogs
  openFileDialog: (options) => ipcRenderer.invoke('dialog:open-file', options),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:save-file', options),
  readJsonFile: (filePath) => ipcRenderer.invoke('fs:read-json', filePath),
  writeJsonFile: (filePath, data) => ipcRenderer.invoke('fs:write-json', filePath, data),
  getUserDataPath: () => ipcRenderer.invoke('fs:get-user-data-path'),

  // Game Launcher & Executables
  selectExecutable: (options) => ipcRenderer.invoke('dialog:select-executable', options),
  launchGame: (options) => ipcRenderer.invoke('game:launch', options),
  openGameFolder: (executablePath) => ipcRenderer.invoke('game:open-folder', executablePath),
});
