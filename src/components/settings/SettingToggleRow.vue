<script setup lang="ts">
import SwitchToggle from '../ui/SwitchToggle.vue';

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
    <SwitchToggle
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
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
</style>
