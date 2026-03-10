/// <reference types="electron" />
const { ipcMain } = require('electron');

import { IpcChannel } from '../../src/enums/ipc';
import {
  isDeviceConnected,
  getBrightness,
  setDeviceBrightness,
  getCurrentPage,
  setCurrentPage,
  onMappingsChanged,
} from '../streamdeck/manager';
import { loadMappings, saveMappings, exportMappings, importMappings, resetMappings } from '../streamdeck/mappings';
import { refreshAllKeys, prebuildImageCache } from '../streamdeck/display';
import { getSystemStats } from '../streamdeck/system-info';
import type { StreamDeckMappings } from '../streamdeck/mappings';

export function registerStreamDeckHandlers() {
  ipcMain.handle(IpcChannel.STREAMDECK_STATUS, () => ({
    connected: isDeviceConnected(),
    brightness: getBrightness(),
    currentPage: getCurrentPage(),
  }));

  ipcMain.handle(IpcChannel.STREAMDECK_LOAD_MAPPINGS, () => loadMappings());

  ipcMain.handle(IpcChannel.STREAMDECK_SAVE_MAPPINGS, (_event: unknown, mappings: StreamDeckMappings) => {
    const result = saveMappings(mappings);
    if (result) {
      onMappingsChanged();
      prebuildImageCache()
        .catch(err => console.error('Failed to rebuild cache after save:', err));
    }
    return result;
  });

  ipcMain.handle(IpcChannel.STREAMDECK_SET_BRIGHTNESS, (_event: unknown, brightness: number) => {
    setDeviceBrightness(brightness);
    return true;
  });

  ipcMain.handle(IpcChannel.STREAMDECK_REFRESH_IMAGES, () => {
    prebuildImageCache()
      .catch(err => console.error('Failed to refresh keys:', err));
    return true;
  });

  ipcMain.handle(IpcChannel.STREAMDECK_SYSTEM_STATS, () => getSystemStats());

  ipcMain.handle(IpcChannel.STREAMDECK_EXPORT_MAPPINGS, () => exportMappings());

  ipcMain.handle(IpcChannel.STREAMDECK_IMPORT_MAPPINGS, async () => {
    const result = await importMappings();
    if (result.success) {
      onMappingsChanged();
      prebuildImageCache()
        .catch(err => console.error('Failed to rebuild cache after import:', err));
    }
    return result;
  });

  ipcMain.handle(IpcChannel.STREAMDECK_RESET_MAPPINGS, () => {
    const result = resetMappings();
    if (result) {
      onMappingsChanged();
      prebuildImageCache()
        .catch(err => console.error('Failed to rebuild cache after reset:', err));
    }
    return result;
  });
}
