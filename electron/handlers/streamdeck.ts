/// <reference types="electron" />

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
import { safeHandle, log } from '../logger';
import type { StreamDeckMappings } from '../streamdeck/mappings';

export function registerStreamDeckHandlers() {
  safeHandle(IpcChannel.STREAMDECK_STATUS, () => ({
    connected: isDeviceConnected(),
    brightness: getBrightness(),
    currentPage: getCurrentPage(),
  }));

  safeHandle(IpcChannel.STREAMDECK_LOAD_MAPPINGS, () => loadMappings());

  safeHandle(IpcChannel.STREAMDECK_SAVE_MAPPINGS, (_event: unknown, mappings: StreamDeckMappings) => {
    const result = saveMappings(mappings);
    if (result) {
      onMappingsChanged();
      prebuildImageCache()
        .catch(err => log.error('Failed to rebuild cache after save:', err));
    }
    return result;
  });

  safeHandle(IpcChannel.STREAMDECK_SET_BRIGHTNESS, (_event: unknown, brightness: number) => {
    setDeviceBrightness(brightness);
    return true;
  });

  safeHandle(IpcChannel.STREAMDECK_REFRESH_IMAGES, () => {
    prebuildImageCache()
      .catch(err => log.error('Failed to refresh keys:', err));
    return true;
  });

  safeHandle(IpcChannel.STREAMDECK_SYSTEM_STATS, () => getSystemStats());

  safeHandle(IpcChannel.STREAMDECK_EXPORT_MAPPINGS, () => exportMappings());

  safeHandle(IpcChannel.STREAMDECK_IMPORT_MAPPINGS, async () => {
    const result = await importMappings();
    if (result.success) {
      onMappingsChanged();
      prebuildImageCache()
        .catch(err => log.error('Failed to rebuild cache after import:', err));
    }
    return result;
  });

  safeHandle(IpcChannel.STREAMDECK_RESET_MAPPINGS, () => {
    const result = resetMappings();
    if (result) {
      onMappingsChanged();
      prebuildImageCache()
        .catch(err => log.error('Failed to rebuild cache after reset:', err));
    }
    return result;
  });
}
