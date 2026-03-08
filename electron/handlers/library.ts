/// <reference types="electron" />
const { ipcMain } = require('electron');

import _ from 'lodash';
import { IpcChannel } from '../../src/enums/ipc';
import { registerHotkeys } from '../hotkeys';
import { broadcastToWindows } from '../broadcast';
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

function notifyLibraryChanged(sender: Electron.WebContents) {
  for (const win of require('electron').BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.webContents !== sender) {
      win.webContents.send(IpcChannel.LIBRARY_CHANGED);
    }
  }
}

export function registerLibraryHandlers() {
  ipcMain.handle(IpcChannel.LIBRARY_SAVE, async (event: Electron.IpcMainInvokeEvent, { name, url, slug }: { name: string; url: string; slug?: string }) => {
    const result = await saveSound({ name, url, slug });
    notifyLibraryChanged(event.sender);
    return result;
  });

  ipcMain.handle(IpcChannel.LIBRARY_RESET, async (event: Electron.IpcMainInvokeEvent, id: string) => {
    const result = await resetSound(id);
    if (result) notifyLibraryChanged(event.sender);
    return result;
  });

  ipcMain.handle(IpcChannel.LIBRARY_UPLOAD, async (event: Electron.IpcMainInvokeEvent) => {
    const result = await uploadSounds();
    if (!_.isEmpty(result.items)) notifyLibraryChanged(event.sender);
    return result;
  });

  ipcMain.handle(IpcChannel.LIBRARY_LIST, () => listSounds());

  ipcMain.handle(IpcChannel.LIBRARY_UPDATE, (event: Electron.IpcMainInvokeEvent, { id, data }: { id: string; data: Record<string, unknown> }) => {
    const result = updateSound(id, data);
    if (result?.hotkeyChanged) registerHotkeys();
    notifyLibraryChanged(event.sender);
    return result?.item ?? null;
  });

  ipcMain.handle(IpcChannel.LIBRARY_GET_PATH, (_event: unknown, filename: string) => {
    return getSoundPath(filename);
  });

  ipcMain.handle(IpcChannel.LIBRARY_DELETE, (event: Electron.IpcMainInvokeEvent, id: string) => {
    const { hadHotkey } = deleteSound(id);
    if (hadHotkey) registerHotkeys();
    notifyLibraryChanged(event.sender);
    return true;
  });

  ipcMain.handle(IpcChannel.LIBRARY_REORDER, (event: Electron.IpcMainInvokeEvent, orderedIds: string[]) => {
    const result = reorderSounds(orderedIds);
    notifyLibraryChanged(event.sender);
    return result;
  });

  ipcMain.handle(IpcChannel.LIBRARY_SET_IMAGE, async (event: Electron.IpcMainInvokeEvent, id: string) => {
    const result = await setImage(id);
    if (result) notifyLibraryChanged(event.sender);
    return result;
  });

  ipcMain.handle(IpcChannel.LIBRARY_REMOVE_IMAGE, (event: Electron.IpcMainInvokeEvent, id: string) => {
    const result = removeImage(id);
    notifyLibraryChanged(event.sender);
    return result;
  });

  ipcMain.handle(IpcChannel.LIBRARY_TRIM, async (event: Electron.IpcMainInvokeEvent, { id, startTime, endTime }: { id: string; startTime: number; endTime: number }) => {
    const result = await trimSound(id, startTime, endTime);
    if (result.success) notifyLibraryChanged(event.sender);
    return result;
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

  ipcMain.handle(IpcChannel.LIBRARY_IMPORT, async (event: Electron.IpcMainInvokeEvent) => {
    const result = await importLibrary();
    if (result.success && (result.added ?? 0) > 0) {
      registerHotkeys();
      notifyLibraryChanged(event.sender);
    }
    return result;
  });

  ipcMain.handle(IpcChannel.GROUP_CREATE, (event: Electron.IpcMainInvokeEvent, name: string) => {
    const result = createGroup(name);
    notifyLibraryChanged(event.sender);
    return result;
  });

  ipcMain.handle(IpcChannel.GROUP_UPDATE, (event: Electron.IpcMainInvokeEvent, { id, data }: { id: string; data: Record<string, unknown> }) => {
    const result = updateGroup(id, data);
    notifyLibraryChanged(event.sender);
    return result;
  });

  ipcMain.handle(IpcChannel.GROUP_DELETE, (event: Electron.IpcMainInvokeEvent, id: string) => {
    const result = deleteGroup(id);
    notifyLibraryChanged(event.sender);
    return result;
  });

  ipcMain.handle(IpcChannel.GROUP_REORDER, (event: Electron.IpcMainInvokeEvent, orderedIds: string[]) => {
    const result = reorderGroups(orderedIds);
    notifyLibraryChanged(event.sender);
    return result;
  });

  ipcMain.handle(IpcChannel.IMPORT_INSPECT, async () => {
    return importInspect();
  });

  ipcMain.handle(IpcChannel.IMPORT_EXECUTE, async (event: Electron.IpcMainInvokeEvent, filePath: string) => {
    const result = await importExecute(filePath);
    if (result.type === 'library' && result.success) {
      registerHotkeys();
      notifyLibraryChanged(event.sender);
    }
    return result;
  });
}
