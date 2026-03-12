<script setup lang="ts">
import AppIcon from './AppIcon.vue';
import type { IconNameValue } from '../../enums/icons';

defineProps<{
  icon: IconNameValue;
  label?: string;
  size?: number;
  active?: boolean;
  outlined?: boolean;
  compact?: boolean;
  danger?: boolean;
}>();
</script>

<template>
  <button class="icon-btn" :class="{ active, compact, danger }">
    <AppIcon :name="icon" :size="size ?? 14" :outlined="outlined" />
    <span v-if="label" class="icon-btn-label">{{ label }}</span>
    <slot />
  </button>
</template>

<style scoped>
.icon-btn {
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 500;
  transition: color 0.15s, background 0.15s, border-color 0.15s, opacity 0.15s;
}

.icon-btn:hover {
  color: var(--text-inverse);
  border-color: var(--text-tertiary);
}

.icon-btn.active {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-subtle);
}

.icon-btn.compact {
  padding: 4px 6px;
  border-color: transparent;
  background: none;
}

.icon-btn.danger {
  color: var(--color-error);
  border-color: transparent;
  background: none;
  opacity: 0.5;
}

.icon-btn.danger:hover {
  opacity: 1;
  color: var(--color-error);
  border-color: transparent;
}

.icon-btn-label {
  white-space: nowrap;
}
</style>
