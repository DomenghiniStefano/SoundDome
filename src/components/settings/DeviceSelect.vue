<script setup lang="ts">
import AppIcon from '../ui/AppIcon.vue';
import { IconName } from '../../enums/icons';

defineProps<{
  modelValue: string;
  label: string;
  options: { value: string; label: string }[];
  hideDefault?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <div class="select-card" :class="{ disabled }">
    <label>{{ label }}</label>
    <div class="select-wrapper">
      <select
        :value="modelValue"
        :disabled="disabled"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="!hideDefault" value="">Default</option>
        <option
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
      <AppIcon :name="IconName.CHEVRON_DOWN" :size="14" class="select-icon" />
    </div>
  </div>
</template>

<style scoped>
.select-card {
  background: var(--bg-card);
  padding: 14px 18px;
  border-radius: var(--input-radius);
  margin-bottom: 6px;
}

.select-card label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.select-wrapper {
  position: relative;
}

.select-wrapper select {
  width: 100%;
  padding: 8px 32px 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
  appearance: none;
}

.select-wrapper select:focus {
  border-color: var(--accent);
}

.select-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.select-card.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
