<script setup lang="ts">
defineProps<{
  modelValue: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  valueText?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

function onSliderInput(e: Event) {
  emit('update:modelValue', parseInt((e.target as HTMLInputElement).value, 10));
}

function onNumberInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value;
  if (raw === '') return;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return;
  emit('update:modelValue', Math.max(parsed, 0));
}
</script>

<template>
  <div class="slider-wrap">
    <slot name="prefix" />
    <input
      type="range"
      class="slider"
      :class="{ disabled }"
      :min="min ?? 0"
      :max="max ?? 100"
      :value="modelValue"
      :disabled="disabled"
      @input="onSliderInput"
    >
    <input
      v-if="!valueText"
      type="number"
      class="slider-number"
      :class="{ disabled }"
      :min="0"
      :value="modelValue"
      :disabled="disabled"
      @change="onNumberInput"
    >
    <span v-else class="slider-value" :class="{ disabled }">{{ valueText }}</span>
    <slot name="suffix" />
  </div>
</template>

<style scoped>
.slider-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--slider-bg);
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  transition: transform 0.1s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.3);
}

.slider.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.slider.disabled::-webkit-slider-thumb {
  cursor: not-allowed;
}

.slider-value {
  font-size: 0.8rem;
  color: var(--text-secondary);
  min-width: 32px;
  text-align: right;
}

.slider-value.disabled {
  opacity: 0.35;
}

.slider-number {
  width: 48px;
  min-width: 48px;
  padding: 2px 4px;
  font-size: 0.8rem;
  font-family: var(--font-family);
  color: var(--text-secondary);
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  text-align: center;
  outline: none;
  -moz-appearance: textfield;
}

.slider-number::-webkit-inner-spin-button,
.slider-number::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.slider-number:focus {
  border-color: var(--accent);
}

.slider-number.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
