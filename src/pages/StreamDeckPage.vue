<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import PageHeader from '../components/layout/PageHeader.vue';
import VolumeSlider from '../components/settings/VolumeSlider.vue';
import StreamDeckButtonModal from '../components/settings/StreamDeckButtonModal.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import { useStreamDeckStore } from '../stores/streamdeck';
import { useLibraryStore } from '../stores/library';
import { StreamDeckActionType } from '../enums/streamdeck';
import { streamdeckSystemStats } from '../services/api';

const { t } = useI18n();
const streamDeck = useStreamDeckStore();
const libraryStore = useLibraryStore();

const showButtonModal = ref(false);
const selectedKeyIndex = ref<number | null>(null);
const statsInterval = ref<ReturnType<typeof setInterval> | null>(null);
const liveStats = ref<SystemStatsData | null>(null);
const editingPageName = ref<number | null>(null);
const editPageNameValue = ref('');

const LCD_KEY_COUNT = 15;

function getButtonInfo(keyIndex: number): { label: string; icon: string | null; type: string } {
  const pageData = streamDeck.currentPageData;
  const mapping = pageData.buttons[String(keyIndex)];
  if (mapping) {
    switch (mapping.type) {
      case StreamDeckActionType.SOUND: {
        if (mapping.itemId) {
          const item = _.find(libraryStore.items, { id: mapping.itemId });
          return { label: item ? item.name : t('streamDeck.unknownSound'), icon: 'music', type: 'sound' };
        }
        return { label: t('streamDeck.sound'), icon: 'music', type: 'sound' };
      }
      case StreamDeckActionType.STOP_ALL:
        return { label: t('streamDeck.stopAll'), icon: 'stop', type: 'action' };
      case StreamDeckActionType.PAGE_NEXT:
        return { label: t('streamDeck.pageNext'), icon: 'play', type: 'action' };
      case StreamDeckActionType.PAGE_PREV:
        return { label: t('streamDeck.pagePrev'), icon: 'arrow-back', type: 'action' };
      case StreamDeckActionType.FOLDER: {
        const targetPage = mapping.pageIndex !== undefined && mapping.pageIndex < streamDeck.pages.length
          ? streamDeck.pages[mapping.pageIndex].name
          : 'Folder';
        return { label: targetPage, icon: 'folder', type: 'folder' };
      }
      case StreamDeckActionType.GO_BACK:
        return { label: t('streamDeck.goBack'), icon: 'arrow-back', type: 'action' };
      case StreamDeckActionType.MEDIA_PLAY_PAUSE:
        return { label: t('streamDeck.mediaPlayPause'), icon: 'play', type: 'media' };
      case StreamDeckActionType.MEDIA_NEXT:
        return { label: t('streamDeck.mediaNext'), icon: 'play', type: 'media' };
      case StreamDeckActionType.MEDIA_PREV:
        return { label: t('streamDeck.mediaPrev'), icon: 'arrow-back', type: 'media' };
      case StreamDeckActionType.MEDIA_VOLUME_UP:
        return { label: t('streamDeck.mediaVolumeUp'), icon: 'volume-high', type: 'media' };
      case StreamDeckActionType.MEDIA_VOLUME_DOWN:
        return { label: t('streamDeck.mediaVolumeDown'), icon: 'volume', type: 'media' };
      case StreamDeckActionType.MEDIA_MUTE:
        return { label: t('streamDeck.mediaMute'), icon: 'volume-off', type: 'media' };
      case StreamDeckActionType.SHORTCUT:
        return { label: mapping.label || mapping.shortcut || t('streamDeck.shortcut'), icon: 'keyboard', type: 'shortcut' };
      case StreamDeckActionType.SYSTEM_STAT: {
        const statLabels: Record<string, string> = { cpu: 'CPU', ram: 'RAM', gpu: 'GPU', cpuTemp: 'CPU°', gpuTemp: 'GPU°' };
        const st = mapping.statType || '';
        return { label: statLabels[st] || t('streamDeck.systemStat'), icon: 'settings', type: 'stat' };
      }
    }
  }

  return { label: '', icon: null, type: 'empty' };
}

function getTypeClass(keyIndex: number): string {
  const info = getButtonInfo(keyIndex);
  return `type-${info.type}`;
}

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
  streamDeck.setButtonMapping(streamDeck.currentPage, selectedKeyIndex.value, mapping);
  showButtonModal.value = false;
  selectedKeyIndex.value = null;
  try {
    await streamDeck.saveMappings();
  } catch (err) {
    console.error('[StreamDeckPage] saveMappings failed:', err);
  }
}

async function onBrightnessChange(value: number) {
  await streamDeck.setBrightness(value);
}

function switchPage(pageIndex: number) {
  streamDeck.currentPage = pageIndex;
}

async function addPage() {
  const name = `Page ${streamDeck.pages.length + 1}`;
  streamDeck.addPage(name);
  streamDeck.currentPage = streamDeck.pages.length - 1;
  await streamDeck.saveMappings();
}

async function deletePage(pageIndex: number) {
  if (streamDeck.pages.length <= 1) return;
  const pageName = streamDeck.pages[pageIndex].name;
  if (!confirm(t('streamDeck.confirmDeletePage', { name: pageName }))) return;
  streamDeck.removePage(pageIndex);
  await streamDeck.saveMappings();
}

function startRenamePage(pageIndex: number) {
  editingPageName.value = pageIndex;
  editPageNameValue.value = streamDeck.pages[pageIndex].name;
}

async function finishRenamePage() {
  if (editingPageName.value === null) return;
  const name = editPageNameValue.value.trim();
  if (name) {
    streamDeck.renamePage(editingPageName.value, name);
    await streamDeck.saveMappings();
  }
  editingPageName.value = null;
}

const selectedMapping = computed<StreamDeckButtonMapping | null>(() => {
  if (selectedKeyIndex.value === null) return null;
  return streamDeck.currentPageData.buttons[String(selectedKeyIndex.value)] || null;
});

async function pollStats() {
  try {
    liveStats.value = await streamdeckSystemStats();
  } catch {
    // ignore
  }
}

onMounted(async () => {
  await streamDeck.load();
  if (_.isEmpty(libraryStore.items)) {
    await libraryStore.load();
  }
  pollStats();
  statsInterval.value = setInterval(pollStats, 2000);
});

onUnmounted(() => {
  if (statsInterval.value) {
    clearInterval(statsInterval.value);
  }
});
</script>

<template>
  <div class="streamdeck-page">
    <PageHeader title="Stream Deck" />

    <div class="deck-content">
      <!-- Connection status -->
      <div class="status-bar">
        <div class="status-indicator" :class="{ connected: streamDeck.isConnected }">
          <span class="status-dot" />
          {{ streamDeck.isConnected ? t('streamDeck.connected') : t('streamDeck.disconnected') }}
        </div>
        <div v-if="liveStats" class="live-stats">
          <span class="stat-pill">CPU {{ liveStats.cpuPercent }}%</span>
          <span class="stat-pill">RAM {{ liveStats.ramPercent }}%</span>
          <span class="stat-pill">GPU {{ liveStats.gpuPercent }}%</span>
        </div>
      </div>

      <!-- Brightness -->
      <div v-if="streamDeck.isConnected" class="brightness-row">
        <VolumeSlider
          :model-value="streamDeck.brightness"
          :label="t('streamDeck.brightness')"
          value-text="%"
          @update:model-value="onBrightnessChange"
        >
          <template #icon>
            <AppIcon name="sun" :size="16" />
          </template>
        </VolumeSlider>
      </div>

      <!-- Page Tabs -->
      <div class="page-tabs">
        <div class="tabs-row">
          <button
            v-for="(page, idx) in streamDeck.pages"
            :key="idx"
            class="page-tab"
            :class="{ active: streamDeck.currentPage === idx }"
            @click="switchPage(idx)"
            @dblclick="startRenamePage(idx)"
          >
            <template v-if="editingPageName === idx">
              <input
                v-model="editPageNameValue"
                class="rename-input"
                @blur="finishRenamePage"
                @keydown.enter="finishRenamePage"
                @keydown.escape="editingPageName = null"
                @click.stop
                autofocus
              />
            </template>
            <template v-else>
              {{ page.name }}
            </template>
            <button
              v-if="streamDeck.pages.length > 1 && streamDeck.currentPage === idx"
              class="tab-delete"
              @click.stop="deletePage(idx)"
            >
              &times;
            </button>
          </button>
          <button class="page-tab add-tab" @click="addPage">
            +
          </button>
        </div>
      </div>

      <!-- Key Grid -->
      <div class="deck-grid-wrapper">
        <div class="lcd-grid">
          <button
            v-for="keyIndex in LCD_KEY_COUNT"
            :key="keyIndex - 1"
            class="deck-key lcd"
            :class="[getTypeClass(keyIndex - 1), { selected: selectedKeyIndex === keyIndex - 1 }]"
            @click="onKeyClick(keyIndex - 1)"
          >
            <AppIcon v-if="getButtonInfo(keyIndex - 1).icon" :name="getButtonInfo(keyIndex - 1).icon!" :size="20" class="key-icon" />
            <span class="key-text">{{ getButtonInfo(keyIndex - 1).label }}</span>
          </button>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="quick-actions">
        <button class="action-btn" @click="streamDeck.refreshImages()">
          <AppIcon name="history" :size="16" />
          Refresh Display
        </button>
      </div>
    </div>

    <StreamDeckButtonModal
      :visible="showButtonModal"
      :key-index="selectedKeyIndex"
      :current-mapping="selectedMapping"
      @close="onModalClose"
      @save="onMappingSave"
    />
  </div>
</template>

<style scoped>
.streamdeck-page {
  padding: 0 24px 24px;
}

.deck-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius);
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

.live-stats {
  display: flex;
  gap: 8px;
}

.stat-pill {
  font-size: 0.72rem;
  padding: 3px 8px;
  border-radius: 10px;
  background: var(--color-bg-input);
  color: var(--color-text-dim);
  font-family: monospace;
}

.brightness-row {
  padding: 8px 16px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius);
}

/* Page tabs */
.page-tabs {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius);
  padding: 8px 12px;
}

.tabs-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.page-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  color: var(--color-text-dim);
  font-size: 0.8rem;
  cursor: pointer;
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

.page-tab.add-tab {
  padding: 6px 12px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-dim);
}

.page-tab.add-tab:hover {
  color: var(--color-accent);
}

.tab-delete {
  background: none;
  border: none;
  color: var(--color-text-dim);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}

.tab-delete:hover {
  color: var(--color-error);
}

.rename-input {
  width: 80px;
  padding: 2px 4px;
  border: 1px solid var(--color-accent);
  border-radius: 3px;
  background: var(--color-bg-input);
  color: var(--color-text);
  font-size: 0.8rem;
}

.deck-grid-wrapper {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius);
  padding: 20px;
}

.lcd-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.deck-key {
  position: relative;
  aspect-ratio: 1;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: #0d0d1a;
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px;
  gap: 4px;
  transition: all 0.15s;
  min-height: 72px;
  overflow: hidden;
}

.deck-key:hover {
  border-color: var(--color-accent);
  transform: scale(1.03);
}

.deck-key.selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
}

.deck-key.type-sound { border-color: #1db95440; }
.deck-key.type-media { border-color: #3498db40; }
.deck-key.type-stat { border-color: #9b59b640; }
.deck-key.type-shortcut { border-color: #f39c1240; }
.deck-key.type-action { border-color: #e74c3c40; }
.deck-key.type-folder { border-color: #f39c1240; }
.deck-key.type-empty { border-color: var(--color-border); opacity: 0.5; }

.deck-key.type-sound:hover { border-color: #1db954; }
.deck-key.type-media:hover { border-color: #3498db; }
.deck-key.type-stat:hover { border-color: #9b59b6; }
.deck-key.type-shortcut:hover { border-color: #f39c12; }
.deck-key.type-action:hover { border-color: #e74c3c; }
.deck-key.type-folder:hover { border-color: #f39c12; }
.deck-key.type-empty:hover { border-color: var(--color-accent); opacity: 1; }

.key-icon {
  opacity: 0.6;
  flex-shrink: 0;
}

.key-text {
  font-size: 0.65rem;
  text-align: center;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  word-break: break-word;
  color: var(--color-text-dim);
}

.quick-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  color: var(--color-text-dim);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
