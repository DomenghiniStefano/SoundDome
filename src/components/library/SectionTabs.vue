<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import _ from 'lodash';
import AppIcon from '../ui/AppIcon.vue';
import DropdownMenu from '../ui/DropdownMenu.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';
import { BuiltInSection } from '../../enums/library';

const props = defineProps<{
  activeSection: string;
  sections: Section[];
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
const deleteSectionId = ref<string | null>(null);

const deleteSectionName = ref('');

function startRename(section: Section) {
  renamingId.value = section.id;
  renameValue.value = section.name;
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

function confirmDelete(section: Section) {
  deleteSectionId.value = section.id;
  deleteSectionName.value = section.name;
}

function onConfirmDelete() {
  if (deleteSectionId.value) {
    emit('delete', deleteSectionId.value);
  }
  deleteSectionId.value = null;
}

function onCreate() {
  emit('create', t('sections.newSection'));
}
</script>

<template>
  <div class="section-tabs">
    <button
      class="section-pill"
      :class="{ active: activeSection === BuiltInSection.ALL }"
      @click="emit('select', BuiltInSection.ALL)"
    >
      {{ t('sections.all') }}
    </button>

    <button
      class="section-pill"
      :class="{ active: activeSection === BuiltInSection.FAVORITES }"
      @click="emit('select', BuiltInSection.FAVORITES)"
    >
      <AppIcon name="heart" :size="12" />
      {{ t('sections.favorites') }}
      <span v-if="favoritesCount > 0" class="pill-badge">{{ favoritesCount }}</span>
    </button>

    <div v-for="section in sections" :key="section.id" class="section-pill-wrapper">
      <button
        v-if="renamingId !== section.id"
        class="section-pill"
        :class="{ active: activeSection === section.id }"
        @click="emit('select', section.id)"
      >
        {{ section.name }}
        <span v-if="section.itemIds.length > 0" class="pill-badge">{{ section.itemIds.length }}</span>
      </button>
      <input
        v-else
        ref="renameInputRef"
        v-model="renameValue"
        class="section-rename-input"
        @blur="finishRename"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
        @keydown.escape="renamingId = null"
      />
      <DropdownMenu v-if="renamingId !== section.id" v-slot="{ close }">
        <button class="section-menu-item" @click="startRename(section); close()">
          <AppIcon name="edit" />
          {{ t('sections.rename') }}
        </button>
        <button class="section-menu-item danger" @click="confirmDelete(section); close()">
          <AppIcon name="trash" />
          {{ t('sections.delete') }}
        </button>
      </DropdownMenu>
    </div>

    <button class="section-pill add-pill" @click="onCreate">
      <AppIcon name="plus" :size="14" />
    </button>
  </div>

  <ConfirmModal
    :visible="!!deleteSectionId"
    :title="t('sections.delete')"
    :message="t('sections.confirmDelete', { name: deleteSectionName })"
    @confirm="onConfirmDelete"
    @cancel="deleteSectionId = null"
  />
</template>

<style scoped>
.section-tabs {
  display: flex;
  gap: 6px;
  align-items: center;
  padding-bottom: 4px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.section-pill {
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

.section-pill:hover {
  background: var(--color-bg-card-hover);
  color: var(--color-text);
}

.section-pill.active {
  background: var(--color-accent);
  color: #000;
  border-color: var(--color-accent);
}

.section-pill svg {
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

.section-pill.active .pill-badge {
  background: rgba(0, 0, 0, 0.2);
}

.section-pill-wrapper {
  display: flex;
  align-items: center;
  gap: 0;
  position: relative;
  z-index: 5;
}

.section-pill-wrapper :deep(.dropdown-menu-wrapper) {
  position: absolute;
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.15s;
}

.section-pill-wrapper:hover :deep(.dropdown-menu-wrapper) {
  opacity: 1;
}

.section-pill-wrapper .section-pill {
  padding-right: 24px;
}

.section-rename-input {
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

.section-menu-item {
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

.section-menu-item:hover {
  background: var(--color-bg-card-hover);
  color: var(--color-text-white);
}

.section-menu-item svg {
  width: 16px;
  height: 16px;
  min-width: 16px;
  fill: currentColor;
}

.section-menu-item.danger {
  color: var(--color-error, #e53935);
}

.section-menu-item.danger:hover {
  background: rgba(229, 57, 53, 0.1);
}
</style>
