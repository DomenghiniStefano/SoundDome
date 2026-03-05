const { app, BrowserWindow, ipcMain, session, shell, dialog, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const AdmZip = require('adm-zip');
const fluentFfmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const https = require('https');
const http = require('http');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const LIBRARY_DIR = path.join(app.getPath('userData'), 'library');
const LIBRARY_INDEX = path.join(LIBRARY_DIR, 'index.json');

const DEFAULT_CONFIG = {
  sendToSpeakers: true,
  sendToVirtualMic: false,
  speakerDeviceId: '',
  virtualMicDeviceId: '',
  outputVolume: 80,
  monitorVolume: 50,
  stopHotkey: null
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(data: Record<string, unknown>) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving config:', err);
    return false;
  }
}

let tray: typeof Tray | null = null;
let mainWindow: typeof BrowserWindow | null = null;
let isQuitting = false;

function createTray() {
  // 16x16 simple icon
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAiklEQVQ4T2NkoBAwUqifYdAb8P9/A8P/fxkZGBj+M/z/z8jIyMDAwMTA8J+JkYHhPwMDA/P//wwgGi4GEmRkZGBgBMr/h4gxMTMyMjH8Z2BkYISpZQSqZWRk+M/AxMjEwMTIBDKACWwryGUQFzAyMDAwMDIyMjIwMP5nYGBkALuFPMcTnRoAuooxEX8LkUoAAAAASUVORK5CYII='
  );

  tray = new Tray(icon);
  tray.setToolTip('SoundDome');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Apri SoundDome',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Esci',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  const index = loadLibraryIndex();
  for (const item of index) {
    if (item.hotkey) {
      try {
        globalShortcut.register(item.hotkey, () => {
          if (mainWindow) {
            mainWindow.webContents.send('hotkey-play', item.id);
          }
        });
      } catch (err) {
        console.error(`Failed to register hotkey "${item.hotkey}" for "${item.name}":`, err);
      }
    }
  }

  const config = loadConfig();
  if (config.stopHotkey) {
    try {
      globalShortcut.register(config.stopHotkey, () => {
        if (mainWindow) {
          mainWindow.webContents.send('hotkey-stop');
        }
      });
    } catch (err) {
      console.error(`Failed to register stop hotkey "${config.stopHotkey}":`, err);
    }
  }
}

function createWindow() {
  const startHidden = process.argv.includes('--hidden');
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    resizable: true,
    show: !startHidden,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  mainWindow.on('close', (e: Event) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  // Grant all media/audio permissions
  session.defaultSession.setPermissionRequestHandler((_webContents: unknown, _permission: string, callback: (granted: boolean) => void) => {
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler(() => true);

  // Bypass CORS for renderer fetch requests (needed with Vite dev server)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Headers': ['*']
      }
    });
  });

  // IPC handlers
  ipcMain.handle('load-config', () => loadConfig());
  ipcMain.handle('save-config', (_event: unknown, data: Record<string, unknown>) => {
    const result = saveConfig(data);
    registerHotkeys();
    return result;
  });
  ipcMain.handle('get-sound-path', () => {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'assets', 'sound.mp3');
    }
    return path.join(__dirname, '../../assets', 'sound.mp3');
  });
  ipcMain.handle('open-external', (_event: unknown, url: string) => {
    return shell.openExternal(url);
  });

  ipcMain.handle('get-auto-launch', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  ipcMain.handle('set-auto-launch', (_event: unknown, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      args: enabled ? ['--hidden'] : []
    });
    return true;
  });

  // Library handlers
  ipcMain.handle('library-save', async (_event: unknown, { name, url }: { name: string; url: string }) => {
    if (!fs.existsSync(LIBRARY_DIR)) {
      fs.mkdirSync(LIBRARY_DIR, { recursive: true });
    }

    const index = loadLibraryIndex();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const filename = `${id}.mp3`;
    const filePath = path.join(LIBRARY_DIR, filename);

    await downloadFile(url, filePath);

    const item = { id, name, filename, volume: 100, useDefault: true, hotkey: null };
    index.push(item);
    fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(index, null, 2), 'utf-8');

    return item;
  });

  ipcMain.handle('library-list', () => {
    const index = loadLibraryIndex();
    return index.map((item: Record<string, unknown>) => ({
      volume: 100,
      useDefault: true,
      hotkey: null,
      ...item
    }));
  });

  ipcMain.handle('library-update', (_event: unknown, { id, data }: { id: string; data: Record<string, unknown> }) => {
    const index = loadLibraryIndex();
    const item = index.find((i: { id: string }) => i.id === id);
    if (!item) return null;
    const allowed = ['name', 'volume', 'useDefault', 'hotkey'];
    for (const key of allowed) {
      if (key in data) item[key] = data[key];
    }
    fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(index, null, 2), 'utf-8');
    if ('hotkey' in data) registerHotkeys();
    return item;
  });

  ipcMain.handle('library-get-path', (_event: unknown, filename: string) => {
    return path.join(LIBRARY_DIR, filename);
  });

  ipcMain.handle('library-export', async (_event: unknown, { includeBackups }: { includeBackups?: boolean } = {}) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Library',
      defaultPath: 'sounddome-library.sounddome',
      filters: [{ name: 'SoundDome Library', extensions: ['sounddome'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const index = loadLibraryIndex();
    if (index.length === 0) return { success: false, error: 'Library is empty' };

    const zip = new AdmZip();
    zip.addFile('index.json', Buffer.from(JSON.stringify(index, null, 2), 'utf-8'));

    for (const item of index) {
      const mp3Path = path.join(LIBRARY_DIR, item.filename);
      if (fs.existsSync(mp3Path)) {
        zip.addLocalFile(mp3Path);
      }
      if (includeBackups) {
        const backupPath = mp3Path + '.backup';
        if (fs.existsSync(backupPath)) {
          zip.addLocalFile(backupPath);
        }
      }
    }

    zip.writeZip(filePath);
    return { success: true, count: index.length };
  });

  ipcMain.handle('library-import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Library',
      filters: [{ name: 'SoundDome Library', extensions: ['sounddome'] }],
      properties: ['openFile']
    });
    if (canceled || filePaths.length === 0) return { success: false, canceled: true };

    if (!fs.existsSync(LIBRARY_DIR)) {
      fs.mkdirSync(LIBRARY_DIR, { recursive: true });
    }

    const zip = new AdmZip(filePaths[0]);
    const indexEntry = zip.getEntry('index.json');
    if (!indexEntry) return { success: false, error: 'Invalid .sounddome file (no index.json)' };

    const importedIndex = JSON.parse(indexEntry.getData().toString('utf-8'));
    const currentIndex = loadLibraryIndex();
    const existingNames = new Set(currentIndex.map((i: { name: string }) => i.name));

    let added = 0;
    for (const item of importedIndex) {
      if (existingNames.has(item.name)) continue;

      const entry = zip.getEntry(item.filename);
      if (!entry) continue;

      const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const newFilename = `${newId}.mp3`;
      fs.writeFileSync(path.join(LIBRARY_DIR, newFilename), entry.getData());

      // Restore backup if present in ZIP
      const backupEntry = zip.getEntry(item.filename + '.backup');
      if (backupEntry) {
        fs.writeFileSync(path.join(LIBRARY_DIR, newFilename + '.backup'), backupEntry.getData());
      }

      currentIndex.push({
        id: newId,
        name: item.name,
        filename: newFilename,
        volume: item.volume ?? 100,
        useDefault: item.useDefault ?? true,
        hotkey: item.hotkey ?? null
      });
      existingNames.add(item.name);
      added++;
    }

    fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(currentIndex, null, 2), 'utf-8');
    if (added > 0) registerHotkeys();
    return { success: true, added, total: currentIndex.length };
  });

  ipcMain.handle('library-reorder', (_event: unknown, orderedIds: string[]) => {
    const index = loadLibraryIndex();
    const byId = new Map(index.map((item: { id: string }) => [item.id, item]));
    const reordered = orderedIds.map((id: string) => byId.get(id)).filter(Boolean);
    fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(reordered, null, 2), 'utf-8');
    return true;
  });

  ipcMain.handle('library-delete', (_event: unknown, id: string) => {
    const index = loadLibraryIndex();
    const item = index.find((i: { id: string }) => i.id === id);
    if (item) {
      const hadHotkey = !!item.hotkey;
      const filePath = path.join(LIBRARY_DIR, item.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      const backupPath = filePath + '.backup';
      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
      const newIndex = index.filter((i: { id: string }) => i.id !== id);
      fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(newIndex, null, 2), 'utf-8');
      if (hadHotkey) registerHotkeys();
    }
    return true;
  });

  ipcMain.handle('library-trim', async (_event: unknown, { id, startTime, endTime }: { id: string; startTime: number; endTime: number }) => {
    return trimLibrarySound(id, startTime, endTime);
  });

  ipcMain.handle('library-has-backups', () => hasLibraryBackups());

  createTray();

  createWindow();

  registerHotkeys();

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Do nothing — app stays alive in tray
});

function resolveFfmpegPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'ffmpeg.exe')
    : require('ffmpeg-static');
}

function trimLibrarySound(id: string, startTime: number, endTime: number): Promise<{ success: boolean; error?: string }> {
  const index = loadLibraryIndex();
  const item = index.find((i: { id: string }) => i.id === id);
  if (!item) return Promise.resolve({ success: false, error: 'Item not found' });

  const mp3Path = path.join(LIBRARY_DIR, item.filename);
  if (!fs.existsSync(mp3Path)) return Promise.resolve({ success: false, error: 'File not found' });

  const backupPath = mp3Path + '.backup';
  const tempPath = path.join(LIBRARY_DIR, `${item.id}_trimmed.mp3`);

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(mp3Path, backupPath);
  }

  const duration = endTime - startTime;

  return new Promise((resolve) => {
    fluentFfmpeg(mp3Path)
      .setFfmpegPath(resolveFfmpegPath())
      .inputOptions([`-ss ${startTime}`])
      .outputOptions([`-t ${duration}`, '-c copy'])
      .output(tempPath)
      .on('end', () => {
        try {
          fs.unlinkSync(mp3Path);
          fs.renameSync(tempPath, mp3Path);
          resolve({ success: true });
        } catch (err: unknown) {
          resolve({ success: false, error: (err as Error).message });
        }
      })
      .on('error', (err: Error) => {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        resolve({ success: false, error: err.message });
      })
      .run();
  });
}

function hasLibraryBackups(): boolean {
  if (!fs.existsSync(LIBRARY_DIR)) return false;
  const files = fs.readdirSync(LIBRARY_DIR) as string[];
  return files.some((f: string) => f.endsWith('.backup'));
}

function loadLibraryIndex() {
  try {
    if (fs.existsSync(LIBRARY_INDEX)) {
      return JSON.parse(fs.readFileSync(LIBRARY_INDEX, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading library index:', err);
  }
  return [];
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    client.get(url, (res: { statusCode: number; headers: { location?: string }; pipe: (dest: unknown) => void }) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', (err: Error) => {
        fs.unlinkSync(dest);
        reject(err);
      });
    }).on('error', (err: Error) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}
