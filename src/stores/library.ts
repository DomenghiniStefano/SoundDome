import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import _ from 'lodash';
import { LibraryStatus, BuiltInSection } from '../enums/library';
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
  sectionCreate as apiSectionCreate,
  sectionUpdate as apiSectionUpdate,
  sectionDelete as apiSectionDelete,
  sectionReorder as apiSectionReorder
} from '../services/api';

export const useLibraryStore = defineStore(StoreName.LIBRARY, () => {
  const items = ref<LibraryItem[]>([]);
  const sections = ref<Section[]>([]);
  const activeSection = ref<string>(BuiltInSection.ALL);
  const status = ref<LibraryStatusValue>(LibraryStatus.IDLE);

  const filteredItems = computed(() => {
    if (activeSection.value === BuiltInSection.ALL) return items.value;
    if (activeSection.value === BuiltInSection.FAVORITES) return _.filter(items.value, 'favorite');
    const section = _.find(sections.value, { id: activeSection.value });
    if (!section) return items.value;
    const byId = _.keyBy(items.value, 'id');
    return _.compact(_.map(section.itemIds, (id: string) => byId[id]));
  });

  async function load() {
    status.value = LibraryStatus.LOADING;
    try {
      const data = await libraryList();
      items.value = data.items;
      sections.value = data.sections;
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

  async function createSection(name: string) {
    const section = await apiSectionCreate(name);
    sections.value.push(section);
    return section;
  }

  async function updateSectionData(id: string, data: Partial<Pick<Section, 'name' | 'itemIds'>>) {
    const updated = await apiSectionUpdate(id, data);
    if (updated) {
      const section = _.find(sections.value, { id });
      if (section) Object.assign(section, updated);
    }
    return updated;
  }

  async function removeSection(id: string) {
    await apiSectionDelete(id);
    sections.value = _.reject(sections.value, { id });
    if (activeSection.value === id) activeSection.value = BuiltInSection.ALL;
  }

  async function reorderSections(orderedIds: string[]) {
    const byId = _.keyBy(sections.value, 'id');
    sections.value = _.compact(_.map(orderedIds, (id: string) => byId[id]));
    await apiSectionReorder(orderedIds);
  }

  async function addToSection(sectionId: string, itemId: string) {
    const section = _.find(sections.value, { id: sectionId });
    if (!section || _.includes(section.itemIds, itemId)) return;
    const newItemIds = _.concat(section.itemIds, [itemId]);
    await updateSectionData(sectionId, { itemIds: newItemIds });
  }

  async function removeFromSection(sectionId: string, itemId: string) {
    const section = _.find(sections.value, { id: sectionId });
    if (!section) return;
    const newItemIds = _.reject(section.itemIds, (id: string) => id === itemId);
    await updateSectionData(sectionId, { itemIds: newItemIds });
  }

  return {
    items,
    sections,
    activeSection,
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
    createSection,
    updateSectionData,
    removeSection,
    reorderSections,
    addToSection,
    removeFromSection
  };
});
