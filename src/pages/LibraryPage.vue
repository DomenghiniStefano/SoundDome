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
import ViewModeSelector from '../components/ui/ViewModeSelector.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import ToastNotification from '../components/ui/ToastNotification.vue';
import { useLibraryStore } from '../stores/library';
import { useConfigStore } from '../stores/config';
import { useAudio } from '../composables/useAudio';
import { useImageUrls } from '../composables/useImageUrls';
import { useConfirmDialog } from '../composables/useConfirmDialog';
import { useToast } from '../composables/useToast';
import { BuiltInGroup, LibraryViewMode } from '../enums/library';
import { ToastType } from '../enums/ui';
import { ImportType } from '../enums/constants';
import { importInspect, importExecute } from '../services/api';
import type { LibraryViewModeValue } from '../enums/library';

const { t } = useI18n();
const libraryStore = useLibraryStore();
const configStore = useConfigStore();
const { playLibraryItem, playingCardId } = useAudio();
const confirmDialog = useConfirmDialog();
const { toastMessage, toastType, showToast } = useToast();

const pendingImport = ref<ImportPreview | null>(null);

const editMode = ref(false);
const searchInput = ref('');
const { imageUrls } = useImageUrls();

watch(searchInput, (val) => {
  libraryStore.searchQuery = val;
});

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

async function onUpload() {
  await libraryStore.upload();
}

function setViewMode(mode: LibraryViewModeValue) {
  configStore.libraryViewMode = mode;
  configStore.save();
}

function toggleHideNames(value: boolean) {
  configStore.libraryHideNames = value;
  configStore.save();
}

async function runExport(includeBackups: boolean) {
  try {
    const result = await libraryStore.doExport(includeBackups);
    if (result.canceled) return;
    if (result.success) {
      showToast(t('toast.exported', { count: result.count }), ToastType.SUCCESS);
    } else {
      showToast(result.error || t('toast.exportFailed'), ToastType.ERROR);
    }
  } catch (err) {
    showToast(t('toast.exportFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

async function onExportLibrary() {
  try {
    const hasBackups = await libraryStore.hasBackups();
    if (hasBackups) {
      confirmDialog.showCustom(
        t('confirm.includeBackups.title'),
        t('confirm.includeBackups.message'),
        [
          { label: t('common.cancel'), event: 'cancel' },
          { label: t('confirm.includeBackups.exclude'), event: 'exclude' },
          { label: t('confirm.includeBackups.include'), event: 'include', variant: 'accent' },
        ],
        {
          include: () => runExport(true),
          exclude: () => runExport(false),
        }
      );
      return;
    }
    await runExport(false);
  } catch (err) {
    showToast(t('toast.exportFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

async function onImportLibrary() {
  try {
    const preview = await importInspect();
    if (!preview) return;
    if (preview.type !== ImportType.LIBRARY) {
      showToast(t('toast.importWrongType'), ToastType.ERROR);
      return;
    }
    if (preview.library && preview.library.newSounds === 0) {
      showToast(t('settings.import.noNewSounds', { totalSounds: preview.library.totalSounds }), ToastType.INFO);
      return;
    }
    pendingImport.value = preview;
  } catch (err) {
    showToast(t('toast.importFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

async function onConfirmImport() {
  if (!pendingImport.value) return;
  const filePath = pendingImport.value.filePath;
  pendingImport.value = null;

  try {
    const result = await importExecute(filePath);
    if (result.success) {
      await libraryStore.load();
      showToast(t('toast.imported', { added: result.added, total: result.total }), ToastType.SUCCESS);
    } else {
      showToast(result.error || t('toast.importFailed'), ToastType.ERROR);
    }
  } catch (err) {
    showToast(t('toast.importFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}
</script>

<template>
  <div class="page">
    <PageHeader :title="t('library.title')" :subtitle="t('library.subtitle')">
      <template #actions>
        <IconButton
          icon="open"
          :label="t('library.importLibrary')"
          :size="16"
          v-tooltip="t('library.importLibraryTooltip')"
          @click="onImportLibrary"
        />
        <IconButton
          v-if="!_.isEmpty(libraryStore.items)"
          icon="download"
          :label="t('library.exportLibrary')"
          :size="16"
          v-tooltip="t('library.exportLibraryTooltip')"
          @click="onExportLibrary"
        />
        <IconButton
          icon="upload"
          :label="t('library.upload')"
          :size="16"
          v-tooltip="t('library.upload')"
          @click="onUpload"
        />
        <IconButton
          v-if="canReorder && !_.isEmpty(libraryStore.items)"
          :icon="editMode ? 'check' : 'reorder'"
          :label="editMode ? t('editSound.save') : t('editSound.edit')"
          :size="16"
          :active="editMode"
          v-tooltip="t('library.editOrder')"
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

    <div v-if="!_.isEmpty(libraryStore.items)" class="toolbar">
      <div class="search-bar">
        <AppIcon name="search" :size="16" class="search-icon" />
        <input
          v-model="searchInput"
          type="text"
          :placeholder="t('library.searchPlaceholder')"
          autocomplete="off"
        >
      </div>
      <ViewModeSelector
        :view-mode="configStore.libraryViewMode"
        :hide-names="configStore.libraryHideNames"
        @update:view-mode="setViewMode"
        @update:hide-names="toggleHideNames"
      />
    </div>

    <Sortable
      v-if="!_.isEmpty(libraryStore.filteredItems)"
      :list="libraryStore.filteredItems"
      item-key="id"
      tag="div"
      class="library-grid"
      :class="[`view-${configStore.libraryViewMode}`, { 'hide-names': configStore.libraryHideNames && configStore.libraryViewMode !== LibraryViewMode.LIST }]"
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

    <ToastNotification :message="toastMessage" :type="toastType" />
    <ConfirmModal
      :visible="!!pendingImport"
      :title="t('settings.import.title')"
      :message="pendingImport?.library ? t('settings.import.confirmLibrary', { totalSounds: pendingImport.library.totalSounds, newSounds: pendingImport.library.newSounds, groups: pendingImport.library.groups }) : ''"
      @confirm="onConfirmImport"
      @cancel="pendingImport = null"
    />
    <ConfirmModal
      :visible="confirmDialog.visible.value"
      :title="confirmDialog.title.value"
      :message="confirmDialog.message.value"
      :actions="confirmDialog.actions.value"
      @confirm="confirmDialog.confirm"
      @cancel="confirmDialog.cancel"
      @action="confirmDialog.onAction"
    />
  </div>
</template>

<style scoped>
.page {
  padding: var(--page-padding);
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: stretch;
  gap: 10px;
  margin-bottom: 16px;
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
  background: var(--bg-card);
  transition: border-color 0.2s;
}

.search-bar:focus-within {
  border-color: var(--accent);
}

.search-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-bar input {
  flex: 1;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
}

.search-bar input::placeholder {
  color: var(--text-tertiary);
}

/* Grid — default (medium) */
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-auto-rows: 1fr;
  gap: 12px;
  --card-play-size: 36px;
  --card-icon-size: 14px;
}

/* View: list */
.library-grid.view-list {
  grid-template-columns: 1fr;
  grid-auto-rows: auto;
  gap: 4px;
  --card-play-size: 32px;
  --card-icon-size: 12px;
}

.library-grid.view-list :deep(.sound-card) {
  padding: 6px 12px;
  gap: 10px;
}

.library-grid.view-list :deep(.card-info) {
  display: flex !important;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.library-grid.view-list :deep(.card-name) {
  font-size: 0.8rem;
  -webkit-line-clamp: 1;
  flex: 1;
  min-width: 0;
}

.library-grid.view-list :deep(.card-hotkey-label) {
  display: block !important;
  font-size: 0.65rem;
  flex-shrink: 0;
  background: var(--bg-surface-hover);
  padding: 2px 8px;
  border-radius: 4px;
}

.library-grid.view-list :deep(.card-favorite-icon) {
  display: block;
}

/* View: small */
.library-grid.view-small {
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 6px;
  --card-play-size: 28px;
  --card-icon-size: 12px;
}

.library-grid.view-small :deep(.sound-card) {
  padding: 6px 8px;
  gap: 6px;
}

.library-grid.view-small :deep(.card-name) {
  font-size: 0.7rem;
  -webkit-line-clamp: 1;
}

.library-grid.view-small :deep(.card-hotkey-label) {
  display: none;
}

/* View: large */
.library-grid.view-large {
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  --card-play-size: 56px;
  --card-icon-size: 22px;
}

.library-grid.view-large :deep(.sound-card) {
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px 12px;
  gap: 8px;
}

.library-grid.view-large :deep(.card-info) {
  align-items: center;
  overflow: hidden;
  width: 100%;
}

.library-grid.view-large :deep(.card-name) {
  font-size: 0.75rem;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
}

/* Hide names — compact tile layout */
.library-grid.hide-names :deep(.card-info) {
  display: none;
}

.library-grid.hide-names :deep(.sound-card) {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  gap: 0;
  position: relative;
}

.library-grid.hide-names :deep(.dropdown-menu-wrapper) {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.library-grid.hide-names :deep(.sound-card:hover .dropdown-menu-wrapper) {
  opacity: 1;
}

/* List view ignores hide-names — always shows full info row */
.library-grid.hide-names.view-list {
  grid-template-columns: 1fr;
  grid-auto-rows: auto;
  gap: 4px;
}

.library-grid.hide-names.view-list :deep(.sound-card) {
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  padding: 6px 12px;
  gap: 10px;
  position: static;
}

.library-grid.hide-names.view-list :deep(.card-info) {
  display: flex !important;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.library-grid.hide-names.view-list :deep(.dropdown-menu-wrapper) {
  position: static !important;
  opacity: 1 !important;
}

.library-grid.hide-names.view-small {
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
}

.library-grid.hide-names.view-medium {
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}

.library-grid.hide-names.view-large {
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
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
  color: var(--text-tertiary);
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
  color: var(--text-tertiary);
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: var(--text-faint);
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
  box-shadow: 0 4px 16px var(--bg-overlay-light);
  border-radius: var(--card-radius, 8px);
}
</style>
