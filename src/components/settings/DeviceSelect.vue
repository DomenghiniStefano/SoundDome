<script setup lang="ts">
defineProps<{
  modelValue: string;
  label: string;
  options: { value: string; label: string }[];
  hideDefault?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <div class="select-card">
    <label>{{ label }}</label>
    <select
      :value="modelValue"
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
  </div>
</template>

<style scoped>
.select-card {
  background: var(--color-bg-card);
  padding: 14px 18px;
  border-radius: var(--input-radius);
  margin-bottom: 6px;
}

.select-card label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.select-card select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.select-card select:focus {
  border-color: var(--color-accent);
}
</style>
