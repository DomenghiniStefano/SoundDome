<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean;
  small?: boolean;
  disabled?: boolean;
}>(), {
  small: false,
  disabled: false
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<template>
  <label class="switch" :class="{ small, disabled }" @click.prevent="!disabled && emit('update:modelValue', !modelValue)">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
    >
    <span class="slider"></span>
  </label>
</template>

<style scoped>
.switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 22px;
  cursor: pointer;
  flex-shrink: 0;
}

.switch.small {
  width: 34px;
  height: 18px;
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
  background: var(--border-default);
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
  background: var(--slider-knob);
  border-radius: 50%;
  transition: 0.25s;
}

.switch.small .slider::before {
  height: 12px;
  width: 12px;
}

input:checked + .slider {
  background: var(--accent);
}

input:checked + .slider::before {
  background: var(--text-inverse);
  transform: translateX(20px);
}

.switch.small input:checked + .slider::before {
  transform: translateX(16px);
}

.switch.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
