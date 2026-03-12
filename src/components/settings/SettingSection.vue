<script setup lang="ts">
import InfoTooltip from '../ui/InfoTooltip.vue';

defineProps<{
  title: string;
  tooltip?: string;
}>();
</script>

<template>
  <div class="section">
    <div class="section-title">
      {{ title }}
      <InfoTooltip v-if="tooltip" :text="tooltip" />
    </div>
    <slot />
  </div>
</template>

<style scoped>
.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--text-tertiary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}
</style>
