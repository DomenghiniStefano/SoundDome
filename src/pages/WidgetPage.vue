<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import AppIcon from '../components/ui/AppIcon.vue';
import { useLibraryStore } from '../stores/library';
import { parseImage, isFileImage } from '../enums/ui';
import { useConfigStore } from '../stores/config';
import { useAudio } from '../composables/useAudio';
import { useHotkeyListener } from '../composables/useHotkeyListener';
import { widgetClose, widgetToggle } from '../services/api';

const { t } = useI18n();
const libraryStore = useLibraryStore();
const config = useConfigStore();
const { playLibraryItem, previewLibraryItem, stopPreview, playingCardId, previewingCardId } = useAudio();

useHotkeyListener();

const imageUrls = ref<Record<string, string>>({});
const parsedImages = computed(() =>
  _.keyBy(_.map(libraryStore.items, (item) => ({ id: item.id, ...parseImage(item.image) })), 'id')
);

async function loadImageUrls() {
  const urls: Record<string, string> = {};
  for (const item of libraryStore.items) {
    if (isFileImage(item.image)) {
      const imgPath = await libraryStore.getFilePath(item.image!);
      urls[item.id] = `file://${imgPath}`;
    }
  }
  imageUrls.value = urls;
}

watch(() => libraryStore.items, loadImageUrls, { deep: true });

async function showMainApp() {
  await widgetToggle();
}

onMounted(async () => {
  await config.load();
  await libraryStore.load();
});
</script>

<template>
  <div class="widget">
    <div class="widget-titlebar">
      <div class="widget-drag">
        <span class="widget-title">SoundDome</span>
      </div>
      <div class="widget-controls">
        <button class="widget-btn" @click="showMainApp" :title="t('widget.openMain')">
          <AppIcon name="window-restore" :size="10" />
        </button>
        <button class="widget-btn widget-btn-close" @click="widgetClose" :title="t('widget.close')">
          <AppIcon name="close" :size="10" />
        </button>
      </div>
    </div>

    <div class="widget-grid">
      <button
        v-for="item in libraryStore.items"
        :key="item.id"
        class="widget-card"
        :class="{
          'widget-card-playing': playingCardId === item.id,
          'widget-card-previewing': previewingCardId === item.id
        }"
        @click="playLibraryItem(item)"
      >
        <span class="widget-card-glow" />
        <span class="widget-card-content">
          <span class="widget-card-icon" :class="{
            'has-image': parsedImages[item.id]?.type === 'file',
            'has-custom': parsedImages[item.id]?.type === 'icon' || parsedImages[item.id]?.type === 'emoji'
          }">
            <img v-if="parsedImages[item.id]?.type === 'file' && imageUrls[item.id]" :src="imageUrls[item.id]" alt="" class="widget-card-img" />
            <span v-else-if="parsedImages[item.id]?.type === 'emoji'" class="widget-card-emoji">{{ parsedImages[item.id].value }}</span>
            <AppIcon v-else-if="parsedImages[item.id]?.type === 'icon'" :name="parsedImages[item.id].value!" :size="14" />
            <AppIcon v-else :name="playingCardId === item.id ? 'stop-rounded' : 'play-rounded'" :size="14" />
          </span>
          <span class="widget-card-text">
            <span class="widget-name" :title="item.name">{{ item.name }}</span>
            <span v-if="item.hotkey || (playingCardId === item.id && config.stopHotkey)" class="widget-hotkey-row">
              <span v-if="item.hotkey" class="widget-hotkey">{{ item.hotkey }}</span>
              <span v-if="playingCardId === item.id && config.stopHotkey" class="widget-hotkey widget-hotkey-stop">
                <AppIcon name="stop-rounded" :size="8" />
                {{ config.stopHotkey }}
              </span>
            </span>
          </span>
        </span>
        <span
          class="widget-preview"
          :class="{ 'widget-preview-active': previewingCardId === item.id }"
          @click.stop="previewingCardId === item.id ? stopPreview() : previewLibraryItem(item)"
          :title="t('widget.preview')"
        >
          <AppIcon name="headphones" :size="10" />
        </span>
      </button>

      <div v-if="_.isEmpty(libraryStore.items)" class="widget-empty">
        <AppIcon name="music" :size="24" />
        <span>{{ t('widget.emptyLibrary') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.widget {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg);
  overflow: hidden;
}

/* ── Titlebar ── */
.widget-titlebar {
  display: flex;
  align-items: center;
  height: 28px;
  background: var(--color-bg-sidebar);
  flex-shrink: 0;
}

.widget-drag {
  flex: 1;
  -webkit-app-region: drag;
  height: 100%;
  display: flex;
  align-items: center;
  padding-left: 10px;
}

.widget-title {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.widget-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.widget-btn {
  width: 36px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.widget-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.widget-btn-close:hover {
  background: #e81123;
  color: #fff;
}

/* ── Grid ── */
.widget-grid {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  align-content: start;
}

/* ── Card ── */
.widget-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  font-family: inherit;
  color: inherit;
  text-align: left;
}

.widget-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.widget-card:active {
  transform: scale(0.97);
}

/* ── Card playing state ── */
.widget-card-playing {
  border-color: rgba(29, 185, 84, 0.3);
  background: rgba(29, 185, 84, 0.1);
}

.widget-card-playing:hover {
  background: rgba(29, 185, 84, 0.15);
  border-color: rgba(29, 185, 84, 0.4);
}

.widget-card-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 50% 50%,
    rgba(29, 185, 84, 0.15) 0%,
    transparent 70%
  );
}

.widget-card-playing .widget-card-glow {
  opacity: 1;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ── Card previewing state ── */
.widget-card-previewing {
  border-color: rgba(255, 255, 255, 0.15);
}

/* ── Card content ── */
.widget-card-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.widget-card-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.07);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.widget-card-icon.has-image {
  padding: 0;
  overflow: hidden;
}

.widget-card-icon.has-custom {
  background: transparent;
}

.widget-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.widget-card-emoji {
  font-size: 14px;
  line-height: 1;
}

.widget-card:hover .widget-card-icon:not(.has-image):not(.has-custom) {
  background: var(--color-accent);
  color: var(--color-text-white);
}

.widget-card-playing .widget-card-icon:not(.has-image):not(.has-custom),
.widget-card-playing:hover .widget-card-icon:not(.has-image):not(.has-custom) {
  background: var(--color-error);
  color: var(--color-text-white);
}

.widget-card-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.widget-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  line-height: 1.3;
}

.widget-hotkey-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.widget-hotkey {
  font-size: 9px;
  color: var(--color-text-dim);
  font-weight: 500;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.widget-hotkey-stop {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--color-error);
  opacity: 0.8;
}

/* ── Preview button ── */
.widget-preview {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;
}

.widget-card:hover .widget-preview {
  opacity: 0.7;
}

.widget-preview:hover {
  opacity: 1 !important;
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.1);
}

.widget-preview-active {
  opacity: 1 !important;
  color: var(--color-accent);
}

/* ── Empty state ── */
.widget-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  grid-column: 1 / -1;
  flex: 1;
  color: var(--color-text-dim);
  font-size: 12px;
  min-height: 120px;
}

/* ── Scrollbar ── */
.widget-grid::-webkit-scrollbar {
  width: 4px;
}

.widget-grid::-webkit-scrollbar-track {
  background: transparent;
}

.widget-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.widget-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
