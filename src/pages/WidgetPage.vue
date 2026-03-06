<script setup lang="ts">
import { onMounted } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import AppIcon from '../components/ui/AppIcon.vue';
import { useLibraryStore } from '../stores/library';
import { useConfigStore } from '../stores/config';
import { useAudio } from '../composables/useAudio';
import { useHotkeyListener } from '../composables/useHotkeyListener';
import { widgetClose } from '../services/api';

const { t } = useI18n();
const libraryStore = useLibraryStore();
const config = useConfigStore();
const { playLibraryItem, previewLibraryItem, stopPreview, playingCardId, previewingCardId } = useAudio();

useHotkeyListener();

function showMainApp() {
  widgetClose();
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
        <button class="widget-btn" @click="showMainApp" title="Open main app">
          <AppIcon name="window-restore" :size="10" />
        </button>
        <button class="widget-btn widget-btn-close" @click="widgetClose" title="Close widget">
          <AppIcon name="close" :size="10" />
        </button>
      </div>
    </div>

    <div class="widget-grid">
      <div
        v-for="item in libraryStore.items"
        :key="item.id"
        class="widget-card"
        :class="{ 'widget-card-playing': playingCardId === item.id }"
      >
        <button class="widget-play" @click="playLibraryItem(item)">
          <AppIcon :name="playingCardId === item.id ? 'stop-rounded' : 'play-rounded'" :size="16" />
        </button>
        <span class="widget-name" :title="item.name">{{ item.name }}</span>
        <button
          class="widget-preview"
          :class="{ 'widget-preview-active': previewingCardId === item.id }"
          @click="previewingCardId === item.id ? stopPreview() : previewLibraryItem(item)"
          title="Preview locally"
        >
          <AppIcon name="headphones" :size="12" />
        </button>
      </div>

      <div v-if="_.isEmpty(libraryStore.items)" class="widget-empty">
        {{ t('widget.emptyLibrary') }}
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
  font-weight: 500;
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

.widget-grid {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.widget-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: var(--small-radius);
  background: transparent;
  transition: background 0.15s;
}

.widget-card:hover {
  background: var(--color-bg-card-hover);
}

.widget-card-playing {
  background: var(--color-active-bg);
}

.widget-play {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: var(--color-bg-card);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.widget-play:hover {
  background: var(--color-accent);
  color: var(--color-text-white);
  transform: scale(1.05);
}

.widget-card-playing .widget-play {
  background: var(--color-accent);
  color: var(--color-text-white);
}

.widget-name {
  flex: 1;
  font-size: 12px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.widget-preview {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s;
}

.widget-card:hover .widget-preview {
  opacity: 1;
}

.widget-preview:hover {
  color: var(--color-text);
}

.widget-preview-active {
  opacity: 1;
  color: var(--color-accent);
}

.widget-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--color-text-muted);
  font-size: 13px;
}
</style>
