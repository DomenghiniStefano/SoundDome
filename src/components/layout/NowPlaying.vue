<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '../ui/AppIcon.vue';
import { useAudio } from '../../composables/useAudio';
import { useDraggable } from '../../composables/useDraggable';
import { PlaybackType } from '../../enums/playback';

const { playingName, previewingName, stopPlayback, stopTest, stopPreview } = useAudio();
const { containerRef, dragging, style, onPointerDown, onPointerMove, onPointerUp, wasDragged, resetPosition } = useDraggable();

const current = computed(() => {
  if (playingName.value) return { name: playingName.value, type: PlaybackType.ROUTED };
  if (previewingName.value) return { name: previewingName.value, type: PlaybackType.PREVIEW };
  return null;
});

function onStop() {
  if (current.value?.type === PlaybackType.PREVIEW) {
    stopPreview();
  } else {
    stopPlayback();
    stopTest();
  }
}

function onClick() {
  if (!wasDragged()) onStop();
}
</script>

<template>
  <Transition name="nowplaying" @after-leave="resetPosition">
    <div
      v-if="current"
      ref="containerRef"
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
  top: 48px;
  right: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--card-radius);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: default;
  box-shadow: 0 4px 20px var(--bg-overlay-light);
  z-index: 1000;
  max-width: 280px;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  user-select: none;
  touch-action: none;
}

.now-playing.dragging {
  box-shadow: 0 8px 32px var(--bg-overlay);
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
  background: var(--text-tertiary);
}

.now-playing:hover {
  background: var(--bg-card-hover);
  border-color: var(--color-error);
}

.now-playing-icon {
  display: flex;
  align-items: center;
}

.now-playing-icon svg {
  width: 16px;
  height: 16px;
  fill: var(--accent);
}

.now-playing.preview .now-playing-icon svg {
  fill: var(--text-secondary);
}

.now-playing-name {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.now-playing-stop {
  border: none;
  background: var(--color-error);
  color: var(--text-inverse);
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
  background: var(--btn-danger-bg);
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
