<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';
import DropdownMenu from '../ui/DropdownMenu.vue';

const props = defineProps<{
  name: string;
  mode: 'browse' | 'library';
  id?: string;
  filename?: string;
  active?: boolean;
  previewing?: boolean;
  saved?: boolean;
  volume?: number;
  useDefault?: boolean;
  hotkey?: string | null;
}>();

const emit = defineEmits<{
  play: [];
  preview: [];
  stopPreview: [];
  save: [];
  delete: [];
}>();

const router = useRouter();
const { t } = useI18n();

const showDeleteConfirm = ref(false);

function openEdit() {
  if (props.id) {
    router.push({ name: 'edit-sound', params: { id: props.id } });
  }
}
</script>

<template>
  <div
    class="sound-card"
    :class="{ active, library: mode === 'library' }"
    @click="emit('play')"
  >
    <button class="card-play" :class="{ active }" @click.stop="emit('play')">
      <AppIcon name="play" />
    </button>

    <div class="card-info">
      <div class="card-name">{{ name }}</div>
      <div v-if="mode === 'library' && hotkey" class="card-hotkey-label">
        {{ hotkey }}
      </div>
    </div>

    <div class="card-actions">
      <button
        v-if="mode === 'browse'"
        class="card-action card-preview"
        :class="{ previewing }"
        :title="t('common.listenLocal')"
        @click.stop="previewing ? emit('stopPreview') : emit('preview')"
      >
        <AppIcon v-if="previewing" name="stop" />
        <AppIcon v-else name="headphones" />
      </button>
      <button
        v-if="mode === 'browse'"
        class="card-action card-save"
        :class="{ saved }"
        :title="t('common.saveToLibrary')"
        @click.stop="emit('save')"
      >
        <AppIcon v-if="!saved" name="plus" />
        <AppIcon v-else name="check" />
      </button>
    </div>
    <DropdownMenu v-if="mode === 'library'" v-slot="{ close }">
      <button class="card-menu-item" @click="openEdit(); close()">
        <AppIcon name="edit" />
        {{ t('editSound.edit') }}
      </button>
      <button class="card-menu-item danger" @click="showDeleteConfirm = true; close()">
        <AppIcon name="trash" />
        {{ t('library.delete') }}
      </button>
    </DropdownMenu>

  </div>

  <ConfirmModal
    :visible="showDeleteConfirm"
    :title="t('library.deleteTitle', { name })"
    :message="t('library.confirmDelete', { name })"
    @confirm="emit('delete'); showDeleteConfirm = false"
    @cancel="showDeleteConfirm = false"
  />
</template>

<style scoped>
.sound-card {
  background: var(--color-bg-card);
  border-radius: var(--card-radius);
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
}

.sound-card:hover {
  background: var(--color-bg-card-hover);
  border-color: var(--color-border);
}

.sound-card.active {
  border-color: var(--color-accent);
  background: var(--color-active-bg);
}

/* Play button */
.card-play {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  border: none;
  background: #282828;
  color: var(--color-accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.sound-card:hover .card-play {
  background: var(--color-accent);
  color: #000;
}

.sound-card.active .card-play {
  background: var(--color-accent);
  color: #000;
}

.card-play svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

/* Info block */
.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Name */
.card-name {
  font-size: 0.8rem;
  color: var(--color-text);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

/* Hotkey label */
.card-hotkey-label {
  font-size: 0.6rem;
  color: var(--color-accent);
  font-family: monospace;
  letter-spacing: 0.3px;
}

/* Actions */
.card-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.sound-card:hover .card-actions,
.card-preview.previewing {
  opacity: 1;
}

.card-action {
  border: none;
  background: none;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
  display: flex;
  align-items: center;
}

.card-action svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.card-preview:hover {
  color: var(--color-text-white);
}

.card-preview.previewing {
  color: var(--color-error, #e53935);
}

.card-preview.previewing:hover {
  color: #c62828;
}

.card-save:hover {
  color: var(--color-accent);
}

.card-save.saved {
  color: var(--color-accent);
  pointer-events: none;
}

/* Menu items */
.card-menu-item {
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

.card-menu-item:hover {
  background: var(--color-bg-card-hover);
  color: var(--color-text-white);
}

.card-menu-item svg {
  width: 16px;
  height: 16px;
  min-width: 16px;
  fill: currentColor;
  flex-shrink: 0;
}

.card-menu-item.danger {
  color: var(--color-error, #e53935);
}

.card-menu-item.danger:hover {
  background: rgba(229, 57, 53, 0.1);
}
</style>
