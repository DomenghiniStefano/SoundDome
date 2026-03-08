import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import _ from 'lodash';
import { LibraryStatus, BuiltInGroup } from '../enums/library';
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
  libraryDeleteAllBackups,
  groupCreate as apiGroupCreate,
  groupUpdate as apiGroupUpdate,
  groupDelete as apiGroupDelete,
  groupReorder as apiGroupReorder,
  onLibraryChanged,
  removeLibraryChangedListener
} from '../services/api';

export const useLibraryStore = defineStore(StoreName.LIBRARY, () => {
  const items = ref<LibraryItem[]>([]);
  const groups = ref<Group[]>([]);
  const activeGroup = ref<string>(BuiltInGroup.ALL);
  const searchQuery = ref('');
  const status = ref<LibraryStatusValue>(LibraryStatus.IDLE);

  const filteredItems = computed(() => {
    let result: LibraryItem[];
    if (activeGroup.value === BuiltInGroup.ALL) {
      result = items.value;
    } else if (activeGroup.value === BuiltInGroup.FAVORITES) {
      result = _.filter(items.value, 'favorite');
    } else {
      const group = _.find(groups.value, { id: activeGroup.value });
      if (!group) {
        result = items.value;
      } else {
        const byId = _.keyBy(items.value, 'id');
        result = _.compact(_.map(group.itemIds, (id: string) => byId[id]));
      }
    }
    const q = searchQuery.value.trim().toLowerCase();
    if (q) {
      result = _.filter(result, (item: LibraryItem) => item.name.toLowerCase().includes(q));
    }
    return result;
  });

  async function load() {
    status.value = LibraryStatus.LOADING;
    try {
      const data = await libraryList();
      items.value = data.items;
      groups.value = data.groups;
      status.value = LibraryStatus.IDLE;
    } catch {
      status.value = LibraryStatus.ERROR;
    }
  }

  function startListening() {
    onLibraryChanged(() => load());
  }

  function stopListening() {
    removeLibraryChangedListener();
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

  async function update(id: string, data: Partial<Pick<LibraryItem, 'name' | 'volume' | 'hotkey' | 'backupEnabled' | 'image' | 'favorite'>>) {
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

  async function toggleFavorite(id: string) {
    const item = _.find(items.value, { id });
    if (!item) return;
    await update(id, { favorite: !item.favorite });
  }

  async function createGroup(name: string) {
    const group = await apiGroupCreate(name);
    groups.value.push(group);
    return group;
  }

  async function updateGroupData(id: string, data: Partial<Pick<Group, 'name' | 'itemIds'>>) {
    const updated = await apiGroupUpdate(id, data);
    if (updated) {
      const group = _.find(groups.value, { id });
      if (group) Object.assign(group, updated);
    }
    return updated;
  }

  async function removeGroup(id: string) {
    await apiGroupDelete(id);
    groups.value = _.reject(groups.value, { id });
    if (activeGroup.value === id) activeGroup.value = BuiltInGroup.ALL;
  }

  async function reorderGroups(orderedIds: string[]) {
    const byId = _.keyBy(groups.value, 'id');
    groups.value = _.compact(_.map(orderedIds, (id: string) => byId[id]));
    await apiGroupReorder(orderedIds);
  }

  async function addToGroup(groupId: string, itemId: string) {
    const group = _.find(groups.value, { id: groupId });
    if (!group || _.includes(group.itemIds, itemId)) return;
    const newItemIds = _.concat(group.itemIds, [itemId]);
    await updateGroupData(groupId, { itemIds: newItemIds });
  }

  async function removeFromGroup(groupId: string, itemId: string) {
    const group = _.find(groups.value, { id: groupId });
    if (!group) return;
    const newItemIds = _.reject(group.itemIds, (id: string) => id === itemId);
    await updateGroupData(groupId, { itemIds: newItemIds });
  }

  return {
    items,
    groups,
    activeGroup,
    searchQuery,
    filteredItems,
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
    doImport,
    toggleFavorite,
    createGroup,
    updateGroupData,
    removeGroup,
    reorderGroups,
    addToGroup,
    removeFromGroup,
    startListening,
    stopListening
  };
});
