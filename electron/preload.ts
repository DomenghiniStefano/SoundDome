const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (data: Record<string, unknown>) => ipcRenderer.invoke('save-config', data),
  getSoundPath: () => ipcRenderer.invoke('get-sound-path'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  librarySave: (name: string, url: string) => ipcRenderer.invoke('library-save', { name, url }),
  libraryList: () => ipcRenderer.invoke('library-list'),
  libraryGetPath: (filename: string) => ipcRenderer.invoke('library-get-path', filename),
  libraryDelete: (id: string) => ipcRenderer.invoke('library-delete', id),
  libraryExport: () => ipcRenderer.invoke('library-export'),
  libraryImport: () => ipcRenderer.invoke('library-import')
});
