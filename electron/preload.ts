/// <reference types="electron" />
const { contextBridge, ipcRenderer } = require('electron');
import { IpcChannel } from '../src/enums/ipc';

contextBridge.exposeInMainWorld('api', {
  loadConfig: () => ipcRenderer.invoke(IpcChannel.LOAD_CONFIG),
  saveConfig: (data: Record<string, unknown>) => ipcRenderer.invoke(IpcChannel.SAVE_CONFIG, data),
  getSoundPath: () => ipcRenderer.invoke(IpcChannel.GET_SOUND_PATH),
  openExternal: (url: string) => ipcRenderer.invoke(IpcChannel.OPEN_EXTERNAL, url),
  librarySave: (name: string, url: string, slug?: string) => ipcRenderer.invoke(IpcChannel.LIBRARY_SAVE, { name, url, slug }),
  libraryReset: (id: string) => ipcRenderer.invoke(IpcChannel.LIBRARY_RESET, id),
  libraryUpload: () => ipcRenderer.invoke(IpcChannel.LIBRARY_UPLOAD),
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
  onLibraryChanged: (callback: () => void) => ipcRenderer.on(IpcChannel.LIBRARY_CHANGED, () => callback()),
  removeLibraryChangedListener: () => ipcRenderer.removeAllListeners(IpcChannel.LIBRARY_CHANGED),
  onConfigChanged: (callback: () => void) => ipcRenderer.on(IpcChannel.CONFIG_CHANGED, () => callback()),
  removeConfigChangedListener: () => ipcRenderer.removeAllListeners(IpcChannel.CONFIG_CHANGED),
  importInspect: () => ipcRenderer.invoke(IpcChannel.IMPORT_INSPECT),
  importExecute: (filePath: string) => ipcRenderer.invoke(IpcChannel.IMPORT_EXECUTE, filePath),
  groupCreate: (name: string) => ipcRenderer.invoke(IpcChannel.GROUP_CREATE, name),
  groupUpdate: (id: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke(IpcChannel.GROUP_UPDATE, { id, data }),
  groupDelete: (id: string) => ipcRenderer.invoke(IpcChannel.GROUP_DELETE, id),
  groupReorder: (orderedIds: string[]) => ipcRenderer.invoke(IpcChannel.GROUP_REORDER, orderedIds),
  configExport: () => ipcRenderer.invoke(IpcChannel.CONFIG_EXPORT),
  configImport: () => ipcRenderer.invoke(IpcChannel.CONFIG_IMPORT),
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
  removeWidgetStateChangeListener: () => ipcRenderer.removeAllListeners(IpcChannel.WIDGET_STATE_CHANGE),
  notifyPlaybackStarted: (cardId: string, name: string) => ipcRenderer.invoke(IpcChannel.PLAYBACK_STARTED, { cardId, name }),
  notifyPlaybackStopped: () => ipcRenderer.invoke(IpcChannel.PLAYBACK_STOPPED),
  onPlaybackStarted: (callback: (data: { cardId: string; name: string }) => void) =>
    ipcRenderer.on(IpcChannel.PLAYBACK_STARTED, (_event: Electron.IpcRendererEvent, data: { cardId: string; name: string }) => callback(data)),
  onPlaybackStopped: (callback: () => void) =>
    ipcRenderer.on(IpcChannel.PLAYBACK_STOPPED, () => callback()),
  removePlaybackListeners: () => {
    ipcRenderer.removeAllListeners(IpcChannel.PLAYBACK_STARTED);
    ipcRenderer.removeAllListeners(IpcChannel.PLAYBACK_STOPPED);
  },
  showEmojiPanel: () => ipcRenderer.invoke(IpcChannel.SHOW_EMOJI_PANEL),
  isHiddenStart: () => ipcRenderer.invoke(IpcChannel.IS_HIDDEN_START),
  updateCheck: () => ipcRenderer.invoke(IpcChannel.UPDATE_CHECK),
  updateInstall: () => ipcRenderer.invoke(IpcChannel.UPDATE_INSTALL),
  onUpdateAvailable: (callback: (data: { version: string }) => void) =>
    ipcRenderer.on(IpcChannel.UPDATE_AVAILABLE, (_event: Electron.IpcRendererEvent, data: { version: string }) => callback(data)),
  onUpdateNotAvailable: (callback: () => void) =>
    ipcRenderer.on(IpcChannel.UPDATE_NOT_AVAILABLE, () => callback()),
  onUpdateDownloaded: (callback: (data: { version: string }) => void) =>
    ipcRenderer.on(IpcChannel.UPDATE_DOWNLOADED, (_event: Electron.IpcRendererEvent, data: { version: string }) => callback(data)),
  onUpdateError: (callback: (data: { message: string }) => void) =>
    ipcRenderer.on(IpcChannel.UPDATE_ERROR, (_event: Electron.IpcRendererEvent, data: { message: string }) => callback(data)),
  onUpdateProgress: (callback: (data: { percent: number }) => void) =>
    ipcRenderer.on(IpcChannel.UPDATE_PROGRESS, (_event: Electron.IpcRendererEvent, data: { percent: number }) => callback(data)),
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners(IpcChannel.UPDATE_AVAILABLE);
    ipcRenderer.removeAllListeners(IpcChannel.UPDATE_NOT_AVAILABLE);
    ipcRenderer.removeAllListeners(IpcChannel.UPDATE_DOWNLOADED);
    ipcRenderer.removeAllListeners(IpcChannel.UPDATE_ERROR);
    ipcRenderer.removeAllListeners(IpcChannel.UPDATE_PROGRESS);
  }
});
