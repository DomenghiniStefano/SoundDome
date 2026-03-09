/// <reference types="electron" />
const { app, ipcMain, shell } = require('electron');

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

  ipcMain.handle(IpcChannel.SHOW_EMOJI_PANEL, () => {
    app.showEmojiPanel();
  });

  ipcMain.handle(IpcChannel.IS_HIDDEN_START, () => {
    return process.argv.includes(CLI_ARG_HIDDEN);
  });
}
