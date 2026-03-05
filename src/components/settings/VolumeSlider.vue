<script setup lang="ts">
import Slider from '../ui/Slider.vue';

defineProps<{
  modelValue: number;
  label?: string;
  valueText?: string;
  disabled?: boolean;
  compact?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();
</script>

<template>
  <div class="volume-row" :class="{ compact }">
    <label v-if="label">
      <slot name="icon" />
      {{ label }}
    </label>
    <Slider
      :model-value="modelValue"
      :disabled="disabled"
      :value-text="valueText"
      @update:model-value="(v: number) => emit('update:modelValue', v)"
    >
      <template #prefix>
        <slot name="prefix" />
      </template>
      <template #suffix>
        <slot name="suffix" />
      </template>
    </Slider>
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

.volume-row.compact {
  background: none;
  padding: 0;
  margin-bottom: 0;
}
</style>
