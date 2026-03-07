<script setup lang="ts">
import AppIcon from '../ui/AppIcon.vue';
import type { IconNameValue } from '../../enums/icons';

defineProps<{
  icon: IconNameValue;
  title: string;
}>();
</script>

<template>
  <section class="edit-section">
    <div class="edit-section-header">
      <AppIcon :name="icon" :size="16" />
      <span>{{ title }}</span>
      <slot name="header-right" />
    </div>
    <slot />
  </section>
</template>

<style scoped>
.edit-section {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  padding: 16px 20px;
}

.edit-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-white, #fff);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 14px;
}

.edit-section-header > svg {
  color: var(--color-accent);
}
</style>
