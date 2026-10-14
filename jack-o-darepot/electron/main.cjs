const { app, BrowserWindow, ipcMain, shell, Notification, dialog, desktopCapturer, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 880,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#070709',
    title: "JACK'O POT",
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-change', false);
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen-change', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen-change', false);
  });

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      // If dev server isn't running yet or failed, fallback to dist
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch((err) => {
        console.error('Failed to load application:', err);
      });
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single Instance Lock to prevent multiple processes from colliding on GPUCache and ports
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // App Lifecycle
  app.whenReady().then(() => {
    // Enable loopback audio access for the renderer
    if (session && session.defaultSession) {
      session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
          if (sources && sources.length > 0) {
            callback({ video: sources[0], audio: 'loopback' });
          } else {
            callback({});
          }
        }).catch((err) => {
          console.error('Error getting desktop sources for audio capture:', err);
          callback({});
        });
      });
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

// Window Control IPC Handlers
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:toggle-fullscreen', () => {
  if (!mainWindow) return false;
  const isFull = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(isFull);
  return isFull;
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('window:is-fullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

// System Features IPC Handlers
ipcMain.handle('system:notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || "JACK'O POT",
      body: body || '',
    }).show();
    return true;
  }
  return false;
});

ipcMain.handle('system:beep', () => {
  shell.beep();
  return true;
});

ipcMain.handle('system:open-external', async (event, url) => {
  if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('system:open-user-data', async () => {
  const userDataPath = app.getPath('userData');
  await shell.openPath(userDataPath);
  return userDataPath;
});

ipcMain.handle('fs:get-user-data-path', () => {
  return app.getPath('userData');
});

// File Dialogs & File System
ipcMain.handle('dialog:open-file', async (event, options = {}) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title || 'Select a JSON file',
    properties: ['openFile'],
    filters: options.filters || [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selectedPath = result.filePaths[0];
  try {
    const content = await fs.promises.readFile(selectedPath, 'utf-8');
    return {
      filePath: selectedPath,
      content,
      data: JSON.parse(content),
    };
  } catch (err) {
    return {
      filePath: selectedPath,
      error: err.message,
    };
  }
});

ipcMain.handle('dialog:save-file', async (event, { defaultPath, data, content }) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export File',
    defaultPath: defaultPath || 'jack-o-pot-export.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  const fileData = content || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  await fs.promises.writeFile(result.filePath, fileData, 'utf-8');
  return { filePath: result.filePath, success: true };
});

ipcMain.handle('fs:read-json', async (event, filePath) => {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return { success: true, data: JSON.parse(raw) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:write-json', async (event, filePath, data) => {
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Game Executable Dialog & Launcher IPC Handlers
ipcMain.handle('dialog:select-executable', async (event, options = {}) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title || 'Select Game Executable',
    properties: ['openFile'],
    filters: [
      { name: 'Executables (*.exe, *.bat, *.cmd, *.lnk, *.url)', extensions: ['exe', 'bat', 'cmd', 'lnk', 'url'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const selectedPath = result.filePaths[0];
  return {
    canceled: false,
    filePath: selectedPath,
    fileName: path.basename(selectedPath),
  };
});

ipcMain.handle('game:launch', async (event, { executablePath, args = [] }) => {
  if (!executablePath || typeof executablePath !== 'string') {
    return { success: false, error: 'No executable path provided.' };
  }

  const cleanPath = executablePath.trim();

  // If it's a URL or Steam URI (e.g. steam://run/...)
  if (cleanPath.startsWith('http:') || cleanPath.startsWith('https:') || cleanPath.startsWith('steam:')) {
    try {
      await shell.openExternal(cleanPath);
      return { success: true, method: 'openExternal' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  if (!fs.existsSync(cleanPath)) {
    return { success: false, error: `File not found at path:\n${cleanPath}` };
  }

  try {
    const ext = path.extname(cleanPath).toLowerCase();
    const workingDir = path.dirname(cleanPath);

    // Shortcuts (.lnk, .url) should be launched via shell.openPath
    if (ext === '.lnk' || ext === '.url') {
      const err = await shell.openPath(cleanPath);
      if (err) {
        return { success: false, error: err };
      }
      return { success: true, method: 'shell.openPath' };
    }

    // Parse args if string was passed
    let launchArgs = [];
    if (Array.isArray(args)) {
      launchArgs = args;
    } else if (typeof args === 'string' && args.trim().length > 0) {
      launchArgs = args.trim().split(/\s+/);
    }

    // Launch standalone executable with its working directory set to its containing folder
    const child = spawn(cleanPath, launchArgs, {
      cwd: workingDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });

    child.unref();

    return {
      success: true,
      pid: child.pid,
      filePath: cleanPath,
    };
  } catch (err) {
    console.error('Error launching game:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('game:open-folder', async (event, executablePath) => {
  if (!executablePath) return false;
  try {
    if (fs.existsSync(executablePath)) {
      shell.showItemInFolder(executablePath);
      return true;
    } else {
      const dir = path.dirname(executablePath);
      if (fs.existsSync(dir)) {
        await shell.openPath(dir);
        return true;
      }
    }
  } catch (err) {
    console.error('Error opening game folder:', err);
  }
  return false;
});

