<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import _ from 'lodash';
import AppIcon from '../ui/AppIcon.vue';
import DropdownMenu from '../ui/DropdownMenu.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';
import { BuiltInGroup } from '../../enums/library';

const props = defineProps<{
  activeGroup: string;
  groups: Group[];
  favoritesCount: number;
}>();

const emit = defineEmits<{
  select: [id: string];
  create: [name: string];
  rename: [id: string, name: string];
  delete: [id: string];
}>();

const { t } = useI18n();

const renamingId = ref<string | null>(null);
const renameValue = ref('');
const renameInputRef = ref<HTMLInputElement[]>();
const deleteGroupId = ref<string | null>(null);

const deleteGroupName = ref('');

function startRename(group: Group) {
  renamingId.value = group.id;
  renameValue.value = group.name;
  nextTick(() => {
    const input = renameInputRef.value?.[0];
    input?.focus();
    input?.select();
  });
}

function finishRename() {
  if (renamingId.value && renameValue.value.trim()) {
    emit('rename', renamingId.value, renameValue.value.trim());
  }
  renamingId.value = null;
}

function confirmDelete(group: Group) {
  deleteGroupId.value = group.id;
  deleteGroupName.value = group.name;
}

function onConfirmDelete() {
  if (deleteGroupId.value) {
    emit('delete', deleteGroupId.value);
  }
  deleteGroupId.value = null;
}

function onCreate() {
  emit('create', t('groups.newGroup'));
}
</script>

<template>
  <div class="group-tabs">
    <button
      class="group-pill"
      :class="{ active: activeGroup === BuiltInGroup.ALL }"
      @click="emit('select', BuiltInGroup.ALL)"
    >
      {{ t('groups.all') }}
    </button>

    <button
      class="group-pill"
      :class="{ active: activeGroup === BuiltInGroup.FAVORITES }"
      @click="emit('select', BuiltInGroup.FAVORITES)"
    >
      <AppIcon name="star" :size="12" />
      {{ t('groups.favorites') }}
      <span v-if="favoritesCount > 0" class="pill-badge">{{ favoritesCount }}</span>
    </button>

    <div v-for="group in groups" :key="group.id" class="group-pill-wrapper">
      <button
        v-if="renamingId !== group.id"
        class="group-pill"
        :class="{ active: activeGroup === group.id }"
        @click="emit('select', group.id)"
      >
        {{ group.name }}
        <span v-if="group.itemIds.length > 0" class="pill-badge">{{ group.itemIds.length }}</span>
      </button>
      <input
        v-else
        ref="renameInputRef"
        v-model="renameValue"
        class="group-rename-input"
        @blur="finishRename"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
        @keydown.escape="renamingId = null"
      />
      <DropdownMenu v-if="renamingId !== group.id" v-slot="{ close }">
        <button class="group-menu-item" @click="startRename(group); close()">
          <AppIcon name="edit" />
          {{ t('groups.rename') }}
        </button>
        <button class="group-menu-item danger" @click="confirmDelete(group); close()">
          <AppIcon name="trash" />
          {{ t('groups.delete') }}
        </button>
      </DropdownMenu>
    </div>

    <button class="group-pill add-pill" @click="onCreate">
      <AppIcon name="plus" :size="14" />
    </button>
  </div>

  <ConfirmModal
    :visible="!!deleteGroupId"
    :title="t('groups.delete')"
    :message="t('groups.confirmDelete', { name: deleteGroupName })"
    @confirm="onConfirmDelete"
    @cancel="deleteGroupId = null"
  />
</template>

<style scoped>
.group-tabs {
  display: flex;
  gap: 6px;
  align-items: center;
  padding-bottom: 4px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.group-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border: 1px solid var(--color-border, #333);
  border-radius: 20px;
  background: transparent;
  color: var(--color-text-dimmer);
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.group-pill:hover {
  background: var(--color-bg-card-hover);
  color: var(--color-text);
}

.group-pill.active {
  background: var(--color-accent);
  color: #000;
  border-color: var(--color-accent);
}

.group-pill svg {
  fill: currentColor;
}

.pill-badge {
  font-size: 0.65rem;
  background: rgba(255, 255, 255, 0.15);
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.group-pill.active .pill-badge {
  background: rgba(0, 0, 0, 0.2);
}

.group-pill-wrapper {
  display: flex;
  align-items: center;
  gap: 0;
  position: relative;
  z-index: 5;
}

.group-pill-wrapper :deep(.dropdown-menu-wrapper) {
  position: absolute;
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.15s;
}

.group-pill-wrapper:hover :deep(.dropdown-menu-wrapper) {
  opacity: 1;
}

.group-pill-wrapper .group-pill {
  padding-right: 24px;
}

.group-rename-input {
  padding: 5px 12px;
  border: 1px solid var(--color-accent);
  border-radius: 20px;
  background: var(--color-bg-card);
  color: var(--color-text-white);
  font-size: 0.75rem;
  outline: none;
  width: 120px;
}

.add-pill {
  padding: 6px 10px;
  border-style: dashed;
}

.add-pill:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.group-menu-item {
  width: 100%;
  border: none;
  background: none;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  transition: background 0.15s, color 0.15s;
}

.group-menu-item:hover {
  background: var(--color-bg-card-hover);
  color: var(--color-text-white);
}

.group-menu-item svg {
  width: 16px;
  height: 16px;
  min-width: 16px;
  fill: currentColor;
}

.group-menu-item.danger {
  color: var(--color-error, #e53935);
}

.group-menu-item.danger:hover {
  background: rgba(229, 57, 53, 0.1);
}
</style>
