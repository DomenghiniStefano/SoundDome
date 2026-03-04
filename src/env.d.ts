/// <reference types="vite/client" />

declare const APP_VERSION: string;

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface LibraryItem {
  id: string;
  name: string;
  filename: string;
}

interface ExportResult {
  success: boolean;
  canceled?: boolean;
  error?: string;
  count?: number;
}

interface ImportResult {
  success: boolean;
  canceled?: boolean;
  error?: string;
  added?: number;
  total?: number;
}

interface ConfigData {
  sendToSpeakers: boolean;
  sendToVirtualMic: boolean;
  speakerDeviceId: string;
  virtualMicDeviceId: string;
  outputVolume: number;
  monitorVolume: number;
  micDeviceId: string;
  micVolume: number;
  enableMicPassthrough: boolean;
  locale: string;
}

interface ElectronAPI {
  loadConfig: () => Promise<ConfigData>;
  saveConfig: (data: ConfigData) => Promise<boolean>;
  getSoundPath: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  librarySave: (name: string, url: string) => Promise<LibraryItem>;
  libraryList: () => Promise<LibraryItem[]>;
  libraryGetPath: (filename: string) => Promise<string>;
  libraryDelete: (id: string) => Promise<boolean>;
  libraryExport: () => Promise<ExportResult>;
  libraryImport: () => Promise<ImportResult>;
}

interface Window {
  api: ElectronAPI;
}
