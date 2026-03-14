/// <reference types="electron" />
const { app, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Store all app data under ~/SoundDome instead of %APPDATA%/mini-soundboard
const soundDomeDir = path.join(os.homedir(), 'SoundDome');
if (!fs.existsSync(soundDomeDir)) {
  fs.mkdirSync(soundDomeDir, { recursive: true });
}
app.setPath('userData', soundDomeDir);

import { log } from './logger';
import { createTray, createWindow, setQuitting, getMainWindow } from './windows';
import { registerHotkeys, stopHotkeyHook } from './hotkeys';
import { registerConfigHandlers } from './handlers/config';
import { registerWindowHandlers } from './handlers/window';
import { registerSystemHandlers } from './handlers/system';
import { registerLibraryHandlers } from './handlers/library';
import { initUpdater } from './updater';
import { registerStreamDeckHandlers } from './handlers/streamdeck';
import { startStreamDeckManager, stopStreamDeckManager } from './streamdeck/manager';
import { loadLinuxVirtualAudio, unloadLinuxVirtualAudio } from './virtual-audio-linux';
import { configureWindowsAudio } from './virtual-audio-windows';

app.setAppUserModelId('com.sounddome.app');

// Prevent multiple instances — focus existing window if already running
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
}

log.info('SoundDome starting, version:', app.getVersion());

app.whenReady().then(() => {
  try {
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

    // Load Linux virtual audio sink before window creation (so device is available)
    loadLinuxVirtualAudio();

    // Auto-configure VB-CABLE sample rate and communications ducking on Windows
    configureWindowsAudio();

    // Register all IPC handlers
    registerConfigHandlers();
    registerWindowHandlers();
    registerSystemHandlers();
    registerLibraryHandlers();
    initUpdater();
    registerStreamDeckHandlers();

    // Create UI
    createTray();
    createWindow();
    registerHotkeys();
    startStreamDeckManager();

    app.on('activate', () => {
      const win = getMainWindow();
      if (win) {
        win.show();
        win.focus();
      } else {
        createWindow();
      }
    });

    log.info('SoundDome ready');
  } catch (err) {
    log.error('[Startup] Fatal:', err);
  }
});

app.on('before-quit', () => {
  setQuitting(true);
  stopHotkeyHook();
  stopStreamDeckManager();
  unloadLinuxVirtualAudio();
});

app.on('window-all-closed', () => {
  // Do nothing — app stays alive in tray
});
