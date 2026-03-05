import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  libraryList,
  librarySave,
  libraryDelete,
  libraryGetPath,
  libraryExport,
  libraryImport,
  libraryUpdate,
  libraryReorder,
  libraryTrim,
  libraryHasBackups
} from '../services/api';

export const useLibraryStore = defineStore('library', () => {
  const items = ref<LibraryItem[]>([]);
  const status = ref<'idle' | 'loading' | 'error'>('idle');

  async function load() {
    status.value = 'loading';
    try {
      items.value = await libraryList();
      status.value = 'idle';
    } catch {
      status.value = 'error';
    }
  }

  async function save(name: string, url: string): Promise<LibraryItem> {
    const item = await librarySave(name, url);
    items.value.push(item);
    return item;
  }

  async function remove(id: string) {
    await libraryDelete(id);
    items.value = items.value.filter(i => i.id !== id);
  }

  async function update(id: string, data: Partial<Pick<LibraryItem, 'name' | 'volume' | 'useDefault' | 'hotkey' | 'backupEnabled'>>) {
    const updated = await libraryUpdate(id, data);
    if (updated) {
      const idx = items.value.findIndex(i => i.id === id);
      if (idx !== -1) items.value[idx] = updated;
    }
    return updated;
  }

  async function getFilePath(filename: string): Promise<string> {
    return libraryGetPath(filename);
  }

  async function reorder(orderedIds: string[]) {
    const byId = new Map(items.value.map(i => [i.id, i]));
    items.value = orderedIds.map(id => byId.get(id)!).filter(Boolean);
    await libraryReorder(orderedIds);
  }

  async function clearAll() {
    const ids = items.value.map(i => i.id);
    for (const id of ids) {
      await libraryDelete(id);
    }
    items.value = [];
  }

  async function trim(id: string, startTime: number, endTime: number): Promise<TrimResult> {
    return libraryTrim(id, startTime, endTime);
  }

  async function hasBackups(): Promise<boolean> {
    return libraryHasBackups();
  }

  async function doExport(includeBackups?: boolean): Promise<ExportResult> {
    return libraryExport(includeBackups);
  }

  async function doImport(): Promise<ImportResult> {
    const result = await libraryImport();
    if (result.success) {
      await load();
    }
    return result;
  }

  return {
    items,
    status,
    load,
    save,
    update,
    remove,
    getFilePath,
    reorder,
    clearAll,
    trim,
    hasBackups,
    doExport,
    doImport
  };
});
