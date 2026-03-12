<script setup lang="ts">
import InfoTooltip from '../ui/InfoTooltip.vue';

defineProps<{
  label: string;
  hint?: string;
  tooltip?: string;
}>();
</script>

<template>
  <div class="setting-row">
    <div class="setting-row-left">
      <label class="setting-row-label">{{ label }}<InfoTooltip v-if="tooltip" :text="tooltip" /></label>
      <div v-if="hint" class="setting-row-hint">{{ hint }}</div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.setting-row-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-row-label {
  display: inline-flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 500;
}

.setting-row-hint {
  color: var(--text-tertiary);
  font-size: 0.78rem;
}
</style>
