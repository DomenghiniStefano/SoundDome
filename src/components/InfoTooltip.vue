<script setup lang="ts">
defineProps<{
  text: string;
}>();
</script>

<template>
  <span class="info-icon" :title="text">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>
  </span>
</template>

<style scoped>
.info-icon {
  display: inline-flex;
  align-items: center;
  color: var(--color-text-dim);
  cursor: help;
  margin-left: 6px;
  transition: color 0.15s;
}

.info-icon:hover {
  color: var(--color-accent);
}

.info-icon svg {
  width: 14px;
  height: 14px;
}
</style>
