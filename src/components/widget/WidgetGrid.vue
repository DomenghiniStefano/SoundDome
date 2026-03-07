<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import WidgetCard from './WidgetCard.vue';
import { useLibraryStore } from '../../stores/library';
import { parseImage, isFileImage } from '../../enums/ui';
import { BuiltInSection } from '../../enums/library';

const { t } = useI18n();
const libraryStore = useLibraryStore();

const imageUrls = ref<Record<string, string>>({});
const parsedImages = computed(() =>
  _.keyBy(_.map(libraryStore.items, (item) => ({ id: item.id, ...parseImage(item.image) })), 'id')
);

const favoritesCount = computed(() => _.filter(libraryStore.items, 'favorite').length);

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
</script>

<template>
  <div class="widget-content">
    <div v-if="!_.isEmpty(libraryStore.items)" class="widget-section-tabs">
      <button
        class="widget-pill"
        :class="{ active: libraryStore.activeSection === BuiltInSection.ALL }"
        @click="libraryStore.activeSection = BuiltInSection.ALL"
      >
        {{ t('sections.all') }}
      </button>
      <button
        class="widget-pill"
        :class="{ active: libraryStore.activeSection === BuiltInSection.FAVORITES }"
        @click="libraryStore.activeSection = BuiltInSection.FAVORITES"
      >
        <AppIcon name="heart" :size="10" />
        <span v-if="favoritesCount > 0" class="widget-pill-badge">{{ favoritesCount }}</span>
      </button>
      <button
        v-for="section in libraryStore.sections"
        :key="section.id"
        class="widget-pill"
        :class="{ active: libraryStore.activeSection === section.id }"
        @click="libraryStore.activeSection = section.id"
      >
        {{ section.name }}
      </button>
    </div>

    <div class="widget-grid">
      <WidgetCard
        v-for="item in libraryStore.filteredItems"
        :key="item.id"
        :item="item"
        :image-url="imageUrls[item.id]"
        :parsed-image="parsedImages[item.id] ?? parseImage(null)"
      />

      <div v-if="_.isEmpty(libraryStore.filteredItems)" class="widget-empty">
        <AppIcon name="music" :size="24" />
        <span>{{ _.isEmpty(libraryStore.items) ? t('widget.emptyLibrary') : t('sections.emptySection') }}</span>
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

.widget-section-tabs {
  display: flex;
  gap: 4px;
  padding: 4px 6px;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.widget-section-tabs::-webkit-scrollbar {
  height: 3px;
}

.widget-section-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.widget-section-tabs::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.widget-section-tabs::-webkit-scrollbar-thumb:hover {
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

.widget-grid {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  grid-auto-rows: 1fr;
  gap: 5px;
  align-content: start;
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
