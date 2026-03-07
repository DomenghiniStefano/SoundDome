/// <reference types="electron" />
const { ipcMain } = require('electron');

import { IpcChannel } from '../../src/enums/ipc';
import { registerHotkeys } from '../hotkeys';
import { refreshAllKeys } from '../streamdeck/display';
import {
  saveSound,
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
} from '../library';

export function registerLibraryHandlers() {
  ipcMain.handle(IpcChannel.LIBRARY_SAVE, async (_event: unknown, { name, url }: { name: string; url: string }) => {
    const result = await saveSound({ name, url });
    refreshAllKeys().catch(() => {});
    return result;
  });

  ipcMain.handle(IpcChannel.LIBRARY_LIST, () => listSounds());

  ipcMain.handle(IpcChannel.LIBRARY_UPDATE, (_event: unknown, { id, data }: { id: string; data: Record<string, unknown> }) => {
    const result = updateSound(id, data);
    if (result?.hotkeyChanged) registerHotkeys();
    refreshAllKeys().catch(() => {});
    return result?.item ?? null;
  });

  ipcMain.handle(IpcChannel.LIBRARY_GET_PATH, (_event: unknown, filename: string) => {
    return getSoundPath(filename);
  });

  ipcMain.handle(IpcChannel.LIBRARY_DELETE, (_event: unknown, id: string) => {
    const { hadHotkey } = deleteSound(id);
    if (hadHotkey) registerHotkeys();
    refreshAllKeys().catch(() => {});
    return true;
  });

  ipcMain.handle(IpcChannel.LIBRARY_REORDER, (_event: unknown, orderedIds: string[]) => {
    const result = reorderSounds(orderedIds);
    refreshAllKeys().catch(() => {});
    return result;
  });

  ipcMain.handle(IpcChannel.LIBRARY_SET_IMAGE, async (_event: unknown, id: string) => {
    const result = await setImage(id);
    if (result) refreshAllKeys().catch(() => {});
    return result;
  });

  ipcMain.handle(IpcChannel.LIBRARY_REMOVE_IMAGE, (_event: unknown, id: string) => {
    const result = removeImage(id);
    refreshAllKeys().catch(() => {});
    return result;
  });

  ipcMain.handle(IpcChannel.LIBRARY_TRIM, async (_event: unknown, { id, startTime, endTime }: { id: string; startTime: number; endTime: number }) => {
    return trimSound(id, startTime, endTime);
  });

  ipcMain.handle(IpcChannel.LIBRARY_HAS_BACKUPS, () => hasLibraryBackups());

  ipcMain.handle(IpcChannel.LIBRARY_LIST_BACKUPS, (_event: unknown, id: string) => {
    return listBackups(id);
  });

  ipcMain.handle(IpcChannel.LIBRARY_RESTORE_BACKUP, (_event: unknown, { id, timestamp }: { id: string; timestamp: number }) => {
    return restoreBackup(id, timestamp);
  });

  ipcMain.handle(IpcChannel.LIBRARY_DELETE_BACKUP, (_event: unknown, { id, timestamp }: { id: string; timestamp: number }) => {
    return deleteBackup(id, timestamp);
  });

  ipcMain.handle(IpcChannel.LIBRARY_DELETE_ALL_BACKUPS, (_event: unknown, id?: string) => {
    return deleteAllBackups(id);
  });

  ipcMain.handle(IpcChannel.LIBRARY_EXPORT, async (_event: unknown, { includeBackups }: { includeBackups?: boolean } = {}) => {
    return exportLibrary({ includeBackups });
  });

  ipcMain.handle(IpcChannel.LIBRARY_IMPORT, async () => {
    const result = await importLibrary();
    if (result.success && result.added > 0) {
      registerHotkeys();
      refreshAllKeys().catch(() => {});
    }
    return result;
  });
}
