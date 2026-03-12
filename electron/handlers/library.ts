/// <reference types="electron" />

import _ from 'lodash';
import { IpcChannel } from '../../src/enums/ipc';
import { registerHotkeys } from '../hotkeys';
import { broadcastExcludingSender } from '../broadcast';
import { silentRefreshKeys } from '../streamdeck/display';
import { safeHandle } from '../logger';
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
  safeHandle(IpcChannel.LIBRARY_SAVE, async (event: Electron.IpcMainInvokeEvent, { name, url, slug }: { name: string; url: string; slug?: string }) => {
    const result = await saveSound({ name, url, slug });
    broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
    silentRefreshKeys();
    return result;
  });

  safeHandle(IpcChannel.LIBRARY_RESET, async (event: Electron.IpcMainInvokeEvent, id: string) => {
    const result = await resetSound(id);
    if (result) broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
    return result;
  });

  safeHandle(IpcChannel.LIBRARY_UPLOAD, async (event: Electron.IpcMainInvokeEvent) => {
    const result = await uploadSounds();
    if (!_.isEmpty(result.items)) broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
    return result;
  });

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

  safeHandle(IpcChannel.LIBRARY_REORDER, (event: Electron.IpcMainInvokeEvent, orderedIds: string[]) => {
    const result = reorderSounds(orderedIds);
    broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
    silentRefreshKeys();
    return result;
  });

  safeHandle(IpcChannel.LIBRARY_SET_IMAGE, async (event: Electron.IpcMainInvokeEvent, id: string) => {
    const result = await setImage(id);
    if (result) {
      broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
      silentRefreshKeys();
    }
    return result;
  });

  safeHandle(IpcChannel.LIBRARY_REMOVE_IMAGE, (event: Electron.IpcMainInvokeEvent, id: string) => {
    const result = removeImage(id);
    broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
    silentRefreshKeys();
    return result;
  });

  safeHandle(IpcChannel.LIBRARY_TRIM, async (event: Electron.IpcMainInvokeEvent, { id, startTime, endTime }: { id: string; startTime: number; endTime: number }) => {
    const result = await trimSound(id, startTime, endTime);
    if (result.success) broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
    return result;
  });

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

  safeHandle(IpcChannel.LIBRARY_IMPORT, async (event: Electron.IpcMainInvokeEvent) => {
    const result = await importLibrary();
    if (result.success && (result.added ?? 0) > 0) {
      registerHotkeys();
      broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
      silentRefreshKeys();
    }
    return result;
  });

  safeHandle(IpcChannel.GROUP_CREATE, (event: Electron.IpcMainInvokeEvent, name: string) => {
    const result = createGroup(name);
    broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
    return result;
  });

  safeHandle(IpcChannel.GROUP_UPDATE, (event: Electron.IpcMainInvokeEvent, { id, data }: { id: string; data: Record<string, unknown> }) => {
    const result = updateGroup(id, data);
    broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
    return result;
  });

  safeHandle(IpcChannel.GROUP_DELETE, (event: Electron.IpcMainInvokeEvent, id: string) => {
    const result = deleteGroup(id);
    broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
    return result;
  });

  safeHandle(IpcChannel.GROUP_REORDER, (event: Electron.IpcMainInvokeEvent, orderedIds: string[]) => {
    const result = reorderGroups(orderedIds);
    broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
    return result;
  });

  safeHandle(IpcChannel.IMPORT_INSPECT, async () => {
    return importInspect();
  });

  safeHandle(IpcChannel.IMPORT_EXECUTE, async (event: Electron.IpcMainInvokeEvent, filePath: string) => {
    const result = await importExecute(filePath);
    if (result.type === 'library' && result.success) {
      registerHotkeys();
      broadcastExcludingSender(IpcChannel.LIBRARY_CHANGED, event.sender);
      silentRefreshKeys();
    }
    return result;
  });
}
