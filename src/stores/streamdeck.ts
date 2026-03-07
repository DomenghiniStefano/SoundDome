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
  const mappings = ref<StreamDeckMappings>({ pages: [{ name: 'Main', buttons: {} }], brightness: 80 });

  const pages = computed(() => mappings.value.pages);
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

  function setButtonMapping(pageIndex: number, keyIndex: number, mapping: StreamDeckButtonMapping | null) {
    if (pageIndex < 0 || pageIndex >= mappings.value.pages.length) return;
    if (mapping) {
      mappings.value.pages[pageIndex].buttons[String(keyIndex)] = mapping;
    } else {
      delete mappings.value.pages[pageIndex].buttons[String(keyIndex)];
    }
  }

  function addPage(name: string) {
    mappings.value.pages.push({ name, buttons: {} });
  }

  function removePage(pageIndex: number) {
    if (mappings.value.pages.length <= 1) return; // Keep at least one page
    if (pageIndex < 0 || pageIndex >= mappings.value.pages.length) return;

    mappings.value.pages.splice(pageIndex, 1);

    // Fix folder references: adjust pageIndex for folders pointing to pages after the removed one
    for (const page of mappings.value.pages) {
      for (const btn of Object.values(page.buttons)) {
        if (btn.type === 'folder' && btn.pageIndex !== undefined) {
          if (btn.pageIndex === pageIndex) {
            // This folder pointed to the deleted page — remove it
            btn.type = 'default' as string;
            delete btn.pageIndex;
          } else if (btn.pageIndex > pageIndex) {
            btn.pageIndex--;
          }
        }
      }
    }

    // Adjust current page if needed
    if (currentPage.value >= mappings.value.pages.length) {
      currentPage.value = mappings.value.pages.length - 1;
    }
  }

  function renamePage(pageIndex: number, name: string) {
    if (pageIndex < 0 || pageIndex >= mappings.value.pages.length) return;
    mappings.value.pages[pageIndex].name = name;
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
    currentPageData,
    load,
    saveMappings,
    setButtonMapping,
    addPage,
    removePage,
    renamePage,
    setBrightness,
    refreshImages,
  };
});
