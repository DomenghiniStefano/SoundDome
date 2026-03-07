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
  backupEnabled: boolean;
  image: string | null;
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

interface BackupItem {
  timestamp: number;
  filename: string;
}

interface TrimResult {
  success: boolean;
  error?: string;
}

interface BrowseResult {
  name: string;
  sound: string;
  slug: string;
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

interface StreamDeckButtonMapping {
  type: string;
  itemId?: string;
  label?: string;
  shortcut?: string;
  statType?: string;
  mediaAction?: string;
  pageIndex?: number;
}

interface StreamDeckPage {
  name: string;
  buttons: Record<string, StreamDeckButtonMapping>;
}

interface StreamDeckMappings {
  pages: StreamDeckPage[];
  brightness: number;
}

interface StreamDeckStatus {
  connected: boolean;
  brightness: number;
  currentPage: number;
}

interface ElectronAPI {
  loadConfig: () => Promise<ConfigData>;
  saveConfig: (data: ConfigData) => Promise<boolean>;
  getSoundPath: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  librarySave: (name: string, url: string) => Promise<LibraryItem>;
  libraryList: () => Promise<LibraryItem[]>;
  libraryUpdate: (id: string, data: Partial<Pick<LibraryItem, 'name' | 'volume' | 'useDefault' | 'hotkey' | 'backupEnabled' | 'image'>>) => Promise<LibraryItem | null>;
  librarySetImage: (id: string) => Promise<{ image: string } | null>;
  libraryRemoveImage: (id: string) => Promise<boolean>;
  libraryGetPath: (filename: string) => Promise<string>;
  libraryDelete: (id: string) => Promise<boolean>;
  libraryReorder: (orderedIds: string[]) => Promise<boolean>;
  libraryTrim: (id: string, startTime: number, endTime: number) => Promise<TrimResult>;
  libraryHasBackups: () => Promise<boolean>;
  libraryListBackups: (id: string) => Promise<BackupItem[]>;
  libraryRestoreBackup: (id: string, timestamp: number) => Promise<TrimResult>;
  libraryDeleteBackup: (id: string, timestamp: number) => Promise<boolean>;
  libraryDeleteAllBackups: (id?: string) => Promise<boolean>;
  libraryExport: (includeBackups?: boolean) => Promise<ExportResult>;
  libraryImport: () => Promise<ImportResult>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  hotkeySuspend: (value: boolean) => Promise<void>;
  onHotkeyPlay: (callback: (id: string) => void) => void;
  removeHotkeyPlayListener: () => void;
  onHotkeyStop: (callback: () => void) => void;
  removeHotkeyStopListener: () => void;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  onWindowMaximizeChange: (callback: (isMaximized: boolean) => void) => void;
  removeWindowMaximizeChangeListener: () => void;
  widgetToggle: () => Promise<boolean>;
  widgetClose: () => Promise<void>;
  widgetIsOpen: () => Promise<boolean>;
  onWidgetStateChange: (callback: (isOpen: boolean) => void) => void;
  removeWidgetStateChangeListener: () => void;
  streamdeckStatus: () => Promise<StreamDeckStatus>;
  streamdeckLoadMappings: () => Promise<StreamDeckMappings>;
  streamdeckSaveMappings: (mappings: StreamDeckMappings) => Promise<boolean>;
  streamdeckSetBrightness: (brightness: number) => Promise<boolean>;
  streamdeckRefreshImages: () => Promise<boolean>;
  onStreamdeckButtonPress: (callback: (id: string) => void) => void;
  removeStreamdeckButtonPressListener: () => void;
  onStreamdeckConnect: (callback: () => void) => void;
  removeStreamdeckConnectListener: () => void;
  onStreamdeckDisconnect: (callback: () => void) => void;
  removeStreamdeckDisconnectListener: () => void;
  onStreamdeckPageChange: (callback: (page: number) => void) => void;
  removeStreamdeckPageChangeListener: () => void;
  streamdeckSystemStats: () => Promise<SystemStatsData>;
}

interface SystemStatsData {
  cpuPercent: number;
  ramPercent: number;
  ramUsedGb: number;
  ramTotalGb: number;
  gpuPercent: number;
  gpuTempC: number;
  cpuTempC: number;
}

interface Window {
  api: ElectronAPI;
}
