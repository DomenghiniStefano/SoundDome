<script setup lang="ts">
defineProps<{
  title: string;
  subtitle: string;
}>();
</script>

<template>
  <div class="page-header">
    <div>
      <h2 class="page-title">{{ title }}</h2>
      <p class="page-subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="page-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--color-text-white);
}

.page-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  margin-bottom: 32px;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 6px;
}
</style>
