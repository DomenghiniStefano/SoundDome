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

function onInput(e: Event) {
  emit('update:modelValue', parseInt((e.target as HTMLInputElement).value, 10));
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
      @input="onInput"
    >
    <span class="slider-value" :class="{ disabled }">{{ valueText ?? `${modelValue}%` }}</span>
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
</style>
