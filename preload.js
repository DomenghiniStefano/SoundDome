const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (data) => ipcRenderer.invoke('save-config', data),
  getSoundPath: () => ipcRenderer.invoke('get-sound-path'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  librarySave: (name, url) => ipcRenderer.invoke('library-save', { name, url }),
  libraryList: () => ipcRenderer.invoke('library-list'),
  libraryGetPath: (filename) => ipcRenderer.invoke('library-get-path', filename),
  libraryDelete: (id) => ipcRenderer.invoke('library-delete', id),
  libraryExport: () => ipcRenderer.invoke('library-export'),
  libraryImport: () => ipcRenderer.invoke('library-import')
});
