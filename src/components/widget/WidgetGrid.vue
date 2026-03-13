<script setup lang="ts">
import { computed } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import ViewModeSelector from '../ui/ViewModeSelector.vue';
import WidgetCard from './WidgetCard.vue';
import { useLibraryStore } from '../../stores/library';
import { useConfigStore } from '../../stores/config';
import { useAudio } from '../../composables/useAudio';
import { useImageUrls } from '../../composables/useImageUrls';
import { parseImage } from '../../enums/ui';
import { BuiltInGroup, LibraryViewMode } from '../../enums/library';
import type { LibraryViewModeValue } from '../../enums/library';

const { t } = useI18n();
const libraryStore = useLibraryStore();
const configStore = useConfigStore();
const { playingCardId, playingName, previewingCardId, stopEverything } = useAudio();

const { imageUrls } = useImageUrls();
const parsedImages = computed(() =>
  _.keyBy(_.map(libraryStore.items, (item) => ({ id: item.id, ...parseImage(item.image) })), 'id')
);

const favoritesCount = computed(() => _.filter(libraryStore.items, 'favorite').length);
const isAnyPlaying = computed(() => !!(playingCardId.value || playingName.value || previewingCardId.value));

function setViewMode(mode: LibraryViewModeValue) {
  configStore.widgetViewMode = mode;
  configStore.save();
}

function toggleHideNames(value: boolean) {
  configStore.widgetHideNames = value;
  configStore.save();
}

function onStop() {
  stopEverything();
}

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
        v-tooltip="configStore.stopHotkey ? `Stop (${configStore.stopHotkey})` : 'Stop'"
      >
        <AppIcon name="stop" :size="10" />
        <span v-if="configStore.stopHotkey" class="widget-toolbar-hotkey">{{ configStore.stopHotkey }}</span>
      </button>
      <span class="widget-toolbar-spacer" />
      <ViewModeSelector
        :view-mode="configStore.widgetViewMode"
        :hide-names="configStore.widgetHideNames"
        :icon-size="10"
        @update:view-mode="setViewMode"
        @update:hide-names="toggleHideNames"
      />
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
  scrollbar-color: var(--bg-surface-active) transparent;
}

.widget-group-tabs::-webkit-scrollbar {
  height: 3px;
}

.widget-group-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.widget-group-tabs::-webkit-scrollbar-thumb {
  background: var(--bg-surface-active);
  border-radius: 2px;
}

.widget-group-tabs::-webkit-scrollbar-thumb:hover {
  background: var(--border-active);
}

.widget-pill {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 10px;
  border: 1px solid var(--border-default);
  border-radius: 14px;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 0.65rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.widget-pill:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.widget-pill.active {
  background: var(--accent);
  color: var(--text-on-accent);
  border-color: var(--accent);
}

.widget-pill svg {
  fill: currentColor;
}

.widget-pill-badge {
  font-size: 0.6rem;
  background: var(--bg-surface-active);
  padding: 0 4px;
  border-radius: 8px;
  min-width: 14px;
  text-align: center;
}

.widget-pill.active .widget-pill-badge {
  background: var(--bg-overlay-light);
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
  background: var(--color-error-subtle);
  color: var(--color-error);
}

.widget-toolbar-hotkey {
  letter-spacing: 0.3px;
  line-height: 10px;
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
  color: var(--text-tertiary);
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
  background: var(--bg-surface-active);
  border-radius: 2px;
}

.widget-grid::-webkit-scrollbar-thumb:hover {
  background: var(--bg-surface-active);
}
</style>
