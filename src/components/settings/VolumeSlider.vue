<script setup lang="ts">
defineProps<{
  modelValue: number;
  label: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

function onInput(e: Event) {
  emit('update:modelValue', parseInt((e.target as HTMLInputElement).value, 10));
}
</script>

<template>
  <div class="volume-row">
    <label>
      <slot name="icon" />
      {{ label }}
    </label>
    <div class="volume-slider-wrap">
      <slot name="prefix" />
      <input
        type="range"
        class="volume-slider"
        min="0"
        max="100"
        :value="modelValue"
        @input="onInput"
      >
      <span class="volume-value">{{ modelValue }}%</span>
      <slot name="suffix" />
    </div>
  </div>
</template>

<style scoped>
.volume-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--color-bg-card);
  padding: 14px 18px;
  border-radius: var(--input-radius);
  margin-bottom: 6px;
}

.volume-row label {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 100px;
}

.volume-row label :deep(svg) {
  width: 16px;
  height: 16px;
  fill: var(--color-text-muted);
  flex-shrink: 0;
}

.volume-slider-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.volume-slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--color-slider-bg);
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
  transition: transform 0.1s;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.3);
}

.volume-value {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  min-width: 32px;
  text-align: right;
}
</style>
