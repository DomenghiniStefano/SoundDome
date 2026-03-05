<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';
import DropdownMenu from '../ui/DropdownMenu.vue';
import VolumeModal from './VolumeModal.vue';
import HotkeyModal from './HotkeyModal.vue';
import TrimModal from './TrimModal.vue';

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
  usedHotkeys?: Map<string, string>;
}>();

const emit = defineEmits<{
  play: [];
  preview: [];
  stopPreview: [];
  save: [];
  delete: [];
  trimmed: [];
  update: [data: Partial<{ volume: number; useDefault: boolean }>];
  'update:hotkey': [value: string | null];
}>();

const { t } = useI18n();

const showVolume = ref(false);
const showHotkey = ref(false);
const showTrim = ref(false);
const showDeleteConfirm = ref(false);

function onVolumeChange(value: number) {
  emit('update', { volume: value });
}

function onToggleDefault(useDefault: boolean) {
  emit('update', { useDefault });
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

    <div class="card-name">{{ name }}</div>
    <button
      v-if="mode === 'library'"
      class="card-volume-badge"
      :class="{ custom: !useDefault }"
      @click.stop="showVolume = true"
    >
      <AppIcon :name="useDefault ? 'volume-link' : 'volume'" :size="10" />
      <template v-if="!useDefault">{{ volume ?? 100 }}</template>
    </button>
    <button
      v-if="mode === 'library' && hotkey"
      class="card-hotkey-badge"
      @click.stop="showHotkey = true"
    >
      <AppIcon name="keyboard" :size="10" />
      {{ hotkey }}
    </button>

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
      <button class="card-menu-item" @click="showVolume = !showVolume; close()">
        <AppIcon name="volume" />
        Volume
      </button>
      <button class="card-menu-item" @click="showHotkey = true; close()">
        <AppIcon name="keyboard" />
        Hotkey
      </button>
      <button class="card-menu-item" @click="showTrim = true; close()">
        <AppIcon name="edit" />
        {{ t('library.trim') }}
      </button>
      <button class="card-menu-item danger" @click="showDeleteConfirm = true; close()">
        <AppIcon name="trash" />
        {{ t('library.delete') }}
      </button>
    </DropdownMenu>

  </div>

  <VolumeModal
    v-if="mode === 'library'"
    :visible="showVolume"
    :name="name"
    :volume="volume ?? 100"
    :use-default="useDefault ?? true"
    @close="showVolume = false"
    @play="emit('play')"
    @update:volume="onVolumeChange"
    @update:use-default="onToggleDefault"
  />

  <HotkeyModal
    v-if="mode === 'library'"
    :visible="showHotkey"
    :name="name"
    :hotkey="hotkey ?? null"
    :used-hotkeys="usedHotkeys ?? new Map()"
    @close="showHotkey = false"
    @update:hotkey="(v: string | null) => emit('update:hotkey', v)"
  />

  <TrimModal
    v-if="mode === 'library' && id && filename"
    :visible="showTrim"
    :item="{ id, filename, name, volume: volume ?? 100, useDefault: useDefault ?? true, hotkey: hotkey ?? null }"
    @close="showTrim = false"
    @trimmed="emit('trimmed')"
  />

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

/* Name */
.card-name {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
  color: #bbb;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

/* Volume badge */
.card-volume-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.6rem;
  color: var(--color-text-dimmer);
  padding: 1px 5px;
  border: none;
  background: none;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  opacity: 0.4;
  cursor: pointer;
  transition: opacity 0.15s;
}

.card-volume-badge:hover {
  opacity: 0.7;
}

.card-volume-badge.custom {
  color: var(--color-accent);
  background: rgba(29, 185, 84, 0.12);
  opacity: 1;
}

/* Hotkey badge */
.card-hotkey-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.55rem;
  color: var(--color-accent);
  background: rgba(29, 185, 84, 0.12);
  padding: 1px 5px;
  border: none;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  font-family: monospace;
  transition: opacity 0.15s;
}

.card-hotkey-badge:hover {
  opacity: 0.7;
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
