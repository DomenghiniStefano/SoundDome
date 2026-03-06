/// <reference types="electron" />
const { ipcMain } = require('electron');

import { IpcChannel } from '../../src/enums/ipc';
import { loadConfig, saveConfig } from '../config';
import { registerHotkeys, setSuspended } from '../hotkeys';

export function registerConfigHandlers() {
  ipcMain.handle(IpcChannel.LOAD_CONFIG, () => loadConfig());

  ipcMain.handle(IpcChannel.SAVE_CONFIG, (_event: unknown, data: Record<string, unknown>) => {
    const result = saveConfig(data);
    registerHotkeys();
    return result;
  });

  ipcMain.handle(IpcChannel.HOTKEY_SUSPEND, (_event: unknown, value: boolean) => {
    setSuspended(value);
  });
}
