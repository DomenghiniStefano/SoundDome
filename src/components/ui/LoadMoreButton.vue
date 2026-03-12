<script setup lang="ts">
defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button class="load-more-btn" :disabled="disabled" @click="emit('click')">
    <slot>Load more</slot>
  </button>
</template>

<style scoped>
.load-more-btn {
  display: block;
  margin: 20px auto 0;
  padding: 8px 24px;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.load-more-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.load-more-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
</style>
