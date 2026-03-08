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

export function showEmojiPanel(): Promise<void> {
  return api.showEmojiPanel();
}
