<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue';
import AppIcon from '../ui/AppIcon.vue';
import _ from 'lodash';
import { useAudio } from '../../composables/useAudio';
import { PlaybackType } from '../../enums/playback';
import { DRAG_THRESHOLD } from '../../enums/constants';

const { playingName, previewingName, stopBrowse, stopAll, stopPreview } = useAudio();

const current = computed(() => {
  if (playingName.value) return { name: playingName.value, type: PlaybackType.ROUTED };
  if (previewingName.value) return { name: previewingName.value, type: PlaybackType.PREVIEW };
  return null;
});

function onStop() {
  if (current.value?.type === PlaybackType.PREVIEW) {
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
  if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) didDrag = true;
  posX.value = _.clamp(elStartX + dx, 0, window.innerWidth - elW);
  posY.value = _.clamp(elStartY + dy, 0, window.innerHeight - elH);
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
        <AppIcon v-if="current.type === PlaybackType.ROUTED" name="volume-high" />
        <AppIcon v-else name="headphones" />
      </div>
      <div class="now-playing-name">{{ current.name }}</div>
      <button class="now-playing-stop" @click.stop="onStop">
        <AppIcon name="stop" />
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
