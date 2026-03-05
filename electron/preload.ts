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
  libraryExport: () => ipcRenderer.invoke('library-export'),
  libraryImport: () => ipcRenderer.invoke('library-import'),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),
  onHotkeyPlay: (callback: (id: string) => void) => ipcRenderer.on('hotkey-play', (_event, id: string) => callback(id)),
  removeHotkeyPlayListener: () => ipcRenderer.removeAllListeners('hotkey-play'),
  onHotkeyStop: (callback: () => void) => ipcRenderer.on('hotkey-stop', () => callback()),
  removeHotkeyStopListener: () => ipcRenderer.removeAllListeners('hotkey-stop')
});
