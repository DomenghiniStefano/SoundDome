/// <reference types="electron" />
const { app, BrowserWindow, ipcMain, session, shell, dialog, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const AdmZip = require('adm-zip');
const fluentFfmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

import axios from 'axios';

import _ from 'lodash';
import { IpcChannel } from '../src/enums/ipc';
import {
  VOLUME_OUTPUT_DEFAULT,
  VOLUME_MONITOR_DEFAULT,
  VOLUME_ITEM_DEFAULT,
  MAIN_WINDOW_WIDTH,
  MAIN_WINDOW_HEIGHT,
  MAIN_WINDOW_MIN_WIDTH,
  MAIN_WINDOW_MIN_HEIGHT,
  WIDGET_WINDOW_WIDTH,
  WIDGET_WINDOW_HEIGHT,
  WIDGET_WINDOW_MIN_WIDTH,
  WIDGET_WINDOW_MIN_HEIGHT,
  WIDGET_OFFSET_X,
  WIDGET_OFFSET_Y,
  BACKUP_SUFFIX,
  AUDIO_EXTENSION,
  LIBRARY_DIR_NAME,
  LIBRARY_INDEX_FILENAME,
  CONFIG_FILENAME,
  EXPORT_DEFAULT_FILENAME,
  EXPORT_FILE_EXTENSION,
  NOTIFICATION_SOUND,
  AUDIO_BITRATE,
} from '../src/enums/constants';
import { RoutePath } from '../src/enums/routes';

const CONFIG_PATH = path.join(app.getPath('userData'), CONFIG_FILENAME);
const LIBRARY_DIR = path.join(app.getPath('userData'), LIBRARY_DIR_NAME);
const LIBRARY_INDEX = path.join(LIBRARY_DIR, LIBRARY_INDEX_FILENAME);

const CLI_ARG_HIDDEN = '--hidden';

const DEFAULT_CONFIG = {
  sendToSpeakers: true,
  sendToVirtualMic: false,
  speakerDeviceId: '',
  virtualMicDeviceId: '',
  outputVolume: VOLUME_OUTPUT_DEFAULT,
  monitorVolume: VOLUME_MONITOR_DEFAULT,
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
  _.filter(index, 'hotkey').forEach(item => {
    try {
      globalShortcut.register(item.hotkey, () => {
        if (mainWindow) {
          mainWindow.webContents.send(IpcChannel.HOTKEY_PLAY, item.id);
        }
        if (widgetWindow && !widgetWindow.isDestroyed()) {
          widgetWindow.webContents.send(IpcChannel.HOTKEY_PLAY, item.id);
        }
      });
    } catch (err) {
      console.error(`Failed to register hotkey "${item.hotkey}" for "${item.name}":`, err);
    }
  });

  const config = loadConfig();
  if (config.stopHotkey) {
    try {
      globalShortcut.register(config.stopHotkey, () => {
        if (mainWindow) {
          mainWindow.webContents.send(IpcChannel.HOTKEY_STOP);
        }
        if (widgetWindow && !widgetWindow.isDestroyed()) {
          widgetWindow.webContents.send(IpcChannel.HOTKEY_STOP);
        }
      });
    } catch (err) {
      console.error(`Failed to register stop hotkey "${config.stopHotkey}":`, err);
    }
  }
}

function createWindow() {
  const startHidden = process.argv.includes(CLI_ARG_HIDDEN);
  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    minWidth: MAIN_WINDOW_MIN_WIDTH,
    minHeight: MAIN_WINDOW_MIN_HEIGHT,
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
    mainWindow?.webContents.send(IpcChannel.WINDOW_MAXIMIZE_CHANGE, true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send(IpcChannel.WINDOW_MAXIMIZE_CHANGE, false);
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
  const x = mainBounds ? mainBounds.x + mainBounds.width - WIDGET_OFFSET_X : undefined;
  const y = mainBounds ? mainBounds.y + WIDGET_OFFSET_Y : undefined;

  widgetWindow = new BrowserWindow({
    width: WIDGET_WINDOW_WIDTH,
    height: WIDGET_WINDOW_HEIGHT,
    x,
    y,
    minWidth: WIDGET_WINDOW_MIN_WIDTH,
    minHeight: WIDGET_WINDOW_MIN_HEIGHT,
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
    widgetWindow.loadURL(baseUrl + '/#' + RoutePath.WIDGET);
  } else {
    const filePath = path.join(__dirname, '../renderer/index.html');
    widgetWindow.loadURL(`file://${filePath}#${RoutePath.WIDGET}`);
  }

  widgetWindow.on('closed', () => {
    widgetWindow = null;
    widgetWasActive = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IpcChannel.WIDGET_STATE_CHANGE, false);
    }
  });

  return widgetWindow;
}

function notifyWidgetState(isOpen: boolean) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IpcChannel.WIDGET_STATE_CHANGE, isOpen);
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
  ipcMain.handle(IpcChannel.LOAD_CONFIG, () => loadConfig());
  ipcMain.handle(IpcChannel.SAVE_CONFIG, (_event: unknown, data: Record<string, unknown>) => {
    const result = saveConfig(data);
    registerHotkeys();
    return result;
  });
  ipcMain.handle(IpcChannel.GET_SOUND_PATH, () => {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'assets', 'sounds', NOTIFICATION_SOUND);
    }
    return path.join(__dirname, '../../assets/sounds', NOTIFICATION_SOUND);
  });
  ipcMain.handle(IpcChannel.OPEN_EXTERNAL, (_event: unknown, url: string) => {
    return shell.openExternal(url);
  });

  ipcMain.handle(IpcChannel.WINDOW_MINIMIZE, () => mainWindow?.minimize());
  ipcMain.handle(IpcChannel.WINDOW_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle(IpcChannel.WINDOW_CLOSE, () => {
    mainWindow?.close();
  });
  ipcMain.handle(IpcChannel.WINDOW_IS_MAXIMIZED, () => mainWindow?.isMaximized() ?? false);

  ipcMain.handle(IpcChannel.WIDGET_TOGGLE, () => {
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

  ipcMain.handle(IpcChannel.WIDGET_CLOSE, () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.close();
    }
    widgetWasActive = false;
  });

  ipcMain.handle(IpcChannel.WIDGET_IS_OPEN, () => {
    return !!(widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible());
  });

  ipcMain.handle(IpcChannel.GET_AUTO_LAUNCH, () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  ipcMain.handle(IpcChannel.SET_AUTO_LAUNCH, (_event: unknown, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      args: enabled ? [CLI_ARG_HIDDEN] : []
    });
    return true;
  });

  // Library handlers
  ipcMain.handle(IpcChannel.LIBRARY_SAVE, async (_event: unknown, { name, url }: { name: string; url: string }) => {
    if (!fs.existsSync(LIBRARY_DIR)) {
      fs.mkdirSync(LIBRARY_DIR, { recursive: true });
    }

    const index = loadLibraryIndex();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const filename = `${id}${AUDIO_EXTENSION}`;
    const filePath = path.join(LIBRARY_DIR, filename);

    await downloadFile(url, filePath);

    const item = { id, name, filename, volume: VOLUME_ITEM_DEFAULT, useDefault: true, hotkey: null, backupEnabled: true };
    index.push(item);
    fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(index, null, 2), 'utf-8');

    return item;
  });

  ipcMain.handle(IpcChannel.LIBRARY_LIST, () => {
    const index = loadLibraryIndex();
    return _.map(index, (item: Record<string, unknown>) => ({
      volume: VOLUME_ITEM_DEFAULT,
      useDefault: true,
      hotkey: null,
      backupEnabled: true,
      ...item
    }));
  });

  ipcMain.handle(IpcChannel.LIBRARY_UPDATE, (_event: unknown, { id, data }: { id: string; data: Record<string, unknown> }) => {
    const index = loadLibraryIndex();
    const item = _.find(index, { id });
    if (!item) return null;

    const patch = _.pick(data, ['name', 'volume', 'useDefault', 'hotkey', 'backupEnabled']);
    Object.assign(item, patch);

    fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(index, null, 2), 'utf-8');
    if ('hotkey' in patch) registerHotkeys();
    return item;
  });

  ipcMain.handle(IpcChannel.LIBRARY_GET_PATH, (_event: unknown, filename: string) => {
    return path.join(LIBRARY_DIR, filename);
  });

  ipcMain.handle(IpcChannel.LIBRARY_EXPORT, async (_event: unknown, { includeBackups }: { includeBackups?: boolean } = {}) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Library',
      defaultPath: EXPORT_DEFAULT_FILENAME,
      filters: [{ name: 'SoundDome Library', extensions: [EXPORT_FILE_EXTENSION] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const index = loadLibraryIndex();
    if (index.length === 0) return { success: false, error: 'Library is empty' };

    const zip = new AdmZip();
    zip.addFile(LIBRARY_INDEX_FILENAME, Buffer.from(JSON.stringify(index, null, 2), 'utf-8'));

    for (const item of index) {
      const mp3Path = path.join(LIBRARY_DIR, item.filename);
      if (fs.existsSync(mp3Path)) {
        zip.addLocalFile(mp3Path);
      }
      if (includeBackups) {
        getBackupFiles(item.filename).forEach(f => zip.addLocalFile(path.join(LIBRARY_DIR, f)));
      }
    }

    zip.writeZip(filePath);
    return { success: true, count: index.length };
  });

  ipcMain.handle(IpcChannel.LIBRARY_IMPORT, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Library',
      filters: [{ name: 'SoundDome Library', extensions: [EXPORT_FILE_EXTENSION] }],
      properties: ['openFile']
    });
    if (canceled || filePaths.length === 0) return { success: false, canceled: true };

    if (!fs.existsSync(LIBRARY_DIR)) {
      fs.mkdirSync(LIBRARY_DIR, { recursive: true });
    }

    const zip = new AdmZip(filePaths[0]);
    const indexEntry = zip.getEntry(LIBRARY_INDEX_FILENAME);
    if (!indexEntry) return { success: false, error: `Invalid .${EXPORT_FILE_EXTENSION} file (no ${LIBRARY_INDEX_FILENAME})` };

    const importedIndex = JSON.parse(indexEntry.getData().toString('utf-8'));
    const currentIndex = loadLibraryIndex();
    const existingNames = new Set(_.map(currentIndex, 'name'));

    let added = 0;
    for (const item of importedIndex) {
      if (existingNames.has(item.name)) continue;

      const entry = zip.getEntry(item.filename);
      if (!entry) continue;

      const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const newFilename = `${newId}${AUDIO_EXTENSION}`;
      fs.writeFileSync(path.join(LIBRARY_DIR, newFilename), entry.getData());

      // Restore backups if present in ZIP
      const bakPrefix = item.filename + BACKUP_SUFFIX;
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
        volume: item.volume ?? VOLUME_ITEM_DEFAULT,
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

  ipcMain.handle(IpcChannel.LIBRARY_REORDER, (_event: unknown, orderedIds: string[]) => {
    const index = loadLibraryIndex();
    const byId = _.keyBy(index, 'id');
    const reordered = _.compact(_.map(orderedIds, (id: string) => byId[id]));
    fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(reordered, null, 2), 'utf-8');
    return true;
  });

  ipcMain.handle(IpcChannel.LIBRARY_DELETE, (_event: unknown, id: string) => {
    const index = loadLibraryIndex();
    const item = _.find(index, { id });
    if (item) {
      const hadHotkey = !!item.hotkey;
      const filePath = path.join(LIBRARY_DIR, item.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      // Delete all backups for this file
      getBackupFiles(item.filename).forEach(f => fs.unlinkSync(path.join(LIBRARY_DIR, f)));
      const newIndex = _.reject(index, { id });
      fs.writeFileSync(LIBRARY_INDEX, JSON.stringify(newIndex, null, 2), 'utf-8');
      if (hadHotkey) registerHotkeys();
    }
    return true;
  });

  ipcMain.handle(IpcChannel.LIBRARY_TRIM, async (_event: unknown, { id, startTime, endTime }: { id: string; startTime: number; endTime: number }) => {
    return trimLibrarySound(id, startTime, endTime);
  });

  ipcMain.handle(IpcChannel.LIBRARY_HAS_BACKUPS, () => hasLibraryBackups());

  ipcMain.handle(IpcChannel.LIBRARY_LIST_BACKUPS, (_event: unknown, id: string) => {
    const index = loadLibraryIndex();
    const item = _.find(index, { id });
    if (!item) return [];
    const prefix = item.filename + BACKUP_SUFFIX;
    if (!fs.existsSync(LIBRARY_DIR)) return [];
    const files = fs.readdirSync(LIBRARY_DIR) as string[];
    return _(files)
      .filter((f: string) => f.startsWith(prefix))
      .map((f: string) => ({
        timestamp: parseInt(f.slice(prefix.length), 10),
        filename: f
      }))
      .orderBy('timestamp', 'desc')
      .value();
  });

  ipcMain.handle(IpcChannel.LIBRARY_RESTORE_BACKUP, (_event: unknown, { id, timestamp }: { id: string; timestamp: number }) => {
    const index = loadLibraryIndex();
    const item = _.find(index, { id });
    if (!item) return { success: false, error: 'Item not found' };
    const mp3Path = path.join(LIBRARY_DIR, item.filename);
    const backupPath = mp3Path + `${BACKUP_SUFFIX}${timestamp}`;
    if (!fs.existsSync(backupPath)) return { success: false, error: 'Backup not found' };
    try {
      fs.copyFileSync(backupPath, mp3Path);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IpcChannel.LIBRARY_DELETE_BACKUP, (_event: unknown, { id, timestamp }: { id: string; timestamp: number }) => {
    const index = loadLibraryIndex();
    const item = _.find(index, { id });
    if (!item) return false;
    const backupPath = path.join(LIBRARY_DIR, item.filename + `${BACKUP_SUFFIX}${timestamp}`);
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      return true;
    }
    return false;
  });

  ipcMain.handle(IpcChannel.LIBRARY_DELETE_ALL_BACKUPS, (_event: unknown, id?: string) => {
    if (!fs.existsSync(LIBRARY_DIR)) return false;
    const allFiles = fs.readdirSync(LIBRARY_DIR) as string[];
    if (id) {
      const index = loadLibraryIndex();
      const item = _.find(index, { id });
      if (!item) return false;
      getBackupFiles(item.filename).forEach(f => fs.unlinkSync(path.join(LIBRARY_DIR, f)));
    } else {
      _.filter(allFiles, f => _.includes(f, BACKUP_SUFFIX))
        .forEach(f => fs.unlinkSync(path.join(LIBRARY_DIR, f)));
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
  const item = _.find(index, { id });
  if (!item) return Promise.resolve({ success: false, error: 'Item not found' });

  const mp3Path = path.join(LIBRARY_DIR, item.filename);
  if (!fs.existsSync(mp3Path)) return Promise.resolve({ success: false, error: 'File not found' });

  const tempPath = path.join(LIBRARY_DIR, `${item.id}_trimmed${AUDIO_EXTENSION}`);

  if (item.backupEnabled !== false) {
    const timestamp = Date.now();
    const backupPath = mp3Path + `${BACKUP_SUFFIX}${timestamp}`;
    fs.copyFileSync(mp3Path, backupPath);
  }

  const duration = endTime - startTime;

  return new Promise((resolve) => {
    fluentFfmpeg(mp3Path)
      .setFfmpegPath(resolveFfmpegPath())
      .inputOptions([`-ss ${startTime}`])
      .outputOptions([`-t ${duration}`, `-b:a ${AUDIO_BITRATE}`])
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

function getBackupFiles(filename: string): string[] {
  if (!fs.existsSync(LIBRARY_DIR)) return [];
  const allFiles = fs.readdirSync(LIBRARY_DIR) as string[];
  return _.filter(allFiles, f => f.startsWith(filename + BACKUP_SUFFIX));
}

function hasLibraryBackups(): boolean {
  if (!fs.existsSync(LIBRARY_DIR)) return false;
  const files = fs.readdirSync(LIBRARY_DIR) as string[];
  return _.some(files, f => _.includes(f, BACKUP_SUFFIX));
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

async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  fs.writeFileSync(dest, Buffer.from(response.data));
}
