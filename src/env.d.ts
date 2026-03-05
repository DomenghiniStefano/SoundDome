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
  volume: number;
  useDefault: boolean;
  hotkey: string | null;
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

interface TrimResult {
  success: boolean;
  error?: string;
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
  stopHotkey: string | null;
}

interface ElectronAPI {
  loadConfig: () => Promise<ConfigData>;
  saveConfig: (data: ConfigData) => Promise<boolean>;
  getSoundPath: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  librarySave: (name: string, url: string) => Promise<LibraryItem>;
  libraryList: () => Promise<LibraryItem[]>;
  libraryUpdate: (id: string, data: Partial<Pick<LibraryItem, 'name' | 'volume' | 'useDefault' | 'hotkey'>>) => Promise<LibraryItem | null>;
  libraryGetPath: (filename: string) => Promise<string>;
  libraryDelete: (id: string) => Promise<boolean>;
  libraryReorder: (orderedIds: string[]) => Promise<boolean>;
  libraryTrim: (id: string, startTime: number, endTime: number) => Promise<TrimResult>;
  libraryHasBackups: () => Promise<boolean>;
  libraryExport: (includeBackups?: boolean) => Promise<ExportResult>;
  libraryImport: () => Promise<ImportResult>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  onHotkeyPlay: (callback: (id: string) => void) => void;
  removeHotkeyPlayListener: () => void;
  onHotkeyStop: (callback: () => void) => void;
  removeHotkeyStopListener: () => void;
}

interface Window {
  api: ElectronAPI;
}
