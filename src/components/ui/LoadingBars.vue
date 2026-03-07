<script setup lang="ts">
withDefaults(defineProps<{
  size?: number;
  color?: string;
}>(), {
  size: 20,
  color: 'var(--color-accent)',
});
</script>

<template>
  <svg
    class="loading-bars"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle class="dot dot-1" cx="4" cy="12" r="2.5" :fill="color" />
    <circle class="dot dot-2" cx="12" cy="12" r="2.5" :fill="color" />
    <circle class="dot dot-3" cx="20" cy="12" r="2.5" :fill="color" />
  </svg>
</template>

<style scoped>
.loading-bars {
  flex-shrink: 0;
}

.dot {
  animation: wave 1s ease-in-out infinite;
}

.dot-1 { animation-delay: 0s; }
.dot-2 { animation-delay: 0.15s; }
.dot-3 { animation-delay: 0.3s; }

@keyframes wave {
  0%, 100% { cy: 12; }
  50% { cy: 5; }
}
</style>
