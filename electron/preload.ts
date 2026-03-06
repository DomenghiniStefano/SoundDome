/// <reference types="electron" />
const { contextBridge, ipcRenderer } = require('electron');
import { IpcChannel } from '../src/enums/ipc';

contextBridge.exposeInMainWorld('api', {
  loadConfig: () => ipcRenderer.invoke(IpcChannel.LOAD_CONFIG),
  saveConfig: (data: Record<string, unknown>) => ipcRenderer.invoke(IpcChannel.SAVE_CONFIG, data),
  getSoundPath: () => ipcRenderer.invoke(IpcChannel.GET_SOUND_PATH),
  openExternal: (url: string) => ipcRenderer.invoke(IpcChannel.OPEN_EXTERNAL, url),
  librarySave: (name: string, url: string) => ipcRenderer.invoke(IpcChannel.LIBRARY_SAVE, { name, url }),
  libraryList: () => ipcRenderer.invoke(IpcChannel.LIBRARY_LIST),
  libraryUpdate: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke(IpcChannel.LIBRARY_UPDATE, { id, data }),
  libraryGetPath: (filename: string) => ipcRenderer.invoke(IpcChannel.LIBRARY_GET_PATH, filename),
  libraryDelete: (id: string) => ipcRenderer.invoke(IpcChannel.LIBRARY_DELETE, id),
  libraryReorder: (orderedIds: string[]) => ipcRenderer.invoke(IpcChannel.LIBRARY_REORDER, orderedIds),
  librarySetImage: (id: string) => ipcRenderer.invoke(IpcChannel.LIBRARY_SET_IMAGE, id),
  libraryRemoveImage: (id: string) => ipcRenderer.invoke(IpcChannel.LIBRARY_REMOVE_IMAGE, id),
  libraryTrim: (id: string, startTime: number, endTime: number) =>
    ipcRenderer.invoke(IpcChannel.LIBRARY_TRIM, { id, startTime, endTime }),
  libraryHasBackups: () => ipcRenderer.invoke(IpcChannel.LIBRARY_HAS_BACKUPS),
  libraryListBackups: (id: string) => ipcRenderer.invoke(IpcChannel.LIBRARY_LIST_BACKUPS, id),
  libraryRestoreBackup: (id: string, timestamp: number) =>
    ipcRenderer.invoke(IpcChannel.LIBRARY_RESTORE_BACKUP, { id, timestamp }),
  libraryDeleteBackup: (id: string, timestamp: number) =>
    ipcRenderer.invoke(IpcChannel.LIBRARY_DELETE_BACKUP, { id, timestamp }),
  libraryDeleteAllBackups: (id?: string) =>
    ipcRenderer.invoke(IpcChannel.LIBRARY_DELETE_ALL_BACKUPS, id),
  libraryExport: (includeBackups?: boolean) =>
    ipcRenderer.invoke(IpcChannel.LIBRARY_EXPORT, { includeBackups }),
  libraryImport: () => ipcRenderer.invoke(IpcChannel.LIBRARY_IMPORT),
  getAutoLaunch: () => ipcRenderer.invoke(IpcChannel.GET_AUTO_LAUNCH),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke(IpcChannel.SET_AUTO_LAUNCH, enabled),
  hotkeySuspend: (value: boolean) => ipcRenderer.invoke(IpcChannel.HOTKEY_SUSPEND, value),
  onHotkeyPlay: (callback: (id: string) => void) => ipcRenderer.on(IpcChannel.HOTKEY_PLAY, (_event: Electron.IpcRendererEvent, id: string) => callback(id)),
  removeHotkeyPlayListener: () => ipcRenderer.removeAllListeners(IpcChannel.HOTKEY_PLAY),
  onHotkeyStop: (callback: () => void) => ipcRenderer.on(IpcChannel.HOTKEY_STOP, () => callback()),
  removeHotkeyStopListener: () => ipcRenderer.removeAllListeners(IpcChannel.HOTKEY_STOP),
  windowMinimize: () => ipcRenderer.invoke(IpcChannel.WINDOW_MINIMIZE),
  windowMaximize: () => ipcRenderer.invoke(IpcChannel.WINDOW_MAXIMIZE),
  windowClose: () => ipcRenderer.invoke(IpcChannel.WINDOW_CLOSE),
  windowIsMaximized: () => ipcRenderer.invoke(IpcChannel.WINDOW_IS_MAXIMIZED),
  onWindowMaximizeChange: (callback: (isMaximized: boolean) => void) =>
    ipcRenderer.on(IpcChannel.WINDOW_MAXIMIZE_CHANGE, (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized)),
  removeWindowMaximizeChangeListener: () => ipcRenderer.removeAllListeners(IpcChannel.WINDOW_MAXIMIZE_CHANGE),
  widgetToggle: () => ipcRenderer.invoke(IpcChannel.WIDGET_TOGGLE),
  widgetClose: () => ipcRenderer.invoke(IpcChannel.WIDGET_CLOSE),
  widgetIsOpen: () => ipcRenderer.invoke(IpcChannel.WIDGET_IS_OPEN),
  onWidgetStateChange: (callback: (isOpen: boolean) => void) =>
    ipcRenderer.on(IpcChannel.WIDGET_STATE_CHANGE, (_event: Electron.IpcRendererEvent, isOpen: boolean) => callback(isOpen)),
  removeWidgetStateChangeListener: () => ipcRenderer.removeAllListeners(IpcChannel.WIDGET_STATE_CHANGE)
});
