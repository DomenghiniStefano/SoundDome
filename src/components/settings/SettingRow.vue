<script setup lang="ts">
defineProps<{
  label: string;
  hint?: string;
}>();
</script>

<template>
  <div class="setting-row">
    <div class="setting-row-left">
      <label>{{ label }}</label>
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

.setting-row-left label {
  font-size: 0.9rem;
  font-weight: 500;
}

.setting-row-hint {
  color: var(--text-tertiary);
  font-size: 0.78rem;
}
</style>
