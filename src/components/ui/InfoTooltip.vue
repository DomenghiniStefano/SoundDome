<script setup lang="ts">
import AppIcon from './AppIcon.vue';

defineProps<{
  text: string;
}>();
</script>

<template>
  <span class="info-icon" v-tooltip="text">
    <AppIcon name="info" />
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
