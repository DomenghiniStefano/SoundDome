<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import SettingSection from './SettingSection.vue';
import VolumeSlider from './VolumeSlider.vue';
import StreamDeckButtonModal from './StreamDeckButtonModal.vue';
import AppIcon from '../ui/AppIcon.vue';
import { useStreamDeckStore } from '../../stores/streamdeck';
import { useLibraryStore } from '../../stores/library';
import { StreamDeckActionType } from '../../enums/streamdeck';
import type { StreamDeckActionTypeValue } from '../../enums/streamdeck';

const { t } = useI18n();
const streamDeck = useStreamDeckStore();
const libraryStore = useLibraryStore();

const showButtonModal = ref(false);
const selectedKeyIndex = ref<number | null>(null);

const GRID_COLS = 5;
const GRID_ROWS = 3;
const LCD_KEY_COUNT = 15;
const TOTAL_KEYS = 18;

const defaultNonLcdLabels: Record<number, string> = {
  15: 'streamDeck.stopAll',
  16: 'streamDeck.pagePrev',
  17: 'streamDeck.pageNext',
};

function getButtonLabel(keyIndex: number): string {
  const mapping = streamDeck.mappings.buttons[String(keyIndex)];
  if (mapping) {
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
          cpu: 'CPU', ram: 'RAM', gpu: 'GPU',
          cpuTemp: 'CPU°', gpuTemp: 'GPU°',
        };
        return statLabels[mapping.statType || ''] || t('streamDeck.systemStat');
      }
      default:
        return '';
    }
  }

  // Default labels for non-LCD buttons
  if (keyIndex >= LCD_KEY_COUNT) {
    const labelKey = defaultNonLcdLabels[keyIndex];
    return labelKey ? t(labelKey) : '';
  }

  // Default: show library item at page position
  const itemIndex = streamDeck.currentPage * LCD_KEY_COUNT + keyIndex;
  if (itemIndex < libraryStore.items.length) {
    return libraryStore.items[itemIndex].name;
  }
  return '';
}

function isLcdKey(keyIndex: number): boolean {
  return keyIndex < LCD_KEY_COUNT;
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
  streamDeck.setButtonMapping(selectedKeyIndex.value, mapping);
  showButtonModal.value = false;
  selectedKeyIndex.value = null;
  try {
    await streamDeck.saveMappings();
  } catch {
    // mappings are already set in store, persist will retry next time
  }
}

async function onBrightnessChange(value: number) {
  await streamDeck.setBrightness(value);
}

const selectedMapping = computed<StreamDeckButtonMapping | null>(() => {
  if (selectedKeyIndex.value === null) return null;
  return streamDeck.mappings.buttons[String(selectedKeyIndex.value)] || null;
});

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

      <div class="key-grid">
        <div class="grid-label">{{ t('streamDeck.lcdKeys') }}</div>
        <div class="grid-container">
          <button
            v-for="keyIndex in LCD_KEY_COUNT"
            :key="keyIndex - 1"
            class="key-cell lcd"
            @click="onKeyClick(keyIndex - 1)"
          >
            <span class="key-label">{{ getButtonLabel(keyIndex - 1) }}</span>
          </button>
        </div>

        <div class="grid-label">{{ t('streamDeck.functionKeys') }}</div>
        <div class="grid-container fn-keys">
          <button
            v-for="i in 3"
            :key="LCD_KEY_COUNT + i - 1"
            class="key-cell fn"
            @click="onKeyClick(LCD_KEY_COUNT + i - 1)"
          >
            <span class="key-label">{{ getButtonLabel(LCD_KEY_COUNT + i - 1) }}</span>
          </button>
        </div>
      </div>

      <div class="page-info">
        {{ t('streamDeck.page', { page: streamDeck.currentPage + 1 }) }}
      </div>
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

.key-grid {
  margin-top: 16px;
}

.grid-label {
  font-size: 0.72rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
  margin-top: 12px;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}

.grid-container.fn-keys {
  grid-template-columns: repeat(3, 1fr);
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

.key-cell.fn {
  aspect-ratio: auto;
  min-height: 42px;
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

.page-info {
  font-size: 0.78rem;
  color: var(--color-text-dim);
  text-align: center;
  margin-top: 8px;
}
</style>
