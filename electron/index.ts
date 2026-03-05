/// <reference types="electron" />
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
let widgetWindow: typeof BrowserWindow | null = null;
let widgetWasActive = false;
let isQuitting = false;

function getIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'icons', 'icon.png');
  }
  return path.join(__dirname, '../../assets/icons', 'icon.png');
}

function createTray() {
  const icon = nativeImage.createFromPath(getIconPath()).resize({ width: 16, height: 16 });

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
          if (widgetWindow && !widgetWindow.isDestroyed()) {
            widgetWindow.webContents.send('hotkey-play', item.id);
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
        if (widgetWindow && !widgetWindow.isDestroyed()) {
          widgetWindow.webContents.send('hotkey-stop');
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
    frame: false,
    show: !startHidden,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximize-change', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximize-change', false);
  });

  mainWindow.on('close', (e: Event) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('show', () => {
    if (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible()) {
      widgetWasActive = true;
      widgetWindow.hide();
    }
  });

  mainWindow.on('hide', () => {
    if (widgetWasActive && widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.show();
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function createWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show();
    widgetWindow.focus();
    return widgetWindow;
  }

  const mainBounds = mainWindow?.getBounds();
  const x = mainBounds ? mainBounds.x + mainBounds.width - 340 : undefined;
  const y = mainBounds ? mainBounds.y + 40 : undefined;

  widgetWindow = new BrowserWindow({
    width: 320,
    height: 500,
    x,
    y,
    minWidth: 240,
    minHeight: 300,
    resizable: true,
    frame: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  widgetWindow.once('ready-to-show', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.show();
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    const baseUrl = process.env.ELECTRON_RENDERER_URL.replace(/\/$/, '');
    widgetWindow.loadURL(baseUrl + '/#/widget');
  } else {
    const filePath = path.join(__dirname, '../renderer/index.html');
    widgetWindow.loadURL(`file://${filePath}#/widget`);
  }

  widgetWindow.on('closed', () => {
    widgetWindow = null;
    widgetWasActive = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('widget-state-change', false);
    }
  });

  return widgetWindow;
}

function notifyWidgetState(isOpen: boolean) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('widget-state-change', isOpen);
  }
}

app.whenReady().then(() => {
  // Grant all media/audio permissions
  session.defaultSession.setPermissionRequestHandler((_webContents: unknown, _permission: string, callback: (granted: boolean) => void) => {
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler(() => true);

  // Bypass CORS for renderer fetch requests (needed with Vite dev server)
  session.defaultSession.webRequest.onHeadersReceived((details: Electron.OnHeadersReceivedListenerDetails, callback: (response: Electron.HeadersReceivedResponse) => void) => {
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
      return path.join(process.resourcesPath, 'assets', 'sounds', 'notification.mp3');
    }
    return path.join(__dirname, '../../assets/sounds', 'notification.mp3');
  });
  ipcMain.handle('open-external', (_event: unknown, url: string) => {
    return shell.openExternal(url);
  });

  ipcMain.handle('window-minimize', () => mainWindow?.minimize());
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window-close', () => {
    mainWindow?.close();
  });
  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);

  ipcMain.handle('widget-toggle', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      if (widgetWindow.isVisible()) {
        widgetWindow.hide();
        widgetWasActive = false;
        notifyWidgetState(false);
        return false;
      } else {
        widgetWindow.show();
        widgetWasActive = true;
        notifyWidgetState(true);
        return true;
      }
    }
    createWidgetWindow();
    widgetWasActive = true;
    notifyWidgetState(true);
    return true;
  });

  ipcMain.handle('widget-close', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.close();
    }
    widgetWasActive = false;
  });

  ipcMain.handle('widget-is-open', () => {
    return !!(widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible());
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

    const item = { id, name, filename, volume: 100, useDefault: true, hotkey: null, backupEnabled: true };
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
      backupEnabled: true,
      ...item
    }));
  });

  ipcMain.handle('library-update', (_event: unknown, { id, data }: { id: string; data: Record<string, unknown> }) => {
    const index = loadLibraryIndex();
    const item = index.find((i: { id: string }) => i.id === id);
    if (!item) return null;
    const allowed = ['name', 'volume', 'useDefault', 'hotkey', 'backupEnabled'];
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
        const bakPrefix = item.filename + '.bak.';
        const allFiles = fs.readdirSync(LIBRARY_DIR) as string[];
        for (const f of allFiles) {
          if (f.startsWith(bakPrefix)) {
            zip.addLocalFile(path.join(LIBRARY_DIR, f));
          }
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

      // Restore backups if present in ZIP
      const bakPrefix = item.filename + '.bak.';
      for (const entry of zip.getEntries()) {
        if (entry.entryName.startsWith(bakPrefix)) {
          const suffix = entry.entryName.slice(item.filename.length);
          fs.writeFileSync(path.join(LIBRARY_DIR, newFilename + suffix), entry.getData());
        }
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
      // Delete all backups for this file
      const bakPrefix = item.filename + '.bak.';
      const allFiles = fs.readdirSync(LIBRARY_DIR) as string[];
      for (const f of allFiles) {
        if (f.startsWith(bakPrefix)) {
          fs.unlinkSync(path.join(LIBRARY_DIR, f));
        }
      }
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

  ipcMain.handle('library-list-backups', (_event: unknown, id: string) => {
    const index = loadLibraryIndex();
    const item = index.find((i: { id: string }) => i.id === id);
    if (!item) return [];
    const prefix = item.filename + '.bak.';
    if (!fs.existsSync(LIBRARY_DIR)) return [];
    const files = fs.readdirSync(LIBRARY_DIR) as string[];
    return files
      .filter((f: string) => f.startsWith(prefix))
      .map((f: string) => {
        const ts = parseInt(f.slice(prefix.length), 10);
        return { timestamp: ts, filename: f };
      })
      .sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp);
  });

  ipcMain.handle('library-restore-backup', (_event: unknown, { id, timestamp }: { id: string; timestamp: number }) => {
    const index = loadLibraryIndex();
    const item = index.find((i: { id: string }) => i.id === id);
    if (!item) return { success: false, error: 'Item not found' };
    const mp3Path = path.join(LIBRARY_DIR, item.filename);
    const backupPath = mp3Path + `.bak.${timestamp}`;
    if (!fs.existsSync(backupPath)) return { success: false, error: 'Backup not found' };
    try {
      fs.copyFileSync(backupPath, mp3Path);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('library-delete-backup', (_event: unknown, { id, timestamp }: { id: string; timestamp: number }) => {
    const index = loadLibraryIndex();
    const item = index.find((i: { id: string }) => i.id === id);
    if (!item) return false;
    const backupPath = path.join(LIBRARY_DIR, item.filename + `.bak.${timestamp}`);
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      return true;
    }
    return false;
  });

  ipcMain.handle('library-delete-all-backups', (_event: unknown, id?: string) => {
    if (!fs.existsSync(LIBRARY_DIR)) return false;
    const allFiles = fs.readdirSync(LIBRARY_DIR) as string[];
    if (id) {
      const index = loadLibraryIndex();
      const item = index.find((i: { id: string }) => i.id === id);
      if (!item) return false;
      const bakPrefix = item.filename + '.bak.';
      for (const f of allFiles) {
        if (f.startsWith(bakPrefix)) {
          fs.unlinkSync(path.join(LIBRARY_DIR, f));
        }
      }
    } else {
      for (const f of allFiles) {
        if (f.includes('.bak.')) {
          fs.unlinkSync(path.join(LIBRARY_DIR, f));
        }
      }
    }
    return true;
  });

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

  const tempPath = path.join(LIBRARY_DIR, `${item.id}_trimmed.mp3`);

  if (item.backupEnabled !== false) {
    const timestamp = Date.now();
    const backupPath = mp3Path + `.bak.${timestamp}`;
    fs.copyFileSync(mp3Path, backupPath);
  }

  const duration = endTime - startTime;

  return new Promise((resolve) => {
    fluentFfmpeg(mp3Path)
      .setFfmpegPath(resolveFfmpegPath())
      .inputOptions([`-ss ${startTime}`])
      .outputOptions([`-t ${duration}`, '-b:a 192k'])
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
  return files.some((f: string) => f.includes('.bak.'));
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
