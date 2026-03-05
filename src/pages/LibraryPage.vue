<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Sortable } from 'sortablejs-vue3';
import PageHeader from '../components/layout/PageHeader.vue';
import SoundCard from '../components/cards/SoundCard.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import { useLibraryStore } from '../stores/library';
import { useAudio } from '../composables/useAudio';

const { t } = useI18n();
const libraryStore = useLibraryStore();
const { playRouted, playingCardId } = useAudio();

const editMode = ref(false);


const sortableOptions = {
  animation: 200,
  handle: '.drag-handle',
  ghostClass: 'sort-ghost',
  chosenClass: 'sort-chosen',
  dragClass: 'sort-drag',
};

onMounted(() => {
  libraryStore.load();
});

async function onPlay(item: LibraryItem) {
  if (editMode.value) return;
  const filePath = await libraryStore.getFilePath(item.filename);
  const fileUrl = `file://${filePath}`;
  await playRouted(fileUrl, item.id, item.name, { volume: item.volume, useDefault: item.useDefault });
}

async function onDelete(id: string) {
  await libraryStore.remove(id);
}

function onSortEnd(e: { oldIndex: number; newIndex: number }) {
  if (e.oldIndex === e.newIndex) return;
  const items = [...libraryStore.items];
  const [moved] = items.splice(e.oldIndex, 1);
  items.splice(e.newIndex, 0, moved);
  libraryStore.reorder(items.map(i => i.id));
}
</script>

<template>
  <div class="page">
    <PageHeader :title="t('library.title')" :subtitle="t('library.subtitle')">
      <template v-if="libraryStore.items.length > 0" #actions>
        <button
          class="edit-btn"
          :class="{ active: editMode }"
          :title="t('library.editOrder')"
          @click="editMode = !editMode"
        >
          <AppIcon name="edit" :size="16" />
        </button>
      </template>
    </PageHeader>

    <Sortable
      v-if="libraryStore.items.length > 0"
      :list="libraryStore.items"
      item-key="id"
      tag="div"
      class="library-grid"
      :options="{ ...sortableOptions, disabled: !editMode }"
      @end="onSortEnd"
    >
      <template #item="{ element: item }">
        <div class="drag-wrapper" :class="{ 'edit-mode': editMode }">
          <div v-if="editMode" class="drag-handle">
            <AppIcon name="drag-handle" :size="16" />
          </div>
          <SoundCard
            :id="item.id"
            :filename="item.filename"
            :name="item.name"
            mode="library"
            :active="playingCardId === item.id"
            :volume="item.volume"
            :use-default="item.useDefault"
            :hotkey="item.hotkey"
            @play="onPlay(item)"
            @delete="onDelete(item.id)"
          />
        </div>
      </template>
    </Sortable>

    <div v-else class="placeholder">
      <div class="placeholder-icon">&#9835;</div>
      <p>{{ t('library.emptyTitle') }}</p>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--page-padding);
}

.edit-btn {
  border: none;
  background: none;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color 0.15s, background 0.15s;
}

.edit-btn:hover {
  color: var(--color-text-white);
  background: var(--color-bg-card-hover);
}

.edit-btn.active {
  color: var(--color-accent);
  background: rgba(29, 185, 84, 0.12);
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-auto-rows: 1fr;
  gap: 12px;
}

.drag-wrapper {
  position: relative;
  border-radius: var(--card-radius, 8px);
  height: 100%;
}

.drag-wrapper :deep(.sound-card) {
  height: 100%;
}

.drag-wrapper.edit-mode {
  display: flex;
  align-items: stretch;
}

.drag-wrapper.edit-mode :deep(.sound-card) {
  flex: 1;
  min-width: 0;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  min-width: 24px;
  color: var(--color-text-dimmer);
  cursor: grab;
  opacity: 0.4;
  transition: opacity 0.15s, color 0.15s;
  flex-shrink: 0;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-wrapper:hover .drag-handle {
  opacity: 1;
  color: var(--color-text-dim);
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: var(--color-text-faint);
}

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.placeholder p {
  font-size: 0.9rem;
}
</style>

<style>
/* SortableJS classes (unscoped) */
.sort-ghost {
  opacity: 0.3;
}

.sort-chosen {
  opacity: 0.8;
}

.sort-drag {
  opacity: 0.9;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  border-radius: var(--card-radius, 8px);
}
</style>
