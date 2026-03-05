<script setup lang="ts">
import AppIcon from '../ui/AppIcon.vue';
import SwitchToggle from '../ui/SwitchToggle.vue';
import VolumeSlider from '../settings/VolumeSlider.vue';

defineProps<{
  visible: boolean;
  name: string;
  volume: number;
  useDefault: boolean;
}>();

const emit = defineEmits<{
  close: [];
  play: [];
  'update:volume': [value: number];
  'update:useDefault': [value: boolean];
}>();

function onToggleDefault(custom: boolean) {
  emit('update:useDefault', !custom);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="volume-modal-overlay" @click="emit('close')">
      <div class="volume-modal" @click.stop>
        <div class="volume-modal-header">
          <span class="volume-modal-title">{{ name }}</span>
          <button class="volume-modal-close" @click="emit('close')">
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
        <VolumeSlider
          :model-value="volume"
          :value-text="useDefault ? '—' : `${volume}`"
          :disabled="useDefault"
          compact
          @update:model-value="(v: number) => emit('update:volume', v)"
        />
      </div>
    </div>
  </Teleport>
</template>

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

</style>
