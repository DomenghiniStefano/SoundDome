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

import { createTray, createWindow, setQuitting, getMainWindow } from './windows';
import { registerHotkeys, stopHotkeyHook } from './hotkeys';
import { registerConfigHandlers } from './handlers/config';
import { registerWindowHandlers } from './handlers/window';
import { registerSystemHandlers } from './handlers/system';
import { registerLibraryHandlers } from './handlers/library';
import { registerStreamDeckHandlers } from './handlers/streamdeck';
import { startStreamDeckManager, stopStreamDeckManager } from './streamdeck/manager';

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

  // Register all IPC handlers
  registerConfigHandlers();
  registerWindowHandlers();
  registerSystemHandlers();
  registerLibraryHandlers();
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
});

app.on('before-quit', () => {
  setQuitting(true);
  stopHotkeyHook();
  stopStreamDeckManager();
});

app.on('window-all-closed', () => {
  // Do nothing — app stays alive in tray
});
