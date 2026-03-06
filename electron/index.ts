/// <reference types="electron" />
const { app, session, globalShortcut } = require('electron');

import { createTray, createWindow, setQuitting, getMainWindow } from './windows';
import { registerHotkeys } from './hotkeys';
import { registerConfigHandlers } from './handlers/config';
import { registerWindowHandlers } from './handlers/window';
import { registerSystemHandlers } from './handlers/system';
import { registerLibraryHandlers } from './handlers/library';

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

  // Create UI
  createTray();
  createWindow();
  registerHotkeys();

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
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Do nothing — app stays alive in tray
});
