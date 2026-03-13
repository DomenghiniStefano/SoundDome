/// <reference types="electron" />

import { IpcChannel } from '../../src/enums/ipc';
import { loadConfig, saveConfig, exportConfig, importConfig } from '../config';
import { exportTheme, exportAllThemes, importThemes } from '../theme';
import { registerHotkeys, setSuspended } from '../hotkeys';
import { broadcastExcludingSender } from '../broadcast';
import { safeHandle } from '../logger';

export function registerConfigHandlers() {
  safeHandle(IpcChannel.LOAD_CONFIG, () => loadConfig());

  safeHandle(IpcChannel.SAVE_CONFIG, (event: Electron.IpcMainInvokeEvent, data: Record<string, unknown>) => {
    const result = saveConfig(data);
    registerHotkeys();
    broadcastExcludingSender(IpcChannel.CONFIG_CHANGED, event.sender);
    // TODO: refreshInfoDisplay() disabled until LCD strip protocol is figured out
    return result;
  });

  safeHandle(IpcChannel.CONFIG_EXPORT, async () => {
    return exportConfig();
  });

  safeHandle(IpcChannel.CONFIG_IMPORT, async () => {
    return importConfig();
  });

  safeHandle(IpcChannel.THEME_EXPORT, async (_event: unknown, data: { theme?: Record<string, unknown>; themes?: Record<string, unknown>[] }) => {
    if (data.themes) return exportAllThemes(data.themes);
    if (data.theme) return exportTheme(data.theme);
    return { success: false, error: 'No theme data provided' };
  });

  safeHandle(IpcChannel.THEME_IMPORT, async () => {
    return importThemes();
  });

  safeHandle(IpcChannel.HOTKEY_SUSPEND, (_event: unknown, value: boolean) => {
    setSuspended(value);
  });
}
