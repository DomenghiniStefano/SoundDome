<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="section">
    <div class="section-title">{{ title }}</div>
    <slot />
  </div>
</template>

<style scoped>
.section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--color-text-dim);
  margin-bottom: 12px;
}
</style>
