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

export function pickExecutable(): Promise<string | null> {
  return api.pickExecutable();
}

export function pickButtonImage(): Promise<string | null> {
  return api.pickButtonImage();
}

export function librarySave(name: string, url: string, slug?: string): Promise<LibraryItem> {
  return api.librarySave(name, url, slug);
}

export function libraryReset(id: string): Promise<boolean> {
  return api.libraryReset(id);
}

export function libraryUpload(): Promise<{ items: LibraryItem[]; canceled?: boolean }> {
  return api.libraryUpload();
}

export function libraryList(): Promise<LibraryData> {
  return api.libraryList();
}

export function libraryUpdate(id: string, data: Partial<Pick<LibraryItem, 'name' | 'volume' | 'hotkey' | 'backupEnabled' | 'image' | 'favorite'>>): Promise<LibraryItem | null> {
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

export function configExport(): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
  return api.configExport();
}

export function configImport(): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
  return api.configImport();
}

export function libraryExport(includeBackups?: boolean): Promise<ExportResult> {
  return api.libraryExport(includeBackups);
}

export function libraryImport(): Promise<ImportResult> {
  return api.libraryImport();
}

export function onLibraryChanged(callback: () => void): void {
  api.onLibraryChanged(callback);
}

export function removeLibraryChangedListener(): void {
  api.removeLibraryChangedListener();
}

export function onConfigChanged(callback: () => void): void {
  api.onConfigChanged(callback);
}

export function removeConfigChangedListener(): void {
  api.removeConfigChangedListener();
}

export function importInspect(): Promise<ImportPreview | null> {
  return api.importInspect();
}

export function importExecute(filePath: string): Promise<ImportResult> {
  return api.importExecute(filePath);
}

export function groupCreate(name: string): Promise<Group> {
  return api.groupCreate(name);
}

export function groupUpdate(id: string, data: Partial<Pick<Group, 'name' | 'itemIds'>>): Promise<Group | null> {
  return api.groupUpdate(id, data);
}

export function groupDelete(id: string): Promise<boolean> {
  return api.groupDelete(id);
}

export function groupReorder(orderedIds: string[]): Promise<boolean> {
  return api.groupReorder(orderedIds);
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

export function notifyPlaybackStarted(cardId: string, name: string): Promise<void> {
  return api.notifyPlaybackStarted(cardId, name);
}

export function notifyPlaybackStopped(): Promise<void> {
  return api.notifyPlaybackStopped();
}

export function onPlaybackStarted(callback: (data: { cardId: string; name: string }) => void): void {
  api.onPlaybackStarted(callback);
}

export function onPlaybackStopped(callback: () => void): void {
  api.onPlaybackStopped(callback);
}

export function removePlaybackListeners(): void {
  api.removePlaybackListeners();
}

export function showEmojiPanel(): Promise<void> {
  return api.showEmojiPanel();
}

export function isHiddenStart(): Promise<boolean> {
  return api.isHiddenStart();
}

export function updateCheck(): Promise<{ devSkip?: boolean } | null> {
  return api.updateCheck();
}

export function updateInstall(): Promise<void> {
  return api.updateInstall();
}

export function onUpdateAvailable(callback: (data: { version: string }) => void): void {
  api.onUpdateAvailable(callback);
}

export function onUpdateNotAvailable(callback: () => void): void {
  api.onUpdateNotAvailable(callback);
}

export function onUpdateDownloaded(callback: (data: { version: string }) => void): void {
  api.onUpdateDownloaded(callback);
}

export function onUpdateError(callback: (data: { message: string }) => void): void {
  api.onUpdateError(callback);
}

export function onUpdateProgress(callback: (data: { percent: number }) => void): void {
  api.onUpdateProgress(callback);
}

export function removeUpdateListeners(): void {
  api.removeUpdateListeners();
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

export function streamdeckExportMappings(): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
  return api.streamdeckExportMappings();
}

export function streamdeckImportMappings(): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
  return api.streamdeckImportMappings();
}

export function streamdeckResetMappings(): Promise<boolean> {
  return api.streamdeckResetMappings();
}
