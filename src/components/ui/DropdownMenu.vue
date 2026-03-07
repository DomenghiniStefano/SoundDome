<script setup lang="ts">
import { ref, onUnmounted, nextTick } from 'vue';
import IconButton from './IconButton.vue';

const open = ref(false);
const panelRef = ref<HTMLElement>();
const triggerRef = ref<HTMLElement>();

function toggle() {
  if (open.value) {
    close();
  } else {
    open.value = true;
    nextTick(() => document.addEventListener('click', onClickOutside, true));
  }
}

function close() {
  open.value = false;
  document.removeEventListener('click', onClickOutside, true);
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as Node;
  const triggerEl = triggerRef.value?.$el ?? triggerRef.value;
  if (panelRef.value?.contains(target) || triggerEl?.contains(target)) return;
  close();
}

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside, true);
});

defineExpose({ close });
</script>

<template>
  <div class="dropdown-menu-wrapper">
    <IconButton
      ref="triggerRef"
      icon="kebab"
      :active="open"
      compact
      @click.stop="toggle"
    />
    <div v-if="open" ref="panelRef" class="dropdown-panel" @click.stop>
      <slot :close="close" />
    </div>
  </div>
</template>

<style scoped>
.dropdown-menu-wrapper {
  position: relative;
}

.dropdown-panel {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border, #333);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 10;
  min-width: 160px;
  overflow: hidden;
}
</style>
