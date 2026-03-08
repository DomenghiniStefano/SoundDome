<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import WidgetCard from './WidgetCard.vue';
import { useLibraryStore } from '../../stores/library';
import { useConfigStore } from '../../stores/config';
import { useAudio } from '../../composables/useAudio';
import { parseImage, isFileImage } from '../../enums/ui';
import { BuiltInGroup, LibraryViewMode } from '../../enums/library';
import type { LibraryViewModeValue } from '../../enums/library';

const { t } = useI18n();
const libraryStore = useLibraryStore();
const configStore = useConfigStore();
const { playingCardId, playingName, previewingCardId, stopAll, stopPreview } = useAudio();

const imageUrls = ref<Record<string, string>>({});
const parsedImages = computed(() =>
  _.keyBy(_.map(libraryStore.items, (item) => ({ id: item.id, ...parseImage(item.image) })), 'id')
);

const favoritesCount = computed(() => _.filter(libraryStore.items, 'favorite').length);
const isAnyPlaying = computed(() => !!(playingCardId.value || playingName.value || previewingCardId.value));

const viewModes: { mode: LibraryViewModeValue; icon: string; labelKey: string }[] = [
  { mode: LibraryViewMode.LARGE, icon: 'view-large', labelKey: 'library.viewLarge' },
  { mode: LibraryViewMode.MEDIUM, icon: 'view-medium', labelKey: 'library.viewMedium' },
  { mode: LibraryViewMode.SMALL, icon: 'view-small', labelKey: 'library.viewSmall' },
  { mode: LibraryViewMode.LIST, icon: 'view-list', labelKey: 'library.viewList' },
];

function setViewMode(mode: LibraryViewModeValue) {
  configStore.widgetViewMode = mode;
  configStore.save();
}

function toggleHideNames() {
  configStore.widgetHideNames = !configStore.widgetHideNames;
  configStore.save();
}

function onStop() {
  stopAll();
  stopPreview();
}

async function loadImageUrls() {
  const urls: Record<string, string> = {};
  for (const item of libraryStore.items) {
    if (isFileImage(item.image)) {
      const imgPath = await libraryStore.getFilePath(item.image!);
      urls[item.id] = `file://${imgPath.replace(/\\/g, '/')}`;
    }
  }
  imageUrls.value = urls;
}

watch(() => libraryStore.items, loadImageUrls, { deep: true, immediate: true });
</script>

<template>
  <div class="widget-content">
    <div v-if="!_.isEmpty(libraryStore.items)" class="widget-group-tabs">
      <button
        class="widget-pill"
        :class="{ active: libraryStore.activeGroup === BuiltInGroup.ALL }"
        @click="libraryStore.activeGroup = BuiltInGroup.ALL"
      >
        {{ t('groups.all') }}
      </button>
      <button
        class="widget-pill"
        :class="{ active: libraryStore.activeGroup === BuiltInGroup.FAVORITES }"
        @click="libraryStore.activeGroup = BuiltInGroup.FAVORITES"
      >
        <AppIcon name="star" :size="10" />
        <span v-if="favoritesCount > 0" class="widget-pill-badge">{{ favoritesCount }}</span>
      </button>
      <button
        v-for="group in libraryStore.groups"
        :key="group.id"
        class="widget-pill"
        :class="{ active: libraryStore.activeGroup === group.id }"
        @click="libraryStore.activeGroup = group.id"
      >
        {{ group.name }}
      </button>
    </div>

    <div v-if="!_.isEmpty(libraryStore.items)" class="widget-toolbar">
      <button
        v-if="isAnyPlaying"
        class="widget-toolbar-stop"
        @click="onStop"
        :title="configStore.stopHotkey ? `Stop (${configStore.stopHotkey})` : 'Stop'"
      >
        <AppIcon name="stop" :size="10" />
        <span v-if="configStore.stopHotkey" class="widget-toolbar-hotkey">{{ configStore.stopHotkey }}</span>
      </button>
      <span class="widget-toolbar-spacer" />
      <div class="view-controls">
        <button
          v-if="configStore.widgetViewMode !== LibraryViewMode.LIST"
          class="view-mode-btn"
          :class="{ active: configStore.widgetHideNames }"
          :title="configStore.widgetHideNames ? t('library.showNames') : t('library.hideNames')"
          @click="toggleHideNames"
        >
          <AppIcon :name="configStore.widgetHideNames ? 'eye-off' : 'eye'" :size="10" />
        </button>
        <div class="view-modes">
          <button
            v-for="vm in viewModes"
            :key="vm.mode"
            class="view-mode-btn"
            :class="{ active: configStore.widgetViewMode === vm.mode }"
            :title="t(vm.labelKey)"
            @click="setViewMode(vm.mode)"
          >
            <AppIcon :name="vm.icon" :size="10" />
          </button>
        </div>
      </div>
    </div>

    <div class="widget-grid" :class="[`view-${configStore.widgetViewMode}`, { 'hide-names': configStore.widgetHideNames && configStore.widgetViewMode !== LibraryViewMode.LIST }]">
      <WidgetCard
        v-for="item in libraryStore.filteredItems"
        :key="item.id"
        :item="item"
        :image-url="imageUrls[item.id]"
        :parsed-image="parsedImages[item.id] ?? parseImage(null)"
      />

      <div v-if="_.isEmpty(libraryStore.filteredItems)" class="widget-empty">
        <AppIcon name="music" :size="24" />
        <span>{{ _.isEmpty(libraryStore.items) ? t('widget.emptyLibrary') : t('groups.emptyGroup') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.widget-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.widget-group-tabs {
  display: flex;
  gap: 4px;
  padding: 4px 6px;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.widget-group-tabs::-webkit-scrollbar {
  height: 3px;
}

.widget-group-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.widget-group-tabs::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.widget-group-tabs::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.widget-pill {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 10px;
  border: 1px solid var(--color-border, #333);
  border-radius: 14px;
  background: transparent;
  color: var(--color-text-dimmer);
  font-size: 0.65rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.widget-pill:hover {
  background: var(--color-bg-card-hover);
  color: var(--color-text);
}

.widget-pill.active {
  background: var(--color-accent);
  color: #000;
  border-color: var(--color-accent);
}

.widget-pill svg {
  fill: currentColor;
}

.widget-pill-badge {
  font-size: 0.6rem;
  background: rgba(255, 255, 255, 0.15);
  padding: 0 4px;
  border-radius: 8px;
  min-width: 14px;
  text-align: center;
}

.widget-pill.active .widget-pill-badge {
  background: rgba(0, 0, 0, 0.2);
}

/* Toolbar */
.widget-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  flex-shrink: 0;
}

.widget-toolbar-spacer {
  flex: 1;
}

.widget-toolbar-stop {
  border: none;
  background: transparent;
  color: var(--color-error);
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 600;
  transition: all 0.15s;
}

.widget-toolbar-stop svg {
  display: block;
  flex-shrink: 0;
}

.widget-toolbar-stop:hover {
  background: rgba(229, 57, 53, 0.15);
  color: var(--color-error);
}

.widget-toolbar-hotkey {
  letter-spacing: 0.3px;
  line-height: 10px;
}

/* View controls */
.view-controls {
  display: flex;
  align-items: center;
  gap: 3px;
}

.view-modes {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  overflow: hidden;
}

.view-mode-btn {
  border: none;
  background: var(--color-bg-card);
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 4px 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.view-modes .view-mode-btn + .view-mode-btn {
  border-left: 1px solid var(--color-border);
}

.view-mode-btn:hover {
  color: var(--color-text-white);
}

.view-mode-btn.active {
  color: var(--color-accent);
  background: rgba(29, 185, 84, 0.12);
}

.view-controls > .view-mode-btn {
  border: 1px solid var(--color-border);
  border-radius: 5px;
}

/* Grid — default (medium) */
.widget-grid {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 5px;
  align-content: start;
  --widget-icon-size: 22px;
}

/* View: list */
.widget-grid.view-list {
  grid-template-columns: 1fr;
  grid-auto-rows: auto;
  gap: 3px;
}

/* View: small */
.widget-grid.view-small {
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 4px;
  --widget-icon-size: 16px;
}

.widget-grid.view-small :deep(.widget-card) {
  padding: 5px 6px;
  gap: 4px;
}

.widget-grid.view-small :deep(.widget-name) {
  font-size: 9px;
}

.widget-grid.view-small :deep(.widget-hotkey-row) {
  display: none;
}

/* View: large */
.widget-grid.view-large {
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 5px;
  --widget-icon-size: 36px;
}

.widget-grid.view-large :deep(.widget-card) {
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 10px 6px;
  gap: 6px;
}

.widget-grid.view-large :deep(.widget-card-content) {
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  width: 100%;
}

.widget-grid.view-large :deep(.widget-card-text) {
  align-items: center;
  overflow: hidden;
  width: 100%;
}

.widget-grid.view-large :deep(.widget-name) {
  font-size: 10px;
  white-space: normal;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
  max-width: 100%;
}

.widget-grid.view-large :deep(.widget-preview) {
  position: absolute;
  top: 4px;
  right: 4px;
}

/* Hide names — compact tile layout */
.widget-grid.hide-names :deep(.widget-card-text) {
  display: none;
}

.widget-grid.hide-names :deep(.widget-card) {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  gap: 0;
  position: relative;
}

.widget-grid.hide-names :deep(.widget-card-content) {
  flex-direction: column;
  align-items: center;
}

.widget-grid.hide-names :deep(.widget-preview) {
  position: absolute;
  top: 3px;
  right: 3px;
  opacity: 0;
}

.widget-grid.hide-names :deep(.widget-card:hover .widget-preview) {
  opacity: 0.7;
}

.widget-grid.hide-names.view-list {
  grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
  gap: 4px;
}

.widget-grid.hide-names.view-small {
  grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
}

.widget-grid.hide-names.view-medium {
  grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
}

.widget-grid.hide-names.view-large {
  grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
}

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

/* -- Scrollbar -- */
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
