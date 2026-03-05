/// <reference types="electron" />
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (data: Record<string, unknown>) => ipcRenderer.invoke('save-config', data),
  getSoundPath: () => ipcRenderer.invoke('get-sound-path'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  librarySave: (name: string, url: string) => ipcRenderer.invoke('library-save', { name, url }),
  libraryList: () => ipcRenderer.invoke('library-list'),
  libraryUpdate: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('library-update', { id, data }),
  libraryGetPath: (filename: string) => ipcRenderer.invoke('library-get-path', filename),
  libraryDelete: (id: string) => ipcRenderer.invoke('library-delete', id),
  libraryReorder: (orderedIds: string[]) => ipcRenderer.invoke('library-reorder', orderedIds),
  libraryTrim: (id: string, startTime: number, endTime: number) =>
    ipcRenderer.invoke('library-trim', { id, startTime, endTime }),
  libraryHasBackups: () => ipcRenderer.invoke('library-has-backups'),
  libraryExport: (includeBackups?: boolean) =>
    ipcRenderer.invoke('library-export', { includeBackups }),
  libraryImport: () => ipcRenderer.invoke('library-import'),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),
  onHotkeyPlay: (callback: (id: string) => void) => ipcRenderer.on('hotkey-play', (_event: Electron.IpcRendererEvent, id: string) => callback(id)),
  removeHotkeyPlayListener: () => ipcRenderer.removeAllListeners('hotkey-play'),
  onHotkeyStop: (callback: () => void) => ipcRenderer.on('hotkey-stop', () => callback()),
  removeHotkeyStopListener: () => ipcRenderer.removeAllListeners('hotkey-stop'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowMaximizeChange: (callback: (isMaximized: boolean) => void) =>
    ipcRenderer.on('window-maximize-change', (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized)),
  removeWindowMaximizeChangeListener: () => ipcRenderer.removeAllListeners('window-maximize-change'),
  widgetToggle: () => ipcRenderer.invoke('widget-toggle'),
  widgetClose: () => ipcRenderer.invoke('widget-close'),
  widgetIsOpen: () => ipcRenderer.invoke('widget-is-open'),
  onWidgetStateChange: (callback: (isOpen: boolean) => void) =>
    ipcRenderer.on('widget-state-change', (_event: Electron.IpcRendererEvent, isOpen: boolean) => callback(isOpen)),
  removeWidgetStateChangeListener: () => ipcRenderer.removeAllListeners('widget-state-change')
});
