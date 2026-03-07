<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import _ from 'lodash';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

const HOT_ZONE_RATIO = 0.15;
const MAX_SPEED_RATIO = 0.005;
const DRAG_ZOOM_VIEWPORT_RATIO = 0.5;
const SCROLL_SHIFT_MULTIPLIER = 0.5;
const ZOOM_STEP = 20;
const ZOOM_MAX = 500;
const REGION_OPACITY_HEX = '26';
const MIN_SPEED_FACTOR = 0.2;

export interface WaveformEditorLabels {
  start?: string;
  end?: string;
  duration?: string;
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
  accentColor: '#1db954',
  waveColor: '#555',
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
const startTime = ref(0);
const endTime = ref(0);
const duration = ref(0);

let wavesurfer: WaveSurfer | null = null;
let regionsPlugin: RegionsPlugin | null = null;
let activeRegion: ReturnType<RegionsPlugin['addRegion']> | null = null;
let draggingSide: 'start' | 'end' | 'drag' | null = null;
let scrollRaf = 0;
let zoomBeforeDrag = 0;
let inHotZone = false;
let lastMouseX = 0;
let prevMouseX = 0;
let freshMouse = false;

let origOnMove: ((dx: number) => void) | null = null;
let origOnResize: ((dx: number, side: string) => void) | null = null;

const zoomLevel = ref(0);

// --- Utilities ---

function formatTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const minutes = Math.floor(clamped / 60);
  const secs = (clamped % 60).toFixed(2);
  return `${minutes}:${secs.padStart(5, '0')}`;
}

function parseTime(input: string): number {
  const parts = input.split(':');
  if (parts.length === 2) {
    return Math.max(0, Number(parts[0]) * 60 + Number(parts[1]));
  }
  return Math.max(0, Number(input) || 0);
}

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

// --- Scroll element access ---

function getScrollEl(): HTMLElement | null {
  const shadow = waveformRef.value?.querySelector('div')?.shadowRoot;
  return shadow?.querySelector('.scroll') as HTMLElement | null;
}

// --- Drag cursor ---

function setDragCursor(side: 'start' | 'end' | 'drag' | null) {
  if (side === 'start' || side === 'end') {
    document.body.style.cursor = 'ew-resize';
  } else if (side === 'drag') {
    document.body.style.cursor = 'grabbing';
  } else {
    document.body.style.cursor = '';
  }
}

// --- Mouse tracking ---

function onMouseTrack(e: PointerEvent) {
  if (!freshMouse) {
    lastMouseX = e.clientX;
    prevMouseX = e.clientX;
    freshMouse = true;
    return;
  }
  prevMouseX = lastMouseX;
  lastMouseX = e.clientX;
}

// --- Region input blocking (during auto-scroll) ---

function blockRegionInput() {
  if (!activeRegion || origOnMove) return;
  const r = activeRegion as any;
  origOnMove = r.onMove.bind(r);
  origOnResize = r.onResize.bind(r);
  r.onMove = () => {};
  r.onResize = () => {};
}

function restoreRegionInput() {
  if (!activeRegion || !origOnMove) return;
  const r = activeRegion as any;
  r.onMove = origOnMove;
  r.onResize = origOnResize;
  origOnMove = null;
  origOnResize = null;
}

// --- Selection sync ---

function emitSelection() {
  emit('update:selection', { start: startTime.value, end: endTime.value });
}

// --- Auto-scroll during drag ---

function startAutoScroll() {
  cancelAnimationFrame(scrollRaf);
  freshMouse = false;
  document.addEventListener('pointermove', onMouseTrack);
  setDragCursor(draggingSide);

  function tick() {
    if (!draggingSide || !activeRegion || !duration.value) return;

    const scrollEl = getScrollEl();
    if (!scrollEl) { scrollRaf = requestAnimationFrame(tick); return; }

    const clientW = scrollEl.clientWidth;
    const scrollW = scrollEl.scrollWidth;
    if (scrollW <= clientW) { scrollRaf = requestAnimationFrame(tick); return; }

    const hotZone = clientW * HOT_ZONE_RATIO;
    const maxSpeed = scrollW * MAX_SPEED_RATIO;

    const rect = scrollEl.getBoundingClientRect();
    const mouseInContainer = lastMouseX - rect.left;
    const rightBoundary = clientW - hotZone;

    const canScrollRight = scrollEl.scrollLeft < scrollW - clientW - 0.5;
    const canScrollLeft = scrollEl.scrollLeft > 0.5;

    let scrollDir: 'left' | 'right' | null = null;
    let t = 0;

    if (inHotZone) {
      if (mouseInContainer > rightBoundary && canScrollRight) {
        scrollDir = 'right';
        t = Math.min((mouseInContainer - rightBoundary) / hotZone, 1);
      } else if (mouseInContainer < hotZone && canScrollLeft) {
        scrollDir = 'left';
        t = Math.min((hotZone - mouseInContainer) / hotZone, 1);
      }
    } else {
      const mouseDelta = lastMouseX - prevMouseX;
      const edges = draggingSide === 'drag' ? (['start', 'end'] as const) : draggingSide ? [draggingSide] : [];
      for (const edge of edges) {
        const time = edge === 'start' ? activeRegion.start : activeRegion.end;
        const px = (time / duration.value) * scrollW;
        const distFromRight = (scrollEl.scrollLeft + clientW) - px;
        const distFromLeft = px - scrollEl.scrollLeft;

        if (distFromRight < hotZone && mouseDelta > 0 && canScrollRight) {
          scrollDir = 'right';
          t = Math.min((hotZone - distFromRight) / hotZone, 1);
          break;
        } else if (distFromLeft < hotZone && mouseDelta < 0 && canScrollLeft) {
          scrollDir = 'left';
          t = Math.min((hotZone - distFromLeft) / hotZone, 1);
          break;
        }
      }
    }

    if (scrollDir) {
      if (!inHotZone) {
        inHotZone = true;
        blockRegionInput();
      }

      const speed = (MIN_SPEED_FACTOR + t * (1 - MIN_SPEED_FACTOR)) * maxSpeed;

      const scrollBefore = scrollEl.scrollLeft;
      if (scrollDir === 'right') {
        scrollEl.scrollLeft += speed;
      } else {
        scrollEl.scrollLeft -= speed;
      }
      const scrollDelta = scrollEl.scrollLeft - scrollBefore;
      const timeDelta = (scrollDelta / scrollW) * duration.value;

      if (timeDelta !== 0) {
        const newStart = Math.max(0, activeRegion.start + timeDelta);
        const newEnd = Math.min(duration.value, activeRegion.end + timeDelta);
        if (draggingSide === 'drag') {
          if (newEnd <= duration.value && newStart >= 0) {
            activeRegion.setOptions({ start: newStart, end: newEnd });
          }
        } else if (draggingSide === 'end') {
          activeRegion.setOptions({ end: newEnd });
        } else if (draggingSide === 'start') {
          activeRegion.setOptions({ start: newStart });
        }
        startTime.value = roundToHundredths(activeRegion.start);
        endTime.value = roundToHundredths(activeRegion.end);
      }
    } else if (inHotZone) {
      inHotZone = false;

      const timeAtMouse = ((scrollEl.scrollLeft + mouseInContainer) / scrollW) * duration.value;
      const clampedTime = _.clamp(timeAtMouse, 0, duration.value);

      if (draggingSide === 'end') {
        const newEnd = Math.max(activeRegion.start + props.minDuration, clampedTime);
        activeRegion.setOptions({ end: newEnd });
      } else if (draggingSide === 'start') {
        const newStart = Math.min(activeRegion.end - props.minDuration, clampedTime);
        activeRegion.setOptions({ start: newStart });
      } else if (draggingSide === 'drag') {
        const regionLen = activeRegion.end - activeRegion.start;
        const mid = clampedTime;
        let newStart = mid - regionLen / 2;
        let newEnd = mid + regionLen / 2;
        if (newStart < 0) { newStart = 0; newEnd = regionLen; }
        if (newEnd > duration.value) { newEnd = duration.value; newStart = duration.value - regionLen; }
        activeRegion.setOptions({ start: newStart, end: newEnd });
      }
      startTime.value = roundToHundredths(activeRegion.start);
      endTime.value = roundToHundredths(activeRegion.end);

      restoreRegionInput();
    }

    scrollRaf = requestAnimationFrame(tick);
  }

  scrollRaf = requestAnimationFrame(tick);
}

function stopAutoScroll() {
  cancelAnimationFrame(scrollRaf);
  document.removeEventListener('pointermove', onMouseTrack);
  if (inHotZone) restoreRegionInput();
  inHotZone = false;
  draggingSide = null;
  setDragCursor(null);
}

// --- Zoom (mouse wheel) ---

function onWheel(e: WheelEvent) {
  if (!wavesurfer || !duration.value) return;
  e.preventDefault();
  const scrollEl = getScrollEl();
  if (!scrollEl) return;

  if (e.shiftKey) {
    scrollEl.scrollLeft += e.deltaY * SCROLL_SHIFT_MULTIPLIER;
    return;
  }

  const rect = scrollEl.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const scrollW = scrollEl.scrollWidth;
  const timeAtMouse = ((scrollEl.scrollLeft + mouseX) / scrollW) * duration.value;

  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  zoomLevel.value = _.clamp(zoomLevel.value + delta, 0, ZOOM_MAX);
  wavesurfer.zoom(zoomLevel.value);

  const newScrollW = scrollEl.scrollWidth;
  const newPx = (timeAtMouse / duration.value) * newScrollW;
  scrollEl.scrollLeft = newPx - mouseX;
}

// --- WaveSurfer lifecycle ---

function destroyWavesurfer() {
  stopAutoScroll();
  zoomLevel.value = 0;
  if (wavesurfer) {
    wavesurfer.destroy();
    wavesurfer = null;
    regionsPlugin = null;
    activeRegion = null;
  }
}

function injectShadowStyles(accentColor: string) {
  const shadow = waveformRef.value?.querySelector('div')?.shadowRoot;
  if (!shadow) return;
  const style = document.createElement('style');
  style.textContent = `
    .scroll::-webkit-scrollbar { height: 6px; }
    .scroll::-webkit-scrollbar-track { background: transparent; }
    .scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    .scroll::-webkit-scrollbar-thumb:hover { background: #888; }
    [part~="region-handle"] {
      border-color: ${accentColor} !important;
      background: ${accentColor}4d !important;
    }
    [part~="region-handle"]:hover {
      background: ${accentColor}80 !important;
    }
  `;
  shadow.appendChild(style);
}

async function initWavesurfer() {
  destroyWavesurfer();
  await nextTick();

  if (!waveformRef.value || !props.src) return;

  const accentColor = props.accentColor;
  const regionColor = accentColor + REGION_OPACITY_HEX;

  regionsPlugin = RegionsPlugin.create();

  wavesurfer = WaveSurfer.create({
    container: waveformRef.value,
    waveColor: props.waveColor,
    progressColor: accentColor,
    cursorColor: accentColor,
    height: props.height,
    barWidth: props.barWidth,
    barGap: props.barGap,
    barRadius: props.barRadius,
    normalize: true,
    interact: false,
    hideScrollbar: false,
    plugins: [regionsPlugin],
  });

  wavesurfer.on('ready', () => {
    injectShadowStyles(accentColor);

    duration.value = wavesurfer!.getDuration();
    endTime.value = duration.value;
    startTime.value = 0;

    activeRegion = regionsPlugin!.addRegion({
      start: 0,
      end: duration.value,
      color: regionColor,
      drag: true,
      resize: true,
      minLength: props.minDuration,
    });

    activeRegion.on('update', (side) => {
      if (!activeRegion) return;
      startTime.value = roundToHundredths(_.clamp(activeRegion.start, 0, duration.value));
      endTime.value = roundToHundredths(_.clamp(activeRegion.end, 0, duration.value));
      if (!draggingSide) {
        draggingSide = side ?? 'drag';
        if (draggingSide === 'drag' && zoomLevel.value > 0) {
          zoomBeforeDrag = zoomLevel.value;
          const scrollEl = getScrollEl();
          if (scrollEl && duration.value) {
            const selDuration = activeRegion.end - activeRegion.start;
            const clientW = scrollEl.clientWidth;
            const dragZoom = Math.max((clientW * DRAG_ZOOM_VIEWPORT_RATIO) / selDuration, clientW / duration.value);
            if (dragZoom < zoomLevel.value) {
              zoomLevel.value = dragZoom;
              wavesurfer!.zoom(dragZoom);
              nextTick(() => {
                const el = getScrollEl();
                if (!el || !activeRegion || !duration.value) return;
                const mid = ((activeRegion.start + activeRegion.end) / 2 / duration.value) * el.scrollWidth;
                el.scrollLeft = mid - clientW / 2;
              });
            }
          }
        }
        startAutoScroll();
      }
    });

    activeRegion.on('update-end', () => {
      const wasDrag = draggingSide === 'drag';
      stopAutoScroll();
      if (!activeRegion) return;
      const clampedStart = roundToHundredths(_.clamp(activeRegion.start, 0, duration.value));
      const clampedEnd = roundToHundredths(_.clamp(activeRegion.end, 0, duration.value));
      startTime.value = clampedStart;
      endTime.value = clampedEnd;
      activeRegion.setOptions({ start: clampedStart, end: clampedEnd });
      if (wasDrag) {
        zoomBeforeDrag = 0;
      }
      emitSelection();
    });

    emit('ready', duration.value);
    emitSelection();
  });

  wavesurfer.load(props.src);
}

// --- Time input handlers ---

function syncRegion(field: 'start' | 'end') {
  if (!activeRegion) return;
  activeRegion.setOptions({
    [field]: field === 'start' ? startTime.value : endTime.value,
  });
  emitSelection();
}

function onStartChange(e: Event) {
  const parsed = parseTime((e.target as HTMLInputElement).value);
  startTime.value = _.clamp(parsed, 0, endTime.value - props.minDuration);
  syncRegion('start');
}

function onEndChange(e: Event) {
  const parsed = parseTime((e.target as HTMLInputElement).value);
  endTime.value = _.clamp(parsed, startTime.value + props.minDuration, duration.value);
  syncRegion('end');
}

// --- Public API ---

async function reload() {
  await initWavesurfer();
}

function setSelection(start: number, end: number) {
  startTime.value = roundToHundredths(_.clamp(start, 0, duration.value));
  endTime.value = roundToHundredths(_.clamp(end, 0, duration.value));
  if (activeRegion) {
    activeRegion.setOptions({ start: startTime.value, end: endTime.value });
  }
  emitSelection();
}

defineExpose({ startTime, endTime, duration, reload, setSelection });

// --- Lifecycle ---

watch(() => props.src, (newSrc) => {
  if (newSrc) initWavesurfer();
});

onMounted(() => {
  if (props.src) initWavesurfer();
  waveformRef.value?.addEventListener('wheel', onWheel, { passive: false });
});

onBeforeUnmount(() => {
  waveformRef.value?.removeEventListener('wheel', onWheel);
  destroyWavesurfer();
});
</script>

<template>
  <div class="waveform-editor">
    <div ref="waveformRef" class="waveform-editor__canvas" />

    <div class="waveform-editor__controls">
      <label class="waveform-editor__field">
        <span>{{ labels.start ?? 'Start' }}</span>
        <input
          type="text"
          :value="formatTime(startTime)"
          @change="onStartChange"
        />
      </label>
      <label class="waveform-editor__field">
        <span>{{ labels.end ?? 'End' }}</span>
        <input
          type="text"
          :value="formatTime(endTime)"
          @change="onEndChange"
        />
      </label>
      <div class="waveform-editor__duration">
        <span>{{ labels.duration ?? 'Duration' }}</span>
        <span class="waveform-editor__duration-value">{{ formatTime(endTime - startTime) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.waveform-editor {
  --_accent: v-bind(accentColor);
  --_wave: v-bind(waveColor);
  --_bg: var(--waveform-bg, #121212);
  --_text: var(--waveform-text, #fff);
  --_text-dim: var(--waveform-text-dim, #999);
  --_input-bg: var(--waveform-input-bg, #252525);
  --_border: var(--waveform-border, #333);
}

.waveform-editor__canvas {
  background: var(--_bg);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 16px;
  min-height: 100px;
}

.waveform-editor__controls {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.waveform-editor__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
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
}

.waveform-editor__duration span {
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
