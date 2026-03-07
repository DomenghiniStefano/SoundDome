const api = window.api;

export function loadConfig(): Promise<ConfigData> {
  return api.loadConfig();
}

export function saveConfig(data: ConfigData): Promise<boolean> {
  return api.saveConfig(data);
}

export function getSoundPath(): Promise<string> {
  return api.getSoundPath();
}

export function openExternal(url: string): Promise<void> {
  return api.openExternal(url);
}

export function librarySave(name: string, url: string): Promise<LibraryItem> {
  return api.librarySave(name, url);
}

export function libraryList(): Promise<LibraryItem[]> {
  return api.libraryList();
}

export function libraryUpdate(id: string, data: Partial<Pick<LibraryItem, 'name' | 'volume' | 'useDefault' | 'hotkey' | 'backupEnabled' | 'image'>>): Promise<LibraryItem | null> {
  return api.libraryUpdate(id, data);
}

export function libraryGetPath(filename: string): Promise<string> {
  return api.libraryGetPath(filename);
}

export function libraryDelete(id: string): Promise<boolean> {
  return api.libraryDelete(id);
}

export function libraryReorder(orderedIds: string[]): Promise<boolean> {
  return api.libraryReorder(orderedIds);
}

export function librarySetImage(id: string): Promise<{ image: string } | null> {
  return api.librarySetImage(id);
}

export function libraryRemoveImage(id: string): Promise<boolean> {
  return api.libraryRemoveImage(id);
}

export function libraryTrim(id: string, startTime: number, endTime: number): Promise<TrimResult> {
  return api.libraryTrim(id, startTime, endTime);
}

export function libraryHasBackups(): Promise<boolean> {
  return api.libraryHasBackups();
}

export function libraryListBackups(id: string): Promise<BackupItem[]> {
  return api.libraryListBackups(id);
}

export function libraryRestoreBackup(id: string, timestamp: number): Promise<TrimResult> {
  return api.libraryRestoreBackup(id, timestamp);
}

export function libraryDeleteBackup(id: string, timestamp: number): Promise<boolean> {
  return api.libraryDeleteBackup(id, timestamp);
}

export function libraryDeleteAllBackups(id?: string): Promise<boolean> {
  return api.libraryDeleteAllBackups(id);
}

export function libraryExport(includeBackups?: boolean): Promise<ExportResult> {
  return api.libraryExport(includeBackups);
}

export function libraryImport(): Promise<ImportResult> {
  return api.libraryImport();
}

export function getAutoLaunch(): Promise<boolean> {
  return api.getAutoLaunch();
}

export function setAutoLaunch(enabled: boolean): Promise<boolean> {
  return api.setAutoLaunch(enabled);
}

export function hotkeySuspend(value: boolean): Promise<void> {
  return api.hotkeySuspend(value);
}

export function onHotkeyPlay(callback: (id: string) => void): void {
  api.onHotkeyPlay(callback);
}

export function removeHotkeyPlayListener(): void {
  api.removeHotkeyPlayListener();
}

export function onHotkeyStop(callback: () => void): void {
  api.onHotkeyStop(callback);
}

export function removeHotkeyStopListener(): void {
  api.removeHotkeyStopListener();
}

export function windowMinimize(): Promise<void> {
  return api.windowMinimize();
}

export function windowMaximize(): Promise<void> {
  return api.windowMaximize();
}

export function windowClose(): Promise<void> {
  return api.windowClose();
}

export function windowIsMaximized(): Promise<boolean> {
  return api.windowIsMaximized();
}

export function onWindowMaximizeChange(callback: (isMaximized: boolean) => void): void {
  api.onWindowMaximizeChange(callback);
}

export function removeWindowMaximizeChangeListener(): void {
  api.removeWindowMaximizeChangeListener();
}

export function widgetToggle(): Promise<boolean> {
  return api.widgetToggle();
}

export function widgetClose(): Promise<void> {
  return api.widgetClose();
}

export function widgetIsOpen(): Promise<boolean> {
  return api.widgetIsOpen();
}

export function onWidgetStateChange(callback: (isOpen: boolean) => void): void {
  api.onWidgetStateChange(callback);
}

export function removeWidgetStateChangeListener(): void {
  api.removeWidgetStateChangeListener();
}

// Stream Deck

export function streamdeckStatus(): Promise<StreamDeckStatus> {
  return api.streamdeckStatus();
}

export function streamdeckLoadMappings(): Promise<StreamDeckMappings> {
  return api.streamdeckLoadMappings();
}

export function streamdeckSaveMappings(mappings: StreamDeckMappings): Promise<boolean> {
  return api.streamdeckSaveMappings(mappings);
}

export function streamdeckSetBrightness(brightness: number): Promise<boolean> {
  return api.streamdeckSetBrightness(brightness);
}

export function streamdeckRefreshImages(): Promise<boolean> {
  return api.streamdeckRefreshImages();
}

export function onStreamdeckButtonPress(callback: (id: string) => void): void {
  api.onStreamdeckButtonPress(callback);
}

export function removeStreamdeckButtonPressListener(): void {
  api.removeStreamdeckButtonPressListener();
}

export function onStreamdeckConnect(callback: () => void): void {
  api.onStreamdeckConnect(callback);
}

export function removeStreamdeckConnectListener(): void {
  api.removeStreamdeckConnectListener();
}

export function onStreamdeckDisconnect(callback: () => void): void {
  api.onStreamdeckDisconnect(callback);
}

export function removeStreamdeckDisconnectListener(): void {
  api.removeStreamdeckDisconnectListener();
}

export function onStreamdeckPageChange(callback: (data: { page: number; folder: number | null }) => void): void {
  api.onStreamdeckPageChange(callback);
}

export function removeStreamdeckPageChangeListener(): void {
  api.removeStreamdeckPageChangeListener();
}

export function streamdeckSystemStats(): Promise<SystemStatsData> {
  return api.streamdeckSystemStats();
}
