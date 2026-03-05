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

export function libraryUpdate(id: string, data: Partial<Pick<LibraryItem, 'name' | 'volume' | 'useDefault' | 'hotkey'>>): Promise<LibraryItem | null> {
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

export function libraryExport(): Promise<ExportResult> {
  return api.libraryExport();
}

export function libraryImport(): Promise<ImportResult> {
  return api.libraryImport();
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
