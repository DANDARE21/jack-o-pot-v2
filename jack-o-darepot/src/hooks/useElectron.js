import { useMemo } from 'react';

export function useElectron() {
  const electron = useMemo(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return window.electronAPI;
    }
    return null;
  }, []);

  const isElectron = Boolean(electron?.isElectron);

  const showNotification = async ({ title, body }) => {
    if (electron?.showNotification) {
      return await electron.showNotification({ title, body });
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
        return true;
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body });
          return true;
        }
      }
    }
    return false;
  };

  const beep = async () => {
    if (electron?.beep) {
      return await electron.beep();
    }
  };

  const toggleFullscreen = async () => {
    if (electron?.toggleFullscreen) {
      return await electron.toggleFullscreen();
    }
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  const minimize = () => electron?.minimize?.();
  const maximize = () => electron?.maximize?.();
  const close = () => electron?.close?.();
  const isFullscreen = () => electron?.isFullscreen?.();
  const onFullscreenChange = (cb) => electron?.onFullscreenChange?.(cb);
  const isMaximized = () => electron?.isMaximized?.();
  const onMaximizeChange = (cb) => electron?.onMaximizeChange?.(cb);

  const openUserDataFolder = () => electron?.openUserDataFolder?.();

  const importJsonFile = async (options = {}) => {
    if (electron?.openFileDialog) {
      return await electron.openFileDialog(options);
    }
    return null;
  };

  const exportJsonFile = async (data, defaultPath) => {
    if (electron?.saveFileDialog) {
      return await electron.saveFileDialog({ data, defaultPath });
    }
    return null;
  };

  const selectExecutable = async (options = {}) => {
    if (electron?.selectExecutable) {
      return await electron.selectExecutable(options);
    }
    return null;
  };

  const launchGame = async ({ executablePath, args = [] }) => {
    if (electron?.launchGame) {
      return await electron.launchGame({ executablePath, args });
    }
    return { success: false, error: "Not running in Electron desktop environment." };
  };

  const openGameFolder = async (executablePath) => {
    if (electron?.openGameFolder) {
      return await electron.openGameFolder(executablePath);
    }
    return false;
  };

  const searchGameDatabase = async (query, options = {}) => {
    if (electron?.searchGameDatabase) {
      return await electron.searchGameDatabase(query, options);
    }
    return null;
  };

  const testIgdbConnection = async (credentials) => {
    if (electron?.testIgdbConnection) {
      return await electron.testIgdbConnection(credentials);
    }
    return { success: false, error: 'IGDB connection test requires Electron desktop app.' };
  };

  return {
    isElectron,
    electron,
    showNotification,
    beep,
    toggleFullscreen,
    isFullscreen,
    onFullscreenChange,
    minimize,
    maximize,
    close,
    isMaximized,
    onMaximizeChange,
    openUserDataFolder,
    importJsonFile,
    exportJsonFile,
    selectExecutable,
    launchGame,
    openGameFolder,
    searchGameDatabase,
    testIgdbConnection,
  };
}
