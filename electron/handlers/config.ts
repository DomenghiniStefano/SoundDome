/// <reference types="electron" />
const { ipcMain } = require('electron');

import { IpcChannel } from '../../src/enums/ipc';
import { loadConfig, saveConfig, exportConfig, importConfig } from '../config';
import { registerHotkeys, setSuspended } from '../hotkeys';

function notifyConfigChanged(sender: Electron.WebContents) {
  for (const win of require('electron').BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.webContents !== sender) {
      win.webContents.send(IpcChannel.CONFIG_CHANGED);
    }
  }
}

export function registerConfigHandlers() {
  ipcMain.handle(IpcChannel.LOAD_CONFIG, () => loadConfig());

  ipcMain.handle(IpcChannel.SAVE_CONFIG, (event: Electron.IpcMainInvokeEvent, data: Record<string, unknown>) => {
    const result = saveConfig(data);
    registerHotkeys();
    notifyConfigChanged(event.sender);
    return result;
  });

  ipcMain.handle(IpcChannel.CONFIG_EXPORT, async () => {
    return exportConfig();
  });

  ipcMain.handle(IpcChannel.CONFIG_IMPORT, async () => {
    return importConfig();
  });

  ipcMain.handle(IpcChannel.HOTKEY_SUSPEND, (_event: unknown, value: boolean) => {
    setSuspended(value);
  });
}
