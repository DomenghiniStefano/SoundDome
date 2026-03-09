import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import _ from 'lodash';
import { StoreName } from '../enums/stores';
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

  // Top-level page button mapping
  function setButtonMapping(pageIndex: number, keyIndex: number, mapping: StreamDeckButtonMapping | null) {
    if (pageIndex < 0 || pageIndex >= mappings.value.pages.length) return;
    if (mapping) {
      mappings.value.pages[pageIndex].buttons[String(keyIndex)] = mapping;
    } else {
      delete mappings.value.pages[pageIndex].buttons[String(keyIndex)];
    }
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
  }

  function addPage(name: string) {
    mappings.value.pages.push({ name, buttons: {} });
  }

  function removePage(pageIndex: number) {
    if (mappings.value.pages.length <= 1) return;
    if (pageIndex < 0 || pageIndex >= mappings.value.pages.length) return;
    mappings.value.pages.splice(pageIndex, 1);
    if (currentPage.value >= mappings.value.pages.length) {
      currentPage.value = mappings.value.pages.length - 1;
    }
  }

  function renamePage(pageIndex: number, name: string) {
    if (pageIndex < 0 || pageIndex >= mappings.value.pages.length) return;
    mappings.value.pages[pageIndex].name = name;
  }

  // Folder CRUD
  function addFolder(name: string) {
    mappings.value.folders.push({ name, pages: [{ name: 'Page 1', buttons: {} }] });
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
  }

  function renameFolder(folderIndex: number, name: string) {
    if (folderIndex < 0 || folderIndex >= mappings.value.folders.length) return;
    mappings.value.folders[folderIndex].name = name;
  }

  function setFolderIcon(folderIndex: number, icon: string) {
    if (folderIndex < 0 || folderIndex >= mappings.value.folders.length) return;
    mappings.value.folders[folderIndex].icon = icon || undefined;
  }

  function addFolderPage(folderIndex: number, name: string) {
    const folder = mappings.value.folders[folderIndex];
    if (!folder) return;
    folder.pages.push({ name, buttons: {} });
  }

  function removeFolderPage(folderIndex: number, pageIndex: number) {
    const folder = mappings.value.folders[folderIndex];
    if (!folder || folder.pages.length <= 1) return;
    if (pageIndex < 0 || pageIndex >= folder.pages.length) return;
    folder.pages.splice(pageIndex, 1);
  }

  function renameFolderPage(folderIndex: number, pageIndex: number, name: string) {
    const folder = mappings.value.folders[folderIndex];
    if (!folder || pageIndex < 0 || pageIndex >= folder.pages.length) return;
    folder.pages[pageIndex].name = name;
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
    setBrightness,
    refreshImages,
  };
});
