import { defineStore } from 'pinia';
import { ref } from 'vue';
import _ from 'lodash';
import { LibraryStatus } from '../enums/library';
import { StoreName } from '../enums/stores';
import type { LibraryStatusValue } from '../enums/library';
import {
  libraryList,
  librarySave,
  libraryDelete,
  libraryGetPath,
  libraryExport,
  libraryImport,
  libraryUpdate,
  libraryReorder,
  librarySetImage,
  libraryRemoveImage,
  libraryTrim,
  libraryHasBackups,
  libraryListBackups,
  libraryRestoreBackup,
  libraryDeleteBackup,
  libraryDeleteAllBackups
} from '../services/api';

export const useLibraryStore = defineStore(StoreName.LIBRARY, () => {
  const items = ref<LibraryItem[]>([]);
  const status = ref<LibraryStatusValue>(LibraryStatus.IDLE);

  async function load() {
    status.value = LibraryStatus.LOADING;
    try {
      items.value = await libraryList();
      status.value = LibraryStatus.IDLE;
    } catch {
      status.value = LibraryStatus.ERROR;
    }
  }

  async function save(name: string, url: string): Promise<LibraryItem> {
    const item = await librarySave(name, url);
    items.value.push(item);
    return item;
  }

  async function remove(id: string) {
    await libraryDelete(id);
    items.value = _.reject(items.value, { id });
  }

  async function update(id: string, data: Partial<Pick<LibraryItem, 'name' | 'volume' | 'useDefault' | 'hotkey' | 'backupEnabled' | 'image'>>) {
    const updated = await libraryUpdate(id, data);
    if (updated) {
      const item = _.find(items.value, { id });
      if (item) Object.assign(item, updated);
    }
    return updated;
  }

  async function getFilePath(filename: string): Promise<string> {
    return libraryGetPath(filename);
  }

  async function setImage(id: string) {
    return librarySetImage(id);
  }

  async function removeImage(id: string) {
    return libraryRemoveImage(id);
  }

  async function reorder(orderedIds: string[]) {
    const byId = _.keyBy(items.value, 'id');
    items.value = _.compact(orderedIds.map(id => byId[id]));
    await libraryReorder(orderedIds);
  }

  async function clearAll() {
    const ids = _.map(items.value, 'id');
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

  async function listBackups(id: string): Promise<BackupItem[]> {
    return libraryListBackups(id);
  }

  async function restoreBackup(id: string, timestamp: number): Promise<TrimResult> {
    return libraryRestoreBackup(id, timestamp);
  }

  async function deleteBackup(id: string, timestamp: number): Promise<boolean> {
    return libraryDeleteBackup(id, timestamp);
  }

  async function deleteAllBackups(id?: string): Promise<boolean> {
    return libraryDeleteAllBackups(id);
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
    setImage,
    removeImage,
    reorder,
    clearAll,
    trim,
    hasBackups,
    listBackups,
    restoreBackup,
    deleteBackup,
    deleteAllBackups,
    doExport,
    doImport
  };
});
