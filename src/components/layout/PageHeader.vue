<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

defineProps<{
  title: string;
  subtitle?: string;
}>();

const scrolled = ref(false);

function onScroll(e: Event) {
  const target = e.target as HTMLElement;
  scrolled.value = target.scrollTop > 0;
}

onMounted(() => {
  const scrollParent = document.querySelector('.main-content');
  scrollParent?.addEventListener('scroll', onScroll);
});

onUnmounted(() => {
  const scrollParent = document.querySelector('.main-content');
  scrollParent?.removeEventListener('scroll', onScroll);
});
</script>

<template>
  <div class="page-header" :class="{ scrolled }">
    <div>
      <h2 class="page-title">{{ title }}</h2>
      <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
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
  margin: -40px -48px 0;
  padding: 40px 48px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-bg);
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.page-header.scrolled {
  border-color: var(--color-border);
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
