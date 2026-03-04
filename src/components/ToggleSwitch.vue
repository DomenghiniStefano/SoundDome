<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  label: string;
  hint?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<template>
  <div class="setting-row">
    <div>
      <label>{{ label }}</label>
      <div v-if="hint" class="hint">{{ hint }}</div>
    </div>
    <label class="switch">
      <input
        type="checkbox"
        :checked="modelValue"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      >
      <span class="slider"></span>
    </label>
  </div>
</template>

<style scoped>
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-bg-card);
  padding: 14px 18px;
  border-radius: var(--input-radius);
  margin-bottom: 6px;
}

.setting-row label {
  font-size: 0.9rem;
  font-weight: 500;
}

.hint {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin-top: 2px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 22px;
  cursor: pointer;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--color-border);
  border-radius: 22px;
  transition: 0.25s;
}

.slider::before {
  content: "";
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: var(--color-slider-knob);
  border-radius: 50%;
  transition: 0.25s;
}

input:checked + .slider {
  background: var(--color-accent);
}

input:checked + .slider::before {
  background: var(--color-text-white);
  transform: translateX(20px);
}
</style>
