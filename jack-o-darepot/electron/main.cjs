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

// ============================================================================
// GAME DATABASE SCRAPER: STEAM -> IGDB -> OPEN GAME DATABASE (Multi-tier)
// ============================================================================

const WIKI_USER_AGENT = 'JackOPotVault/2.0 (retro gaming app; contact: support@jackopot.app)';

// 1. Steam Store DB Search
async function querySteamDatabase(cleanQuery) {
  try {
    const searchRes = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanQuery)}&l=english&cc=US`
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const items = (searchData.items || []).slice(0, 6);
    if (items.length === 0) return [];

    const detailedResults = await Promise.all(
      items.map(async (item) => {
        try {
          const detailsRes = await fetch(
            `https://store.steampowered.com/api/appdetails?appids=${item.id}&l=english`
          );
          const detailsJson = await detailsRes.json();
          const appData = detailsJson[item.id]?.data || {};

          const verticalArtwork = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/library_600x900_2x.jpg`;
          const horizontalArtwork = appData.header_image || appData.capsule_image || item.tiny_image || '';
          const screenshots = (appData.screenshots || [])
            .slice(0, 6)
            .map((s) => s.path_full || s.path_thumbnail);
          const background = appData.background_raw || appData.background || '';

          return {
            id: `steam_${item.id}`,
            name: item.name || appData.name || '',
            verticalArtwork,
            horizontalArtwork,
            screenshots,
            background,
            description: appData.short_description || '',
            releaseDate: appData.release_date?.date || '',
            genres: (appData.genres || []).map((g) => g.description),
            source: 'STEAM',
          };
        } catch {
          return {
            id: `steam_${item.id}`,
            name: item.name,
            verticalArtwork: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/library_600x900_2x.jpg`,
            horizontalArtwork: item.tiny_image || '',
            screenshots: [],
            background: '',
            description: '',
            releaseDate: '',
            genres: [],
            source: 'STEAM',
          };
        }
      })
    );

    return detailedResults;
  } catch (err) {
    console.warn('Steam search failed:', err.message);
    return [];
  }
}

// 2. IGDB (Internet Game Database via Twitch OAuth)
async function queryIGDBDatabase(cleanQuery, clientId, clientSecret, accessToken = null) {
  if (!clientId || (!clientSecret && !accessToken)) return [];
  try {
    let token = accessToken;
    if (!token && clientSecret) {
      const tokenRes = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
        { method: 'POST' }
      );
      if (tokenRes.ok) {
        const tokenJson = await tokenRes.json();
        token = tokenJson.access_token;
      }
    }
    if (!token) return [];

    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: `search "${cleanQuery.replace(/"/g, '')}"; fields name, summary, cover.image_id, screenshots.image_id, artworks.image_id, genres.name, first_release_date; limit 6;`,
    });

    if (!igdbRes.ok) return [];
    const games = await igdbRes.json();
    if (!Array.isArray(games) || games.length === 0) return [];

    return games.map((g) => {
      const coverUrl = g.cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
        : '';
      const bannerUrl = g.artworks?.[0]?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_1080p/${g.artworks[0].image_id}.jpg`
        : g.screenshots?.[0]?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_1080p/${g.screenshots[0].image_id}.jpg`
        : coverUrl;

      const screenshots = (g.screenshots || []).map(
        (s) => `https://images.igdb.com/igdb/image/upload/t_1080p/${s.image_id}.jpg`
      );

      return {
        id: `igdb_${g.id}`,
        name: g.name,
        verticalArtwork: coverUrl,
        horizontalArtwork: bannerUrl,
        screenshots,
        description: g.summary || '',
        releaseDate: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear().toString() : '',
        genres: (g.genres || []).map((genre) => genre.name),
        source: 'IGDB',
      };
    });
  } catch (err) {
    console.warn('IGDB search failed:', err.message);
    return [];
  }
}

// 3. Open Video Game Database (Wikipedia / Wikimedia Video Game REST Archive)
async function queryOpenGameDatabase(cleanQuery) {
  try {
    // A. Use opensearch to find exact matching video game titles (following redirects)
    const openUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&limit=8&search=${encodeURIComponent(cleanQuery)}`;
    const openRes = await fetch(openUrl, { headers: { 'User-Agent': WIKI_USER_AGENT } });
    const [q, titles] = await openRes.json();

    let candidateTitles = (titles || []).filter(
      (t) => !/film|album|song|soundtrack|novel|disease|virus|bacteria|syndrome|biology/i.test(t)
    );
    if (candidateTitles.length === 0 && titles?.length > 0) candidateTitles = titles;

    candidateTitles.sort((a, b) => {
      const aIsGame = /video game/i.test(a);
      const bIsGame = /video game/i.test(b);
      if (aIsGame && !bIsGame) return -1;
      if (!aIsGame && bIsGame) return 1;
      return 0;
    });

    // If opensearch found nothing, fallback to video game generator search
    if (candidateTitles.length === 0) {
      const genUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(cleanQuery + ' video game')}&gsrlimit=4`;
      const genRes = await fetch(genUrl, { headers: { 'User-Agent': WIKI_USER_AGENT } });
      const genData = await genRes.json();
      candidateTitles = Object.values(genData.query?.pages || {}).map((p) => p.title);
    }

    if (candidateTitles.length === 0) return [];

    const results = [];
    for (const title of candidateTitles.slice(0, 4)) {
      try {
        const detailUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&titles=${encodeURIComponent(title)}&prop=pageimages|extracts|images&piprop=original|thumbnail&pithumbsize=800&pilicense=any&exintro=1&explaintext=1`;
        const detailRes = await fetch(detailUrl, { headers: { 'User-Agent': WIKI_USER_AGENT } });
        const detailData = await detailRes.json();
        const page = Object.values(detailData.query?.pages || {})[0];
        if (!page || page.missing) continue;

        const cover = page.thumbnail?.source || page.original?.source || '';
        const desc = page.extract || '';

        // Extract gameplay screenshots from article images
        let screenshots = [];
        if (page.images && page.images.length > 0) {
          const imgCandidates = page.images
            .map((i) => i.title)
            .filter((t) => /\.(jpe?g|png|webp)$/i.test(t) && !/flag|logo|icon|symbol|commons|ambox|wiki|stub/i.test(t));

          if (imgCandidates.length > 0) {
            const imgQuery = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=${encodeURIComponent(imgCandidates.slice(0, 4).join('|'))}&prop=imageinfo&iiprop=url`;
            const imgRes = await fetch(imgQuery, { headers: { 'User-Agent': WIKI_USER_AGENT } });
            const imgJson = await imgRes.json();
            const imgPages = Object.values(imgJson.query?.pages || {});
            screenshots = imgPages.map((ip) => ip.imageinfo?.[0]?.url).filter(Boolean);
          }
        }

        results.push({
          id: `open_${page.pageid}`,
          name: page.title.replace(/ \(video game.*?\)/i, ''),
          verticalArtwork: cover,
          horizontalArtwork: screenshots[0] || cover,
          screenshots,
          background: screenshots[1] || cover,
          description: desc.slice(0, 320),
          releaseDate: '',
          genres: [],
          source: 'OPEN_DB',
        });
      } catch (itemErr) {
        console.warn('Failed to parse Open DB item:', title, itemErr);
      }
    }

    return results;
  } catch (err) {
    console.warn('Open Game Database search failed:', err.message);
    return [];
  }
}

// Unified Database Search Handler with Multi-tier Fallback
ipcMain.handle('game:search-database', async (event, query, options = {}) => {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return { success: false, results: [] };
  }

  const cleanQuery = query.trim();
  const { forceProvider, igdbClientId, igdbClientSecret, igdbAccessToken } = options;

  try {
    // Case A: User explicitly requested IGDB
    if (forceProvider === 'igdb') {
      const igdbResults = await queryIGDBDatabase(cleanQuery, igdbClientId, igdbClientSecret, igdbAccessToken);
      if (igdbResults.length > 0) {
        return { success: true, results: igdbResults, provider: 'IGDB' };
      }
    }

    // Case B: User explicitly requested Open Game DB
    if (forceProvider === 'open') {
      const openResults = await queryOpenGameDatabase(cleanQuery);
      return { success: true, results: openResults, provider: 'OPEN_DB' };
    }

    // Default Multi-Tier Automatic Waterfall:
    // 1. Try Steam Store First
    let results = await querySteamDatabase(cleanQuery);
    if (results.length > 0) {
      return { success: true, results, provider: 'STEAM' };
    }

    // 2. If Steam has 0 matches, check IGDB if credentials exist
    if (igdbClientId && (igdbClientSecret || igdbAccessToken)) {
      results = await queryIGDBDatabase(cleanQuery, igdbClientId, igdbClientSecret, igdbAccessToken);
      if (results.length > 0) {
        return { success: true, results, provider: 'IGDB' };
      }
    }

    // 3. Fallback to Open Video Game Database (no keys required, covers console & retro games)
    results = await queryOpenGameDatabase(cleanQuery);
    return {
      success: true,
      results,
      provider: results.length > 0 ? 'OPEN_DB' : 'NONE',
    };
  } catch (err) {
    console.error('Unified game database search failed:', err);
    return { success: false, error: err.message, results: [] };
  }
});


