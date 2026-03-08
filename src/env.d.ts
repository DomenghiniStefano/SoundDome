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
  showEmojiPanel: () => Promise<void>;
}

interface Window {
  api: ElectronAPI;
}
