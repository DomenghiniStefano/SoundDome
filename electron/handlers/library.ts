/// <reference types="electron" />

import _ from 'lodash';
import { IpcChannel } from '../../src/enums/ipc';
import { ImportType } from '../../src/enums/constants';
import { registerHotkeys } from '../hotkeys';
import { broadcastExcludingSender } from '../broadcast';
import { silentRefreshKeys, prebuildImageCache } from '../streamdeck/display';
import { onMappingsChanged } from '../streamdeck/manager';
import { safeHandle, log } from '../logger';
import { safeHandleWithSync } from './sync';
import {
  saveSound,
  resetSound,
  uploadSounds,
  listSounds,
  updateSound,
  getSoundPath,
  deleteSound,
  reorderSounds,
  setImage,
  removeImage,
  trimSound,
  hasLibraryBackups,
  listBackups,
  restoreBackup,
  deleteBackup,
  deleteAllBackups,
  exportLibrary,
  importLibrary,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  importInspect,
  importExecute,
} from '../library';

export function registerLibraryHandlers() {
  safeHandleWithSync(IpcChannel.LIBRARY_SAVE, async (_event, { name, url, slug }: { name: string; url: string; slug?: string }) => {
    return saveSound({ name, url, slug });
  }, { broadcast: true, refreshKeys: true });

  safeHandleWithSync(IpcChannel.LIBRARY_RESET, async (_event, id: string) => {
    return resetSound(id);
  }, { broadcastWhen: (result) => Boolean(result) });

  safeHandleWithSync(IpcChannel.LIBRARY_UPLOAD, async () => {
    return uploadSounds();
  }, { broadcastWhen: (result) => !_.isEmpty((result as { items: unknown[] }).items) });

  safeHandle(IpcChannel.LIBRARY_LIST, () => listSounds());

  safeHandle(IpcChannel.LIBRARY_UPDATE, (event: Electron.IpcMainInvokeEvent, { id, data }: { id: string; data: Record<string, unknown> }) => {
    const result = updateSound(id, data);
    if (result?.hotkeyChanged) registerHotkeys();
    broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
    silentRefreshKeys();
    return result?.item ?? null;
  });

  safeHandle(IpcChannel.LIBRARY_GET_PATH, (_event: unknown, filename: string) => {
    return getSoundPath(filename);
  });

  safeHandle(IpcChannel.LIBRARY_DELETE, (event: Electron.IpcMainInvokeEvent, id: string) => {
    const { hadHotkey } = deleteSound(id);
    if (hadHotkey) registerHotkeys();
    broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
    silentRefreshKeys();
    return true;
  });

  safeHandleWithSync(IpcChannel.LIBRARY_REORDER, (_event, orderedIds: string[]) => {
    return reorderSounds(orderedIds);
  }, { broadcast: true, refreshKeys: true });

  safeHandleWithSync(IpcChannel.LIBRARY_SET_IMAGE, async (_event, id: string) => {
    return setImage(id);
  }, { broadcastWhen: (result) => Boolean(result), refreshKeys: true });

  safeHandleWithSync(IpcChannel.LIBRARY_REMOVE_IMAGE, (_event, id: string) => {
    return removeImage(id);
  }, { broadcast: true, refreshKeys: true });

  safeHandleWithSync(IpcChannel.LIBRARY_TRIM, async (_event, { id, startTime, endTime }: { id: string; startTime: number; endTime: number }) => {
    return trimSound(id, startTime, endTime);
  }, { broadcastWhen: (result) => (result as { success: boolean }).success });

  safeHandle(IpcChannel.LIBRARY_HAS_BACKUPS, () => hasLibraryBackups());

  safeHandle(IpcChannel.LIBRARY_LIST_BACKUPS, (_event: unknown, id: string) => {
    return listBackups(id);
  });

  safeHandle(IpcChannel.LIBRARY_RESTORE_BACKUP, (_event: unknown, { id, timestamp }: { id: string; timestamp: number }) => {
    return restoreBackup(id, timestamp);
  });

  safeHandle(IpcChannel.LIBRARY_DELETE_BACKUP, (_event: unknown, { id, timestamp }: { id: string; timestamp: number }) => {
    return deleteBackup(id, timestamp);
  });

  safeHandle(IpcChannel.LIBRARY_DELETE_ALL_BACKUPS, (_event: unknown, id?: string) => {
    return deleteAllBackups(id);
  });

  safeHandle(IpcChannel.LIBRARY_EXPORT, async (_event: unknown, { includeBackups }: { includeBackups?: boolean } = {}) => {
    return exportLibrary({ includeBackups });
  });

  safeHandleWithSync(IpcChannel.LIBRARY_IMPORT, async () => {
    return importLibrary();
  }, {
    broadcastWhen: (result) => {
      const r = result as { success: boolean; added?: number };
      return r.success && (r.added ?? 0) > 0;
    },
    refreshKeys: true,
    refreshHotkeys: true,
  });

  safeHandleWithSync(IpcChannel.GROUP_CREATE, (_event, name: string) => {
    return createGroup(name);
  }, { broadcast: true });

  safeHandleWithSync(IpcChannel.GROUP_UPDATE, (_event, { id, data }: { id: string; data: Record<string, unknown> }) => {
    return updateGroup(id, data);
  }, { broadcast: true });

  safeHandleWithSync(IpcChannel.GROUP_DELETE, (_event, id: string) => {
    return deleteGroup(id);
  }, { broadcast: true });

  safeHandleWithSync(IpcChannel.GROUP_REORDER, (_event, orderedIds: string[]) => {
    return reorderGroups(orderedIds);
  }, { broadcast: true });

  safeHandle(IpcChannel.IMPORT_INSPECT, async () => {
    return importInspect();
  });

  safeHandle(IpcChannel.IMPORT_EXECUTE, async (event: Electron.IpcMainInvokeEvent, filePath: string) => {
    const result = await importExecute(filePath);
    if (result.success) {
      if (result.type === ImportType.LIBRARY) {
        registerHotkeys();
        broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
        silentRefreshKeys();
      } else if (result.type === ImportType.SETTINGS || result.type === ImportType.THEME) {
        broadcastExcludingSender(IpcChannel.CONFIG_CHANGED, event.sender);
      } else if (result.type === ImportType.STREAMDECK) {
        onMappingsChanged();
        prebuildImageCache()
          .catch(err => log.error('Failed to rebuild cache after import:', err));
      }
    }
    return result;
  });
}
