<script setup lang="ts">
defineProps<{
  title: string;
  subtitle: string;
}>();
</script>

<template>
  <h2 class="page-title">{{ title }}</h2>
  <p class="page-subtitle">{{ subtitle }}</p>
</template>

<style scoped>
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
</style>
