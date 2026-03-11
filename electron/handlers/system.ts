/// <reference types="electron" />
const { app, ipcMain, shell, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

import { IpcChannel } from '../../src/enums/ipc';
import { CLI_ARG_HIDDEN, NOTIFICATION_SOUND } from '../../src/enums/constants';
import { getAssetPath } from '../paths';

export function registerSystemHandlers() {
  ipcMain.handle(IpcChannel.GET_SOUND_PATH, () => {
    return getAssetPath('sounds', NOTIFICATION_SOUND);
  });

  ipcMain.handle(IpcChannel.OPEN_EXTERNAL, (_event: unknown, url: string) => {
    return shell.openExternal(url);
  });

  ipcMain.handle(IpcChannel.GET_AUTO_LAUNCH, () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle(IpcChannel.SET_AUTO_LAUNCH, (_event: unknown, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      args: enabled ? [CLI_ARG_HIDDEN] : []
    });
    return true;
  });

  ipcMain.handle(IpcChannel.IS_HIDDEN_START, () => {
    return process.argv.includes(CLI_ARG_HIDDEN);
  });

  ipcMain.handle(IpcChannel.PICK_EXECUTABLE, async () => {
    const parentWindow = BrowserWindow.getFocusedWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow, {
      title: 'Select Application',
      filters: [
        { name: 'Executables', extensions: ['exe', 'lnk', 'bat', 'cmd'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return null;
    return filePaths[0];
  });

  ipcMain.handle(IpcChannel.PICK_BUTTON_IMAGE, async () => {
    const parentWindow = BrowserWindow.getFocusedWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow, {
      title: 'Select Button Image',
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
      ],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return null;

    // Copy to streamdeck-images dir in userData
    const imagesDir = path.join(app.getPath('userData'), 'streamdeck-images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    const ext = path.extname(filePaths[0]);
    const filename = `btn_${Date.now()}${ext}`;
    const destPath = path.join(imagesDir, filename);
    fs.copyFileSync(filePaths[0], destPath);

    return destPath;
  });
}
