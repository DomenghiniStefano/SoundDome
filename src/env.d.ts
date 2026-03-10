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
  hotkey: string | null;
  backupEnabled: boolean;
  image: string | null;
  favorite: boolean;
  slug: string | null;
  sourceUrl: string | null;
}

interface Group {
  id: string;
  name: string;
  itemIds: string[];
}

interface LibraryData {
  items: LibraryItem[];
  groups: Group[];
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
  type?: 'library' | 'settings';
}

interface ImportPreview {
  type: 'library' | 'settings';
  filePath: string;
  library?: {
    totalSounds: number;
    newSounds: number;
    groups: number;
  };
  settings?: {
    count: number;
  };
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
  soundboardVolume: number;
  monitorVolume: number;
  micDeviceId: string;
  micVolume: number;
  enableMicPassthrough: boolean;
  enableMicMonitor: boolean;
  locale: string;
  stopHotkey: string | null;
  libraryViewMode: string;
  libraryHideNames: boolean;
  widgetViewMode: string;
  widgetHideNames: boolean;
  enableCompressor: boolean;
}

interface StreamDeckButtonMapping {
  type: string;
  itemId?: string;
  label?: string;
  shortcut?: string;
  appPath?: string;
  statType?: string;
  mediaAction?: string;
  folderIndex?: number;
  icon?: string;
  image?: string;
}

interface StreamDeckPage {
  name: string;
  buttons: Record<string, StreamDeckButtonMapping>;
}

interface StreamDeckFolder {
  name: string;
  icon?: string;
  pages: StreamDeckPage[];
  closeAfterAction?: boolean;
  closeButtonKey?: number | null;
}

interface StreamDeckMappings {
  pages: StreamDeckPage[];
  folders: StreamDeckFolder[];
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
  pickExecutable: () => Promise<string | null>;
  pickButtonImage: () => Promise<string | null>;
  librarySave: (name: string, url: string, slug?: string) => Promise<LibraryItem>;
  libraryReset: (id: string) => Promise<boolean>;
  libraryUpload: () => Promise<{ items: LibraryItem[]; canceled?: boolean }>;
  libraryList: () => Promise<LibraryData>;
  libraryUpdate: (id: string, data: Partial<Pick<LibraryItem, 'name' | 'volume' | 'hotkey' | 'backupEnabled' | 'image' | 'favorite'>>) => Promise<LibraryItem | null>;
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
  configExport: () => Promise<{ success: boolean; canceled?: boolean; error?: string }>;
  configImport: () => Promise<{ success: boolean; canceled?: boolean; error?: string }>;
  importInspect: () => Promise<ImportPreview | null>;
  importExecute: (filePath: string) => Promise<ImportResult>;
  onLibraryChanged: (callback: () => void) => void;
  removeLibraryChangedListener: () => void;
  onConfigChanged: (callback: () => void) => void;
  removeConfigChangedListener: () => void;
  groupCreate: (name: string) => Promise<Group>;
  groupUpdate: (id: string, data: Partial<Pick<Group, 'name' | 'itemIds'>>) => Promise<Group | null>;
  groupDelete: (id: string) => Promise<boolean>;
  groupReorder: (orderedIds: string[]) => Promise<boolean>;
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
  notifyPlaybackStarted: (cardId: string, name: string) => Promise<void>;
  notifyPlaybackStopped: () => Promise<void>;
  onPlaybackStarted: (callback: (data: { cardId: string; name: string }) => void) => void;
  onPlaybackStopped: (callback: () => void) => void;
  removePlaybackListeners: () => void;
  showEmojiPanel: () => Promise<void>;
  isHiddenStart: () => Promise<boolean>;
  updateCheck: () => Promise<{ devSkip?: boolean } | null>;
  updateInstall: () => Promise<void>;
  onUpdateAvailable: (callback: (data: { version: string }) => void) => void;
  onUpdateNotAvailable: (callback: () => void) => void;
  onUpdateDownloaded: (callback: (data: { version: string }) => void) => void;
  onUpdateError: (callback: (data: { message: string }) => void) => void;
  onUpdateProgress: (callback: (data: { percent: number }) => void) => void;
  removeUpdateListeners: () => void;
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
  onStreamdeckPageChange: (callback: (data: { page: number; folder: number | null }) => void) => void;
  removeStreamdeckPageChangeListener: () => void;
  streamdeckSystemStats: () => Promise<SystemStatsData>;
  streamdeckExportMappings: () => Promise<{ success: boolean; canceled?: boolean; error?: string }>;
  streamdeckImportMappings: () => Promise<{ success: boolean; canceled?: boolean; error?: string }>;
  streamdeckResetMappings: () => Promise<boolean>;
}

interface SystemStatsData {
  cpuPercent: number;
  ramPercent: number;
  ramUsedGb: number;
  ramTotalGb: number;
  gpuPercent: number;
  gpuTempC: number;
  cpuTempC: number;
  gpuVramPercent: number;
  gpuVramUsedGb: number;
  gpuVramTotalGb: number;
  diskPercent: number;
  diskUsedGb: number;
  diskTotalGb: number;
  netUpMbps: number;
  netDownMbps: number;
  uptimeHours: number;
}

interface Window {
  api: ElectronAPI;
}
