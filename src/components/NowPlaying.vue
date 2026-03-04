<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue';
import { useAudio } from '../composables/useAudio';

const { playingName, previewingName, stopBrowse, stopAll, stopPreview } = useAudio();

const current = computed(() => {
  if (playingName.value) return { name: playingName.value, type: 'routed' as const };
  if (previewingName.value) return { name: previewingName.value, type: 'preview' as const };
  return null;
});

function onStop() {
  if (current.value?.type === 'preview') {
    stopPreview();
  } else {
    stopBrowse();
    stopAll();
  }
}

// Drag logic
const posX = ref<number | null>(null);
const posY = ref<number | null>(null);
const dragging = ref(false);
let dragStartX = 0;
let dragStartY = 0;
let elStartX = 0;
let elStartY = 0;
let didDrag = false;
let elW = 280;
let elH = 48;

function onPointerDown(e: PointerEvent) {
  dragging.value = true;
  didDrag = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  const el = (e.currentTarget as HTMLElement).closest('.now-playing') as HTMLElement;
  const rect = el.getBoundingClientRect();
  elStartX = rect.left;
  elStartY = rect.top;
  elW = rect.width;
  elH = rect.height;
  el.setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;
  posX.value = Math.max(0, Math.min(window.innerWidth - elW, elStartX + dx));
  posY.value = Math.max(0, Math.min(window.innerHeight - elH, elStartY + dy));
}

function onPointerUp() {
  dragging.value = false;
}

function onClick() {
  if (!didDrag) onStop();
}

function resetPosition() {
  posX.value = null;
  posY.value = null;
}

const style = computed(() => {
  if (posX.value !== null && posY.value !== null) {
    return {
      top: posY.value + 'px',
      left: posX.value + 'px',
      right: 'auto',
      bottom: 'auto',
    };
  }
  return {};
});

onBeforeUnmount(() => {
  dragging.value = false;
});
</script>

<template>
  <Transition name="nowplaying" @after-leave="resetPosition">
    <div
      v-if="current"
      class="now-playing"
      :class="[current.type, { dragging }]"
      :style="style"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @click="onClick"
    >
      <div
        class="now-playing-grip"
        @pointerdown.stop="onPointerDown"
        @dblclick.stop="resetPosition"
      >
        <span /><span /><span /><span /><span /><span />
      </div>
      <div class="now-playing-icon">
        <svg v-if="current.type === 'routed'" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        <svg v-else viewBox="0 0 24 24"><path d="M12 1C7.03 1 3 5.03 3 10v6c0 1.66 1.34 3 3 3h1v-7H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-2v7h1c1.66 0 3-1.34 3-3v-6c0-4.97-4.03-9-9-9zM7 14v4H6c-.55 0-1-.45-1-1v-3h2zm12 3c0 .55-.45 1-1 1h-1v-4h2v3z"/></svg>
      </div>
      <div class="now-playing-name">{{ current.name }}</div>
      <button class="now-playing-stop" @click.stop="onStop">
        <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.now-playing {
  position: fixed;
  top: 16px;
  right: 16px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--card-radius);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: default;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  max-width: 280px;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  user-select: none;
  touch-action: none;
}

.now-playing.dragging {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.now-playing-grip {
  display: grid;
  grid-template-columns: repeat(2, 4px);
  grid-template-rows: repeat(3, 4px);
  gap: 2px;
  cursor: grab;
  padding: 2px 0;
}

.now-playing.dragging .now-playing-grip {
  cursor: grabbing;
}

.now-playing-grip span {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-text-dimmer);
}

.now-playing:hover {
  background: var(--color-bg-card-hover);
  border-color: var(--color-error, #e53935);
}

.now-playing-icon {
  display: flex;
  align-items: center;
}

.now-playing-icon svg {
  width: 16px;
  height: 16px;
  fill: var(--color-accent);
}

.now-playing.preview .now-playing-icon svg {
  fill: var(--color-text-muted);
}

.now-playing-name {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.now-playing-stop {
  border: none;
  background: var(--color-error, #e53935);
  color: #fff;
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.now-playing-stop:hover {
  background: #c62828;
}

.now-playing-stop svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

/* Transition */
.nowplaying-enter-active,
.nowplaying-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.nowplaying-enter-from,
.nowplaying-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
