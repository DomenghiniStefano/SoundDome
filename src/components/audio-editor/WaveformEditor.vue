<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import _ from 'lodash';
import AppIcon from '@/components/ui/AppIcon.vue';
import { useWaveformRegion } from '@/composables/useWaveformRegion';
import { useWaveformAutoScroll } from '@/composables/useWaveformAutoScroll';
import { useWaveformZoom } from '@/composables/useWaveformZoom';
import { useWaveformHistory } from '@/composables/useWaveformHistory';
import { formatTime, parseTime } from '@/utils/time';

export interface WaveformEditorLabels {
  start?: string;
  end?: string;
  duration?: string;
  reset?: string;
  fit?: string;
  undo?: string;
  redo?: string;
}

const props = withDefaults(defineProps<{
  src: string;
  accentColor?: string;
  waveColor?: string;
  height?: number;
  minDuration?: number;
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
  labels?: WaveformEditorLabels;
}>(), {
  accentColor: () => getComputedStyle(document.documentElement).getPropertyValue('--waveform-progress').trim() || '#1db954',
  waveColor: () => getComputedStyle(document.documentElement).getPropertyValue('--waveform-wave').trim() || '#555',
  height: 100,
  minDuration: 0.1,
  barWidth: 2,
  barGap: 1,
  barRadius: 2,
  labels: () => ({ start: 'Start', end: 'End', duration: 'Duration' }),
});

const emit = defineEmits<{
  ready: [duration: number];
  'update:selection': [selection: { start: number; end: number }];
}>();

const waveformRef = ref<HTMLDivElement>();

const history = useWaveformHistory();

const region = useWaveformRegion({
  waveformRef,
  accentColor: () => props.accentColor,
  waveColor: () => props.waveColor,
  height: () => props.height,
  barWidth: () => props.barWidth,
  barGap: () => props.barGap,
  barRadius: () => props.barRadius,
  minDuration: () => props.minDuration,
  onReady: (dur) => emit('ready', dur),
  onSelectionUpdate: (sel) => {
    history.push(sel.start, sel.end);
    emit('update:selection', sel);
  },
  onDragStart: (side) => autoScroll.start(side),
  onDragEnd: () => autoScroll.stop(),
});

const autoScroll = useWaveformAutoScroll({
  getActiveRegion: region.getActiveRegion,
  getScrollEl: region.getScrollEl,
  duration: region.duration,
  startTime: region.startTime,
  endTime: region.endTime,
  minDuration: () => props.minDuration,
});

const zoom = useWaveformZoom({
  getWavesurfer: region.getWavesurfer,
  getScrollEl: region.getScrollEl,
  duration: region.duration,
  zoomLevel: region.zoomLevel,
});

function onStartChange(e: Event) {
  const parsed = parseTime((e.target as HTMLInputElement).value);
  region.startTime.value = _.clamp(parsed, 0, region.endTime.value - props.minDuration);
  region.syncRegionFromInput('start');
}

function onEndChange(e: Event) {
  const parsed = parseTime((e.target as HTMLInputElement).value);
  region.endTime.value = _.clamp(parsed, region.startTime.value + props.minDuration, region.duration.value);
  region.syncRegionFromInput('end');
}

const isFullSelection = computed(() => {
  return region.startTime.value === 0 && region.endTime.value >= region.duration.value;
});

const isZoomed = computed(() => region.zoomLevel.value > 0);

function onReset() {
  region.setSelection(0, region.duration.value);
}

function onZoomReset() {
  region.zoomLevel.value = 0;
  region.getWavesurfer()?.zoom(0);
}

function onUndo() {
  const entry = history.undo();
  if (!entry) return;
  region.setSelectionSilent(entry.start, entry.end);
  emit('update:selection', { start: entry.start, end: entry.end });
}

function onRedo() {
  const entry = history.redo();
  if (!entry) return;
  region.setSelectionSilent(entry.start, entry.end);
  emit('update:selection', { start: entry.start, end: entry.end });
}

async function reload() {
  await region.init(props.src);
}

defineExpose({
  startTime: region.startTime,
  endTime: region.endTime,
  duration: region.duration,
  reload,
  setSelection: region.setSelection,
});

watch(() => props.src, (newSrc) => {
  if (newSrc) region.init(newSrc);
});

onMounted(() => {
  if (props.src) region.init(props.src);
});

onBeforeUnmount(() => {
  autoScroll.cleanup();
  region.destroy();
});
</script>

<template>
  <div class="waveform-editor">
    <div ref="waveformRef" class="waveform-editor__canvas" @wheel.prevent="zoom.onWheel">
      <div v-if="region.loading.value" class="waveform-editor__loading">
        <div class="waveform-editor__loading-spinner" />
      </div>
    </div>

    <div class="waveform-editor__toolbar">
      <button
        class="waveform-editor__tool-btn"
        :disabled="!history.canUndo.value"
        :title="labels.undo ?? 'Undo'"
        @click="onUndo"
      >
        <AppIcon name="undo" />
      </button>

      <button
        class="waveform-editor__tool-btn"
        :disabled="!history.canRedo.value"
        :title="labels.redo ?? 'Redo'"
        @click="onRedo"
      >
        <AppIcon name="redo" />
      </button>

      <div class="waveform-editor__toolbar-sep" />

      <button
        class="waveform-editor__tool-btn"
        :class="{ active: !isFullSelection }"
        :disabled="isFullSelection"
        :title="labels.reset ?? 'Reset selection'"
        @click="onReset"
      >
        <AppIcon name="select-all" />
      </button>

      <button
        class="waveform-editor__tool-btn"
        :class="{ active: isZoomed }"
        :disabled="!isZoomed"
        :title="labels.fit ?? 'Fit to view'"
        @click="onZoomReset"
      >
        <AppIcon name="fit-view" />
      </button>
    </div>

    <div class="waveform-editor__controls">
      <label class="waveform-editor__field">
        <span>{{ labels.start ?? 'Start' }}</span>
        <input
          type="text"
          :value="formatTime(region.startTime.value)"
          @change="onStartChange"
        />
      </label>
      <label class="waveform-editor__field">
        <span>{{ labels.end ?? 'End' }}</span>
        <input
          type="text"
          :value="formatTime(region.endTime.value)"
          @change="onEndChange"
        />
      </label>
      <div class="waveform-editor__duration">
        <span>{{ labels.duration ?? 'Duration' }}</span>
        <span class="waveform-editor__duration-value">{{ formatTime(region.endTime.value - region.startTime.value) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.waveform-editor {
  --_accent: v-bind(accentColor);
  --_wave: v-bind(waveColor);
  --_bg: var(--waveform-bg, var(--bg-primary));
  --_text: var(--waveform-text, var(--text-inverse));
  --_text-dim: var(--waveform-text-dim, var(--text-secondary));
  --_input-bg: var(--waveform-input-bg, var(--bg-input));
  --_border: var(--waveform-border, var(--border-default));
}

.waveform-editor__canvas {
  background: var(--_bg);
  border-radius: 8px;
  padding: 8px;
  min-height: 100px;
  position: relative;
}

.waveform-editor__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.waveform-editor__loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--_text-dim);
  border-top-color: var(--_accent);
  border-radius: 50%;
  animation: waveform-spin 0.8s linear infinite;
  opacity: 0.6;
}

@keyframes waveform-spin {
  to { transform: rotate(360deg); }
}

.waveform-editor__toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 0;
}

.waveform-editor__toolbar-sep {
  width: 1px;
  height: 16px;
  background: var(--_border);
  margin: 0 4px;
}

.waveform-editor__tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--_text-dim);
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s, opacity 0.15s;
}

.waveform-editor__tool-btn:hover:not(:disabled) {
  color: var(--_text);
  background: var(--_input-bg);
  border-color: var(--_border);
}

.waveform-editor__tool-btn.active {
  color: var(--_accent);
  border-color: var(--_accent);
}

.waveform-editor__tool-btn.active:hover:not(:disabled) {
  background: var(--_input-bg);
  border-color: var(--_accent);
}

.waveform-editor__tool-btn:disabled {
  opacity: 0.25;
  cursor: default;
}

.waveform-editor__controls {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.waveform-editor__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 100px;
}

.waveform-editor__field span {
  font-size: 0.7rem;
  color: var(--_text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.waveform-editor__field input {
  background: var(--_input-bg);
  border: 1px solid var(--_border);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--_text);
  font-size: 0.8rem;
  font-family: monospace;
  outline: none;
  transition: border-color 0.15s;
}

.waveform-editor__field input:focus {
  border-color: var(--_accent);
}

.waveform-editor__duration {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 100px;
}

.waveform-editor__duration > span {
  font-size: 0.7rem;
  color: var(--_text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.waveform-editor__duration-value {
  font-size: 0.8rem;
  font-family: monospace;
  color: var(--_accent);
  padding: 6px 0;
}
</style>
