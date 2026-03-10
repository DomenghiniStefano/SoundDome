/// <reference types="electron" />
const { app, ipcMain } = require('electron');

import { autoUpdater } from 'electron-updater';
import { IpcChannel } from '../src/enums/ipc';
import { getMainWindow } from './windows';

function sendToRenderer(channel: string, data?: unknown) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

export function initUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info: { version: string }) => {
    sendToRenderer(IpcChannel.UPDATE_AVAILABLE, { version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    sendToRenderer(IpcChannel.UPDATE_NOT_AVAILABLE);
  });

  autoUpdater.on('download-progress', (progress: { percent: number }) => {
    sendToRenderer(IpcChannel.UPDATE_PROGRESS, { percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info: { version: string }) => {
    sendToRenderer(IpcChannel.UPDATE_DOWNLOADED, { version: info.version });
  });

  autoUpdater.on('error', (err: Error) => {
    sendToRenderer(IpcChannel.UPDATE_ERROR, { message: err.message });
  });

  ipcMain.handle(IpcChannel.UPDATE_CHECK, () => {
    if (!app.isPackaged) {
      return { devSkip: true };
    }
    return autoUpdater.checkForUpdates().catch(() => null);
  });

  ipcMain.handle(IpcChannel.UPDATE_INSTALL, () => {
    autoUpdater.quitAndInstall(true, true);
  });
}

