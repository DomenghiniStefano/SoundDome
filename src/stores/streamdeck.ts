import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import _ from 'lodash';
import { StoreName } from '../enums/stores';
import { STREAMDECK_AUTOSAVE_DELAY } from '../enums/streamdeck';
import {
  streamdeckStatus,
  streamdeckLoadMappings,
  streamdeckSaveMappings,
  streamdeckSetBrightness,
  streamdeckRefreshImages,
} from '../services/api';

export const useStreamDeckStore = defineStore(StoreName.STREAMDECK, () => {
  const isConnected = ref(false);
  const brightness = ref(80);
  const currentPage = ref(0);
  const mappings = ref<StreamDeckMappings>({
    pages: [{ name: 'Main', buttons: {} }],
    folders: [],
    brightness: 80,
  });

  const pages = computed(() => mappings.value.pages);
  const folders = computed(() => mappings.value.folders);
  const currentPageData = computed(() => mappings.value.pages[currentPage.value] || { name: '', buttons: {} });

  async function load() {
    try {
      const status = await streamdeckStatus();
      isConnected.value = status.connected;
      brightness.value = status.brightness;
      currentPage.value = status.currentPage;
    } catch {
      isConnected.value = false;
    }

    try {
      mappings.value = await streamdeckLoadMappings();
      if (!mappings.value.folders) mappings.value.folders = [];
      if (mappings.value.brightness) {
        brightness.value = mappings.value.brightness;
      }
    } catch {
      // keep defaults
    }
  }

  async function saveMappings() {
    mappings.value.brightness = brightness.value;
    const plain = JSON.parse(JSON.stringify(mappings.value));
    await streamdeckSaveMappings(plain);
  }

  const debouncedSave = _.debounce(saveMappings, STREAMDECK_AUTOSAVE_DELAY);

  // Top-level page button mapping
  function setButtonMapping(pageIndex: number, keyIndex: number, mapping: StreamDeckButtonMapping | null) {
    if (pageIndex < 0 || pageIndex >= mappings.value.pages.length) return;
    if (mapping) {
      mappings.value.pages[pageIndex].buttons[String(keyIndex)] = mapping;
    } else {
      delete mappings.value.pages[pageIndex].buttons[String(keyIndex)];
    }
    debouncedSave();
  }

  // Folder page button mapping
  function setFolderButtonMapping(folderIndex: number, pageIndex: number, keyIndex: number, mapping: StreamDeckButtonMapping | null) {
    const folder = mappings.value.folders[folderIndex];
    if (!folder || pageIndex < 0 || pageIndex >= folder.pages.length) return;
    if (mapping) {
      folder.pages[pageIndex].buttons[String(keyIndex)] = mapping;
    } else {
      delete folder.pages[pageIndex].buttons[String(keyIndex)];
    }
    debouncedSave();
  }

  function addPage(name: string) {
    if (!name.trim()) return;
    mappings.value.pages.push({ name: name.trim(), buttons: {} });
    debouncedSave();
  }

  function removePage(pageIndex: number) {
    if (mappings.value.pages.length <= 1) return;
    if (pageIndex < 0 || pageIndex >= mappings.value.pages.length) return;
    mappings.value.pages.splice(pageIndex, 1);
    if (currentPage.value >= mappings.value.pages.length) {
      currentPage.value = mappings.value.pages.length - 1;
    }
    debouncedSave();
  }

  function renamePage(pageIndex: number, name: string) {
    if (pageIndex < 0 || pageIndex >= mappings.value.pages.length) return;
    if (!name.trim()) return;
    mappings.value.pages[pageIndex].name = name.trim();
    debouncedSave();
  }

  // Folder CRUD
  function addFolder(name: string) {
    if (!name.trim()) return;
    mappings.value.folders.push({ name: name.trim(), pages: [{ name: 'Page 1', buttons: {} }] });
    debouncedSave();
  }

  function removeFolder(folderIndex: number) {
    if (folderIndex < 0 || folderIndex >= mappings.value.folders.length) return;
    mappings.value.folders.splice(folderIndex, 1);

    // Clean up folder buttons pointing to removed/shifted folders
    for (const page of mappings.value.pages) {
      for (const btn of Object.values(page.buttons)) {
        if (btn.type === 'folder' && btn.folderIndex !== undefined) {
          if (btn.folderIndex === folderIndex) {
            delete btn.folderIndex;
            btn.type = 'default' as string;
          } else if (btn.folderIndex > folderIndex) {
            btn.folderIndex--;
          }
        }
      }
    }
    debouncedSave();
  }

  function renameFolder(folderIndex: number, name: string) {
    if (folderIndex < 0 || folderIndex >= mappings.value.folders.length) return;
    if (!name.trim()) return;
    mappings.value.folders[folderIndex].name = name.trim();
    debouncedSave();
  }

  function setFolderIcon(folderIndex: number, icon: string) {
    if (folderIndex < 0 || folderIndex >= mappings.value.folders.length) return;
    mappings.value.folders[folderIndex].icon = icon || undefined;
    debouncedSave();
  }

  function addFolderPage(folderIndex: number, name: string) {
    const folder = mappings.value.folders[folderIndex];
    if (!folder) return;
    if (!name.trim()) return;
    folder.pages.push({ name: name.trim(), buttons: {} });
    debouncedSave();
  }

  function removeFolderPage(folderIndex: number, pageIndex: number) {
    const folder = mappings.value.folders[folderIndex];
    if (!folder || folder.pages.length <= 1) return;
    if (pageIndex < 0 || pageIndex >= folder.pages.length) return;
    folder.pages.splice(pageIndex, 1);
    debouncedSave();
  }

  function renameFolderPage(folderIndex: number, pageIndex: number, name: string) {
    const folder = mappings.value.folders[folderIndex];
    if (!folder || pageIndex < 0 || pageIndex >= folder.pages.length) return;
    if (!name.trim()) return;
    folder.pages[pageIndex].name = name.trim();
    debouncedSave();
  }

  function setConnected(value: boolean) {
    isConnected.value = value;
  }

  function setCurrentPage(page: number) {
    if (page < 0 || page >= mappings.value.pages.length) return;
    currentPage.value = page;
  }

  async function setBrightness(value: number) {
    brightness.value = value;
    await streamdeckSetBrightness(value);
    await saveMappings();
  }

  async function refreshImages() {
    await streamdeckRefreshImages();
  }

  return {
    isConnected,
    brightness,
    currentPage,
    mappings,
    pages,
    folders,
    currentPageData,
    load,
    saveMappings,
    setButtonMapping,
    setFolderButtonMapping,
    addPage,
    removePage,
    renamePage,
    addFolder,
    removeFolder,
    renameFolder,
    setFolderIcon,
    addFolderPage,
    removeFolderPage,
    renameFolderPage,
    setConnected,
    setCurrentPage,
    setBrightness,
    refreshImages,
  };
});
