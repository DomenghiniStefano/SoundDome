const { app, BrowserWindow, ipcMain, session, shell, dialog } = require('electron');
const AdmZip = require('adm-zip');
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
  monitorVolume: 50
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

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
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
  ipcMain.handle('save-config', (_event: unknown, data: Record<string, unknown>) => saveConfig(data));
  ipcMain.handle('get-sound-path', () => {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'assets', 'sound.mp3');
    }
    return path.join(__dirname, '../../assets', 'sound.mp3');
  });
  ipcMain.handle('open-external', (_event: unknown, url: string) => {
    return shell.openExternal(url);
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

    index.push({ id, name, filename });
    fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(index, null, 2), 'utf-8');

    return { id, name, filename };
  });

  ipcMain.handle('library-list', () => {
    return loadLibraryIndex();
  });

  ipcMain.handle('library-get-path', (_event: unknown, filename: string) => {
    return path.join(LIBRARY_DIR, filename);
  });

  ipcMain.handle('library-export', async () => {
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

      currentIndex.push({ id: newId, name: item.name, filename: newFilename });
      existingNames.add(item.name);
      added++;
    }

    fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(currentIndex, null, 2), 'utf-8');
    return { success: true, added, total: currentIndex.length };
  });

  ipcMain.handle('library-delete', (_event: unknown, id: string) => {
    const index = loadLibraryIndex();
    const item = index.find((i: { id: string }) => i.id === id);
    if (item) {
      const filePath = path.join(LIBRARY_DIR, item.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      const newIndex = index.filter((i: { id: string }) => i.id !== id);
      fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(newIndex, null, 2), 'utf-8');
    }
    return true;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

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
