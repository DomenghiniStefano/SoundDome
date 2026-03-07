<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import { Sortable } from 'sortablejs-vue3';
import PageHeader from '../components/layout/PageHeader.vue';
import SoundCard from '../components/cards/SoundCard.vue';
import SectionTabs from '../components/library/SectionTabs.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import IconButton from '../components/ui/IconButton.vue';
import { useLibraryStore } from '../stores/library';
import { useAudio } from '../composables/useAudio';
import { isFileImage } from '../enums/ui';
import { BuiltInSection } from '../enums/library';

const { t } = useI18n();
const libraryStore = useLibraryStore();
const { playLibraryItem, playingCardId } = useAudio();

const editMode = ref(false);
const imageUrls = ref<Record<string, string>>({});

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

const sortableOptions = {
  animation: 200,
  handle: '.drag-handle',
  ghostClass: 'sort-ghost',
  chosenClass: 'sort-chosen',
  dragClass: 'sort-drag',
};

const canReorder = computed(() =>
  libraryStore.activeSection === BuiltInSection.ALL ||
  (libraryStore.activeSection !== BuiltInSection.FAVORITES && _.find(libraryStore.sections, { id: libraryStore.activeSection }))
);

const favoritesCount = computed(() => _.filter(libraryStore.items, 'favorite').length);

const memberSectionIds = computed(() => {
  const map: Record<string, string[]> = {};
  for (const section of libraryStore.sections) {
    for (const itemId of section.itemIds) {
      if (!map[itemId]) map[itemId] = [];
      map[itemId].push(section.id);
    }
  }
  return map;
});

const emptyMessage = computed(() => {
  if (libraryStore.activeSection === BuiltInSection.FAVORITES) return t('sections.emptyFavorites');
  if (libraryStore.activeSection !== BuiltInSection.ALL) return t('sections.emptySection');
  return t('library.emptyTitle');
});

onMounted(() => {
  libraryStore.load();
});

async function onPlay(item: LibraryItem) {
  if (editMode.value) return;
  await playLibraryItem(item);
}

async function onDelete(id: string) {
  await libraryStore.remove(id);
}

function onSortEnd(e: { oldIndex?: number; newIndex?: number }) {
  if (e.oldIndex == null || e.newIndex == null || e.oldIndex === e.newIndex) return;

  if (libraryStore.activeSection === BuiltInSection.ALL) {
    const reordered = _.clone(libraryStore.items);
    const [moved] = reordered.splice(e.oldIndex, 1);
    reordered.splice(e.newIndex, 0, moved);
    libraryStore.reorder(_.map(reordered, 'id'));
  } else {
    const section = _.find(libraryStore.sections, { id: libraryStore.activeSection });
    if (!section) return;
    const ids = _.clone(section.itemIds);
    const [moved] = ids.splice(e.oldIndex, 1);
    ids.splice(e.newIndex, 0, moved);
    libraryStore.updateSectionData(section.id, { itemIds: ids });
  }
}

function onSelectSection(id: string) {
  libraryStore.activeSection = id;
  editMode.value = false;
}

async function onCreateSection(name: string) {
  const section = await libraryStore.createSection(name);
  libraryStore.activeSection = section.id;
}

async function onRenameSection(id: string, name: string) {
  await libraryStore.updateSectionData(id, { name });
}

async function onDeleteSection(id: string) {
  await libraryStore.removeSection(id);
}

async function onToggleFavorite(id: string) {
  await libraryStore.toggleFavorite(id);
}

async function onAddToSection(sectionId: string, itemId: string) {
  await libraryStore.addToSection(sectionId, itemId);
}

async function onRemoveFromSection(sectionId: string, itemId: string) {
  await libraryStore.removeFromSection(sectionId, itemId);
}
</script>

<template>
  <div class="page">
    <PageHeader :title="t('library.title')" :subtitle="t('library.subtitle')">
      <template v-if="!_.isEmpty(libraryStore.items)" #actions>
        <IconButton
          v-if="canReorder"
          :icon="editMode ? 'check' : 'reorder'"
          :label="editMode ? t('editSound.save') : t('editSound.edit')"
          :size="16"
          :active="editMode"
          :title="t('library.editOrder')"
          @click="editMode = !editMode"
        />
      </template>
    </PageHeader>

    <SectionTabs
      v-if="!_.isEmpty(libraryStore.items)"
      :active-section="libraryStore.activeSection"
      :sections="libraryStore.sections"
      :favorites-count="favoritesCount"
      @select="onSelectSection"
      @create="onCreateSection"
      @rename="onRenameSection"
      @delete="onDeleteSection"
    />

    <Sortable
      v-if="!_.isEmpty(libraryStore.filteredItems)"
      :list="libraryStore.filteredItems"
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
            :hotkey="item.hotkey"
            :image="item.image"
            :image-url="imageUrls[item.id]"
            :favorite="item.favorite"
            :sections="libraryStore.sections"
            :member-section-ids="memberSectionIds[item.id] ?? []"
            @play="onPlay(item)"
            @delete="onDelete(item.id)"
            @toggle-favorite="onToggleFavorite(item.id)"
            @add-to-section="onAddToSection($event, item.id)"
            @remove-from-section="onRemoveFromSection($event, item.id)"
          />
        </div>
      </template>
    </Sortable>

    <div v-else class="placeholder">
      <div class="placeholder-icon">&#9835;</div>
      <p>{{ emptyMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--page-padding);
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
