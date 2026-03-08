<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import { Sortable } from 'sortablejs-vue3';
import PageHeader from '../components/layout/PageHeader.vue';
import SoundCard from '../components/cards/SoundCard.vue';
import GroupTabs from '../components/library/GroupTabs.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import IconButton from '../components/ui/IconButton.vue';
import { useLibraryStore } from '../stores/library';
import { useAudio } from '../composables/useAudio';
import { isFileImage } from '../enums/ui';
import { BuiltInGroup } from '../enums/library';

const { t } = useI18n();
const libraryStore = useLibraryStore();
const { playLibraryItem, playingCardId } = useAudio();

const editMode = ref(false);
const searchInput = ref('');
const imageUrls = ref<Record<string, string>>({});

watch(searchInput, (val) => {
  libraryStore.searchQuery = val;
});

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
  !searchInput.value.trim() && (
    libraryStore.activeGroup === BuiltInGroup.ALL ||
    (libraryStore.activeGroup !== BuiltInGroup.FAVORITES && _.find(libraryStore.groups, { id: libraryStore.activeGroup }))
  )
);

const favoritesCount = computed(() => _.filter(libraryStore.items, 'favorite').length);

const memberGroupIds = computed(() => {
  const map: Record<string, string[]> = {};
  for (const group of libraryStore.groups) {
    for (const itemId of group.itemIds) {
      if (!map[itemId]) map[itemId] = [];
      map[itemId].push(group.id);
    }
  }
  return map;
});

const emptyMessage = computed(() => {
  if (searchInput.value.trim()) return t('library.noResults');
  if (libraryStore.activeGroup === BuiltInGroup.FAVORITES) return t('groups.emptyFavorites');
  if (libraryStore.activeGroup !== BuiltInGroup.ALL) return t('groups.emptyGroup');
  return t('library.emptyTitle');
});

onMounted(() => {
  libraryStore.load();
  libraryStore.startListening();
});

onUnmounted(() => {
  libraryStore.stopListening();
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

  if (libraryStore.activeGroup === BuiltInGroup.ALL) {
    const reordered = _.clone(libraryStore.items);
    const [moved] = reordered.splice(e.oldIndex, 1);
    reordered.splice(e.newIndex, 0, moved);
    libraryStore.reorder(_.map(reordered, 'id'));
  } else {
    const group = _.find(libraryStore.groups, { id: libraryStore.activeGroup });
    if (!group) return;
    const ids = _.clone(group.itemIds);
    const [moved] = ids.splice(e.oldIndex, 1);
    ids.splice(e.newIndex, 0, moved);
    libraryStore.updateGroupData(group.id, { itemIds: ids });
  }
}

function onSelectGroup(id: string) {
  libraryStore.activeGroup = id;
  editMode.value = false;
}

async function onCreateGroup(name: string) {
  const group = await libraryStore.createGroup(name);
  libraryStore.activeGroup = group.id;
}

async function onRenameGroup(id: string, name: string) {
  await libraryStore.updateGroupData(id, { name });
}

async function onDeleteGroup(id: string) {
  await libraryStore.removeGroup(id);
}

async function onToggleFavorite(id: string) {
  await libraryStore.toggleFavorite(id);
}

async function onAddToGroup(groupId: string, itemId: string) {
  await libraryStore.addToGroup(groupId, itemId);
}

async function onRemoveFromGroup(groupId: string, itemId: string) {
  await libraryStore.removeFromGroup(groupId, itemId);
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

    <GroupTabs
      v-if="!_.isEmpty(libraryStore.items)"
      :active-group="libraryStore.activeGroup"
      :groups="libraryStore.groups"
      :favorites-count="favoritesCount"
      @select="onSelectGroup"
      @create="onCreateGroup"
      @rename="onRenameGroup"
      @delete="onDeleteGroup"
    />

    <div v-if="!_.isEmpty(libraryStore.items)" class="search-bar">
      <AppIcon name="search" :size="16" class="search-icon" />
      <input
        v-model="searchInput"
        type="text"
        :placeholder="t('library.searchPlaceholder')"
        autocomplete="off"
      >
    </div>

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
            :groups="libraryStore.groups"
            :member-group-ids="memberGroupIds[item.id] ?? []"
            @play="onPlay(item)"
            @delete="onDelete(item.id)"
            @toggle-favorite="onToggleFavorite(item.id)"
            @add-to-group="onAddToGroup($event, item.id)"
            @remove-from-group="onRemoveFromGroup($event, item.id)"
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

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius);
  background: var(--color-bg-card);
  transition: border-color 0.2s;
}

.search-bar:focus-within {
  border-color: var(--color-accent);
}

.search-icon {
  color: var(--color-text-dimmer);
  flex-shrink: 0;
}

.search-bar input {
  flex: 1;
  border: none;
  background: none;
  color: var(--color-text);
  font-size: 0.85rem;
  outline: none;
}

.search-bar input::placeholder {
  color: var(--color-text-dimmer);
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
