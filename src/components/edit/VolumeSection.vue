<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import SwitchToggle from '../ui/SwitchToggle.vue';
import VolumeSlider from '../settings/VolumeSlider.vue';

defineProps<{
  volume: number;
  useDefault: boolean;
}>();

const emit = defineEmits<{
  'update:volume': [value: number];
  'update:useDefault': [value: boolean];
}>();

const { t } = useI18n();
</script>

<template>
  <section class="edit-section">
    <div class="edit-section-header">
      <AppIcon name="volume" :size="16" />
      <span>{{ t('common.volume') }}</span>
    </div>
    <div class="volume-section-controls">
      <div class="volume-section-toggle">
        <span class="volume-section-label" :class="{ active: !useDefault }">Custom</span>
        <SwitchToggle
          :model-value="!useDefault"
          small
          @update:model-value="(v: boolean) => emit('update:useDefault', !v)"
        />
      </div>
    </div>
    <VolumeSlider
      :model-value="volume"
      :value-text="useDefault ? '\u2014' : `${volume}`"
      :disabled="useDefault"
      compact
      @update:model-value="(v: number) => emit('update:volume', v)"
    />
  </section>
</template>

<style scoped>
.edit-section {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  padding: 16px 20px;
}

.edit-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-white, #fff);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 14px;
}

.edit-section-header svg {
  color: var(--color-accent);
}

.volume-section-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.volume-section-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-section-label {
  font-size: 0.7rem;
  color: var(--color-text-dimmer);
  white-space: nowrap;
}

.volume-section-label.active {
  color: var(--color-accent);
}
</style>
