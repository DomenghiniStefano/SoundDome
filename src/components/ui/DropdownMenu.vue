<script setup lang="ts">
import { ref, onUnmounted, nextTick } from 'vue';
import IconButton from './IconButton.vue';

const EDGE_PAD = 4;

const open = ref(false);
const panelRef = ref<HTMLElement>();
const triggerRef = ref<HTMLElement>();

function positionPanel() {
  const panel = panelRef.value;
  if (!panel) return;

  // Reset so we can measure natural size
  panel.style.top = '';
  panel.style.bottom = '';
  panel.style.left = '';
  panel.style.right = '';
  panel.style.maxHeight = '';

  const triggerEl = (triggerRef.value as any)?.$el ?? triggerRef.value;
  if (!triggerEl) return;

  const triggerRect = triggerEl.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  // Vertical: prefer below trigger, flip above if no room
  const spaceBelow = vh - triggerRect.bottom - EDGE_PAD;
  const spaceAbove = triggerRect.top - EDGE_PAD;
  const fitsBelow = panelRect.height <= spaceBelow;
  const fitsAbove = panelRect.height <= spaceAbove;

  if (fitsBelow) {
    panel.style.top = `${triggerRect.bottom + 4}px`;
  } else if (fitsAbove) {
    panel.style.top = `${triggerRect.top - panelRect.height - 4}px`;
  } else {
    // Neither fits — use the bigger side and constrain height
    if (spaceBelow >= spaceAbove) {
      panel.style.top = `${triggerRect.bottom + 4}px`;
      panel.style.maxHeight = `${spaceBelow}px`;
    } else {
      panel.style.top = `${triggerRect.top - panelRect.height - 4}px`;
      panel.style.maxHeight = `${spaceAbove}px`;
    }
  }

  // Horizontal: prefer right-aligned to trigger
  const rightAlignedLeft = triggerRect.right - panelRect.width;
  if (rightAlignedLeft >= EDGE_PAD) {
    panel.style.left = `${rightAlignedLeft}px`;
  } else {
    // Flip: left-align to trigger
    panel.style.left = `${Math.max(EDGE_PAD, Math.min(triggerRect.left, vw - EDGE_PAD - panelRect.width))}px`;
  }
}

function toggle() {
  if (open.value) {
    close();
  } else {
    open.value = true;
    nextTick(() => {
      positionPanel();
      document.addEventListener('click', onClickOutside, true);
    });
  }
}

function close() {
  open.value = false;
  document.removeEventListener('click', onClickOutside, true);
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as Node;
  const triggerEl = (triggerRef.value as any)?.$el ?? triggerRef.value;
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
  position: fixed;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--bg-overlay-light);
  z-index: 1000;
  min-width: 160px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-surface-active) transparent;
}

.dropdown-panel::-webkit-scrollbar {
  width: 4px;
}

.dropdown-panel::-webkit-scrollbar-track {
  background: transparent;
}

.dropdown-panel::-webkit-scrollbar-thumb {
  background: var(--bg-surface-active);
  border-radius: 2px;
}
</style>
