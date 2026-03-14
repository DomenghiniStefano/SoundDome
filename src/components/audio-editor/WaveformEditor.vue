<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import _ from 'lodash';
import { useWaveformRegion } from '@/composables/useWaveformRegion';
import { useWaveformAutoScroll } from '@/composables/useWaveformAutoScroll';
import { useWaveformZoom } from '@/composables/useWaveformZoom';
import { formatTime, parseTime } from '@/utils/time';

export interface WaveformEditorLabels {
  start?: string;
  end?: string;
  duration?: string;
  reset?: string;
  fit?: string;
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
  onSelectionUpdate: (sel) => emit('update:selection', sel),
  onDragStart: (side) => autoScroll.start(side),
  onDragEnd: (wasDrag) => autoScroll.stop(),
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

const resetLabel = computed(() => props.labels.reset ?? 'Reset');
const fitLabel = computed(() => props.labels.fit ?? 'Fit');

function onReset() {
  region.setSelection(0, region.duration.value);
}

function onZoomReset() {
  region.zoomLevel.value = 0;
  region.getWavesurfer()?.zoom(0);
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

    <button
      v-if="region.zoomLevel.value > 0"
      class="waveform-editor__zoom-reset"
      :title="fitLabel"
      @click="onZoomReset"
    >
      &#x2194; {{ fitLabel }}
    </button>

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
        <div class="waveform-editor__duration-row">
          <span class="waveform-editor__duration-value">{{ formatTime(region.endTime.value - region.startTime.value) }}</span>
          <button
            v-if="!isFullSelection"
            class="waveform-editor__reset-btn"
            :title="resetLabel"
            @click="onReset"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 1 1 .908-.418A6 6 0 1 1 8 2v1z"/>
              <path d="M8 1v3.5l2.5-1.75L8 1z"/>
            </svg>
          </button>
        </div>
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
  margin-bottom: 16px;
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

.waveform-editor__duration span {
  font-size: 0.7rem;
  color: var(--_text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.waveform-editor__duration-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.waveform-editor__duration-value {
  font-size: 0.8rem;
  font-family: monospace;
  color: var(--_accent);
  padding: 6px 0;
}

.waveform-editor__reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--_text-dim);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.waveform-editor__reset-btn:hover {
  color: var(--_accent);
  background: var(--_input-bg);
}

.waveform-editor__zoom-reset {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  margin-bottom: 8px;
  padding: 2px 8px;
  font-size: 0.7rem;
  color: var(--_text-dim);
  background: var(--_input-bg);
  border: 1px solid var(--_border);
  border-radius: 10px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.waveform-editor__zoom-reset:hover {
  color: var(--_accent);
  border-color: var(--_accent);
}
</style>
