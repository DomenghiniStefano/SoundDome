<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from './AppIcon.vue';
import DropdownMenu from './DropdownMenu.vue';
import SwitchToggle from './SwitchToggle.vue';

const props = defineProps<{
  name: string;
  mode: 'browse' | 'library';
  active?: boolean;
  previewing?: boolean;
  saved?: boolean;
  volume?: number;
  useDefault?: boolean;
}>();

const emit = defineEmits<{
  play: [];
  preview: [];
  stopPreview: [];
  save: [];
  delete: [];
  update: [data: Partial<{ volume: number; useDefault: boolean }>];
}>();

const { t } = useI18n();

const showVolume = ref(false);

function onVolumeChange(e: Event) {
  const value = Number((e.target as HTMLInputElement).value);
  emit('update', { volume: value });
}

function onToggleDefault(custom: boolean) {
  emit('update', { useDefault: !custom });
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
    <span v-if="mode === 'library'" class="card-volume-badge" :class="{ custom: !useDefault }">
      <AppIcon :name="useDefault ? 'volume-link' : 'volume'" :size="10" />
      <template v-if="!useDefault">{{ volume ?? 100 }}</template>
    </span>

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
      <button class="card-menu-item danger" @click="emit('delete'); close()">
        <AppIcon name="close" />
        {{ t('common.remove') }}
      </button>
    </DropdownMenu>

  </div>

  <Teleport to="body">
    <div v-if="mode === 'library' && showVolume" class="volume-modal-overlay" @click="showVolume = false">
      <div class="volume-modal" @click.stop>
        <div class="volume-modal-header">
          <span class="volume-modal-title">{{ name }}</span>
          <button class="volume-modal-close" @click="showVolume = false">
            <AppIcon name="close" :size="16" />
          </button>
        </div>
        <div class="volume-modal-controls">
          <span class="volume-default-label" :class="{ active: !useDefault }">Custom</span>
          <SwitchToggle
            :model-value="!useDefault"
            small
            @update:model-value="onToggleDefault"
          />
          <button class="volume-modal-try" @click="emit('play')">
            <AppIcon name="headphones" :size="12" />
            Try
          </button>
        </div>
        <div class="volume-modal-slider">
          <input
            type="range"
            min="0"
            max="100"
            :value="volume ?? 100"
            :disabled="useDefault"
            class="volume-slider"
            @input="onVolumeChange"
          />
          <span class="volume-value" :class="{ disabled: useDefault }">{{ useDefault ? '—' : (volume ?? 100) }}</span>
        </div>
      </div>
    </div>
  </Teleport>
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
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  opacity: 0.4;
}

.card-volume-badge.custom {
  color: var(--color-accent);
  background: rgba(29, 185, 84, 0.12);
  opacity: 1;
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
  width: 14px;
  height: 14px;
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

<style>
/* Volume modal (unscoped for Teleport) */
.volume-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.volume-modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  padding: 16px;
  min-width: 280px;
  max-width: 360px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.volume-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.volume-modal-title {
  font-size: 0.85rem;
  color: var(--color-text-white, #fff);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.volume-modal-close {
  border: none;
  background: none;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.volume-modal-close svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.volume-modal-close:hover {
  color: var(--color-text-white);
}

.volume-modal-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.volume-modal-slider {
  display: flex;
  align-items: center;
  gap: 10px;
}

.volume-default-label {
  font-size: 0.7rem;
  color: var(--color-text-dimmer);
  white-space: nowrap;
}

.volume-default-label.active {
  color: var(--color-accent);
}

.volume-modal-try {
  margin-left: auto;
  border: none;
  background: var(--color-accent);
  color: #000;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s;
}

.volume-modal-try:hover {
  opacity: 0.85;
}

.volume-modal-try svg {
  width: 12px;
  height: 12px;
  fill: currentColor;
}

.volume-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #333;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider:disabled {
  opacity: 0.3;
  cursor: default;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
}

.volume-slider:disabled::-webkit-slider-thumb {
  background: #666;
  cursor: default;
}

.volume-value {
  font-size: 0.75rem;
  color: var(--color-text-dimmer);
  min-width: 24px;
  text-align: right;
}

.volume-value.disabled {
  opacity: 0.4;
}
</style>
