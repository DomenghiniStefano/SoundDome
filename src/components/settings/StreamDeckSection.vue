<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import SettingSection from './SettingSection.vue';
import VolumeSlider from './VolumeSlider.vue';
import StreamDeckButtonModal from './StreamDeckButtonModal.vue';
import AppIcon from '../ui/AppIcon.vue';
import { useStreamDeckStore } from '../../stores/streamdeck';
import { useLibraryStore } from '../../stores/library';
import { StreamDeckActionType } from '../../enums/streamdeck';
import { parseImage } from '../../enums/ui';

const { t } = useI18n();
const streamDeck = useStreamDeckStore();
const libraryStore = useLibraryStore();

const showButtonModal = ref(false);
const selectedKeyIndex = ref<number | null>(null);
const editingPageIndex = ref(0);
const editingFolderIndex = ref<number | null>(null); // null = top-level page

const LCD_KEY_COUNT = 15;

// Tab: 'pages' or 'folders'
const activeTab = ref<'pages' | 'folders'>('pages');

// Inline add/rename state
const addingFolder = ref(false);
const newFolderName = ref('');

function getButtonLabel(buttons: Record<string, StreamDeckButtonMapping>, keyIndex: number): string {
  const mapping = buttons[String(keyIndex)];
  if (!mapping) return '';

  switch (mapping.type) {
    case StreamDeckActionType.SOUND:
      if (mapping.itemId) {
        const item = _.find(libraryStore.items, { id: mapping.itemId });
        return item ? item.name : t('streamDeck.unknownSound');
      }
      return t('streamDeck.sound');
    case StreamDeckActionType.STOP_ALL:
      return t('streamDeck.stopAll');
    case StreamDeckActionType.PAGE_NEXT:
      return t('streamDeck.pageNext');
    case StreamDeckActionType.PAGE_PREV:
      return t('streamDeck.pagePrev');
    case StreamDeckActionType.FOLDER: {
      if (mapping.folderIndex !== undefined) {
        const folder = streamDeck.folders[mapping.folderIndex];
        return folder ? folder.name : t('streamDeck.folder');
      }
      return t('streamDeck.folder');
    }
    case StreamDeckActionType.GO_BACK:
      return t('streamDeck.goBack');
    case StreamDeckActionType.MEDIA_PLAY_PAUSE:
      return t('streamDeck.mediaPlayPause');
    case StreamDeckActionType.MEDIA_NEXT:
      return t('streamDeck.mediaNext');
    case StreamDeckActionType.MEDIA_PREV:
      return t('streamDeck.mediaPrev');
    case StreamDeckActionType.MEDIA_VOLUME_UP:
      return t('streamDeck.mediaVolumeUp');
    case StreamDeckActionType.MEDIA_VOLUME_DOWN:
      return t('streamDeck.mediaVolumeDown');
    case StreamDeckActionType.MEDIA_MUTE:
      return t('streamDeck.mediaMute');
    case StreamDeckActionType.SHORTCUT:
      return mapping.label || mapping.shortcut || t('streamDeck.shortcut');
    case StreamDeckActionType.SYSTEM_STAT: {
      const statLabels: Record<string, string> = {
        cpu: 'CPU', ram: 'RAM', gpu: 'GPU', cpuTemp: 'CPU°', gpuTemp: 'GPU°',
        gpuVram: 'VRAM', disk: 'DISK', netUp: 'NET↑', netDown: 'NET↓', uptime: 'UP',
      };
      return statLabels[mapping.statType || ''] || t('streamDeck.systemStat');
    }
    default:
      return '';
  }
}

// Current buttons for the editing context
const currentButtons = computed(() => {
  if (editingFolderIndex.value !== null) {
    const folder = streamDeck.folders[editingFolderIndex.value];
    if (folder && editingPageIndex.value < folder.pages.length) {
      return folder.pages[editingPageIndex.value].buttons;
    }
    return {};
  }
  if (editingPageIndex.value < streamDeck.pages.length) {
    return streamDeck.pages[editingPageIndex.value].buttons;
  }
  return {};
});

const currentPageName = computed(() => {
  if (editingFolderIndex.value !== null) {
    const folder = streamDeck.folders[editingFolderIndex.value];
    if (folder && editingPageIndex.value < folder.pages.length) {
      return folder.pages[editingPageIndex.value].name;
    }
    return '';
  }
  if (editingPageIndex.value < streamDeck.pages.length) {
    return streamDeck.pages[editingPageIndex.value].name;
  }
  return '';
});

const editingPages = computed(() => {
  if (editingFolderIndex.value !== null) {
    const folder = streamDeck.folders[editingFolderIndex.value];
    return folder ? folder.pages : [];
  }
  return streamDeck.pages;
});

function onKeyClick(keyIndex: number) {
  selectedKeyIndex.value = keyIndex;
  showButtonModal.value = true;
}

function onModalClose() {
  showButtonModal.value = false;
  selectedKeyIndex.value = null;
}

async function onMappingSave(mapping: StreamDeckButtonMapping | null) {
  if (selectedKeyIndex.value === null) return;
  if (editingFolderIndex.value !== null) {
    streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, selectedKeyIndex.value, mapping);
  } else {
    streamDeck.setButtonMapping(editingPageIndex.value, selectedKeyIndex.value, mapping);
  }
  showButtonModal.value = false;
  selectedKeyIndex.value = null;
  try {
    await streamDeck.saveMappings();
  } catch {
    // persist will retry next time
  }
}

async function onBrightnessChange(value: number) {
  await streamDeck.setBrightness(value);
}

const selectedMapping = computed<StreamDeckButtonMapping | null>(() => {
  if (selectedKeyIndex.value === null) return null;
  return currentButtons.value[String(selectedKeyIndex.value)] || null;
});

// Page management
function switchPage(index: number) {
  editingPageIndex.value = index;
}

async function addPage() {
  const name = `Page ${editingPages.value.length + 1}`;
  if (editingFolderIndex.value !== null) {
    streamDeck.addFolderPage(editingFolderIndex.value, name);
  } else {
    streamDeck.addPage(name);
  }
  editingPageIndex.value = editingPages.value.length - 1;
  await streamDeck.saveMappings();
}

async function deletePage(index: number) {
  const page = editingPages.value[index];
  if (!page || editingPages.value.length <= 1) return;
  if (!confirm(t('streamDeck.confirmDeletePage', { name: page.name }))) return;
  if (editingFolderIndex.value !== null) {
    streamDeck.removeFolderPage(editingFolderIndex.value, index);
  } else {
    streamDeck.removePage(index);
  }
  if (editingPageIndex.value >= editingPages.value.length) {
    editingPageIndex.value = editingPages.value.length - 1;
  }
  await streamDeck.saveMappings();
}

// Rename is handled via double-click on page tabs (same as StreamDeckPage)

// Folder management
function selectFolder(index: number) {
  editingFolderIndex.value = index;
  editingPageIndex.value = 0;
}

function backToPages() {
  editingFolderIndex.value = null;
  editingPageIndex.value = 0;
}

function startAddFolder() {
  newFolderName.value = `Folder ${streamDeck.folders.length + 1}`;
  addingFolder.value = true;
}

async function finishAddFolder() {
  if (!addingFolder.value) return;
  const name = newFolderName.value.trim();
  addingFolder.value = false;
  if (!name) return;
  streamDeck.addFolder(name);
  await streamDeck.saveMappings();
}

async function deleteFolder(index: number) {
  const folder = streamDeck.folders[index];
  if (!folder) return;
  if (!confirm(t('streamDeck.confirmDeleteFolder', { name: folder.name }))) return;
  if (editingFolderIndex.value === index) {
    editingFolderIndex.value = null;
    editingPageIndex.value = 0;
  }
  streamDeck.removeFolder(index);
  await streamDeck.saveMappings();
}

// Rename folder not needed in settings sidebar — use the main StreamDeckPage

onMounted(() => {
  streamDeck.load();
});
</script>

<template>
  <SettingSection :title="t('streamDeck.title')" :tooltip="t('streamDeck.tooltip')">
    <div class="status-row">
      <div class="status-indicator" :class="{ connected: streamDeck.isConnected }">
        <span class="status-dot" />
        {{ streamDeck.isConnected ? t('streamDeck.connected') : t('streamDeck.disconnected') }}
      </div>
    </div>

    <template v-if="streamDeck.isConnected">
      <VolumeSlider
        :model-value="streamDeck.brightness"
        :label="t('streamDeck.brightness')"
        value-text="%"
        @update:model-value="onBrightnessChange"
      >
        <template #icon>
          <AppIcon name="sun" />
        </template>
      </VolumeSlider>

      <!-- Tabs: Pages / Folders -->
      <div class="section-tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'pages' && editingFolderIndex === null }"
          @click="activeTab = 'pages'; backToPages()"
        >
          {{ t('streamDeck.pages') }}
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'folders' || editingFolderIndex !== null }"
          @click="activeTab = 'folders'; editingFolderIndex = null"
        >
          {{ t('streamDeck.folders') }}
        </button>
      </div>

      <!-- Folders list -->
      <template v-if="activeTab === 'folders' && editingFolderIndex === null">
        <div class="folder-list">
          <div
            v-for="(folder, idx) in streamDeck.folders"
            :key="idx"
            class="folder-item"
          >
            <button class="folder-name" @click="selectFolder(idx)">
              <span v-if="!folder.icon" class="folder-icon-display">📁</span>
              <span v-else-if="parseImage(folder.icon).type === 'emoji'" class="folder-icon-display">{{ parseImage(folder.icon).value }}</span>
              <AppIcon v-else-if="parseImage(folder.icon).type === 'icon'" :name="parseImage(folder.icon).value!" :size="16" />
              <span v-else class="folder-icon-display">📁</span>
              {{ folder.name }}
              <span class="folder-page-count">{{ folder.pages.length }} {{ folder.pages.length === 1 ? 'page' : 'pages' }}</span>
            </button>
            <div class="folder-actions">
              <button class="icon-btn danger" @click="deleteFolder(idx)" :title="t('streamDeck.deleteFolder')">
                <AppIcon name="trash" :size="14" />
              </button>
            </div>
          </div>
          <div v-if="_.isEmpty(streamDeck.folders)" class="empty-folders">
            {{ t('streamDeck.noFolders') }}
          </div>
        </div>
        <div v-if="addingFolder" class="add-folder-input">
          <input
            v-model="newFolderName"
            class="folder-rename-input"
            :placeholder="t('streamDeck.newFolderName')"
            @blur="finishAddFolder"
            @keydown.enter="finishAddFolder"
            @keydown.escape="addingFolder = false"
            autofocus
          />
        </div>
        <button v-else class="add-btn" @click="startAddFolder">
          <AppIcon name="plus" :size="14" />
          {{ t('streamDeck.addFolder') }}
        </button>
      </template>

      <!-- Page editing (top-level or inside folder) -->
      <template v-if="activeTab === 'pages' || editingFolderIndex !== null">
        <!-- Folder breadcrumb -->
        <div v-if="editingFolderIndex !== null" class="breadcrumb">
          <button class="breadcrumb-link" @click="editingFolderIndex = null">
            {{ t('streamDeck.folders') }}
          </button>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-current">{{ streamDeck.folders[editingFolderIndex]?.name }}</span>
        </div>

        <!-- Page tabs -->
        <div class="page-tabs">
          <button
            v-for="(page, idx) in editingPages"
            :key="idx"
            class="page-tab"
            :class="{ active: editingPageIndex === idx }"
            @click="switchPage(idx)"
          >
            {{ page.name }}
            <span
              v-if="editingPages.length > 1"
              class="page-tab-close"
              @click.stop="deletePage(idx)"
            >&times;</span>
          </button>
          <button class="page-tab add" @click="addPage" :title="t('streamDeck.addPage')">+</button>
        </div>

        <!-- Key grid -->
        <div class="key-grid">
          <div class="grid-label">{{ t('streamDeck.lcdKeys') }}</div>
          <div class="grid-container">
            <button
              v-for="keyIndex in LCD_KEY_COUNT"
              :key="keyIndex - 1"
              class="key-cell lcd"
              @click="onKeyClick(keyIndex - 1)"
            >
              <span class="key-label">{{ getButtonLabel(currentButtons, keyIndex - 1) }}</span>
            </button>
          </div>
        </div>
      </template>
    </template>

    <StreamDeckButtonModal
      :visible="showButtonModal"
      :key-index="selectedKeyIndex"
      :current-mapping="selectedMapping"
      @close="onModalClose"
      @save="onMappingSave"
    />
  </SettingSection>
</template>

<style scoped>
.status-row {
  margin-bottom: 12px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.status-indicator.connected {
  color: var(--color-accent);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-error);
}

.status-indicator.connected .status-dot {
  background: var(--color-accent);
}

.section-tabs {
  display: flex;
  gap: 4px;
  margin-top: 16px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0;
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--color-text-dim);
  font-size: 0.82rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: var(--color-text);
}

.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.folder-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  overflow: hidden;
}

.folder-name {
  flex: 1;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
}

.folder-name:hover {
  background: var(--color-bg-card-hover);
}

.folder-page-count {
  font-size: 0.72rem;
  color: var(--color-text-dim);
  margin-left: 8px;
}

.folder-actions {
  display: flex;
  gap: 2px;
  padding-right: 8px;
}

.icon-btn {
  padding: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-dim);
  cursor: pointer;
  border-radius: var(--small-radius);
  transition: all 0.1s;
}

.icon-btn:hover {
  color: var(--color-text);
  background: var(--color-bg-card-hover);
}

.icon-btn.danger:hover {
  color: var(--color-error);
}

.empty-folders {
  padding: 20px;
  text-align: center;
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px;
  border: 1px dashed var(--color-border);
  border-radius: var(--small-radius);
  background: transparent;
  color: var(--color-text-dim);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s;
}

.add-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  margin-bottom: 8px;
}

.breadcrumb-link {
  border: none;
  background: transparent;
  color: var(--color-accent);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-sep {
  color: var(--color-text-dim);
}

.breadcrumb-current {
  color: var(--color-text);
}

.page-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 10px;
  overflow-x: auto;
}

.page-tab {
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  color: var(--color-text-dim);
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}

.page-tab:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}

.page-tab.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-active-bg);
}

.page-tab.add {
  border-style: dashed;
  color: var(--color-text-dim);
  padding: 6px 10px;
  font-size: 0.9rem;
}

.page-tab.add:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.page-tab-close {
  font-size: 0.9rem;
  line-height: 1;
  opacity: 0.5;
  transition: opacity 0.1s;
}

.page-tab-close:hover {
  opacity: 1;
  color: var(--color-error);
}

.key-grid {
  margin-top: 8px;
}

.grid-label {
  font-size: 0.72rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}

.key-cell {
  aspect-ratio: 1;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  transition: all 0.15s;
  min-height: 54px;
}

.key-cell:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-card-hover);
}

.key-label {
  font-size: 0.68rem;
  text-align: center;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.add-folder-input {
  width: 100%;
}

.folder-rename-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-accent);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  color: var(--color-text);
  font-size: 0.85rem;
  box-sizing: border-box;
}
</style>
