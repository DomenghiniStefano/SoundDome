<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import WidgetCard from './WidgetCard.vue';
import { useLibraryStore } from '../../stores/library';
import { parseImage, isFileImage } from '../../enums/ui';

const { t } = useI18n();
const libraryStore = useLibraryStore();

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
</script>

<template>
  <div class="widget-grid">
    <WidgetCard
      v-for="item in libraryStore.items"
      :key="item.id"
      :item="item"
      :image-url="imageUrls[item.id]"
      :parsed-image="parsedImages[item.id] ?? parseImage(null)"
    />

    <div v-if="_.isEmpty(libraryStore.items)" class="widget-empty">
      <AppIcon name="music" :size="24" />
      <span>{{ t('widget.emptyLibrary') }}</span>
    </div>
  </div>
</template>

<style scoped>
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
