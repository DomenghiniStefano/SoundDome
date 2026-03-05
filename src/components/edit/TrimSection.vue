<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import AppIcon from '../ui/AppIcon.vue';

const props = defineProps<{
  fileUrl: string;
}>();

const { t } = useI18n();

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

const MIN_DURATION = 0.1;
const zoomLevel = ref(0);

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

function getScrollEl(): HTMLElement | null {
  const shadow = waveformRef.value?.querySelector('div')?.shadowRoot;
  return shadow?.querySelector('.scroll') as HTMLElement | null;
}

let origOnMove: ((dx: number) => void) | null = null;
let origOnResize: ((dx: number, side: string) => void) | null = null;

function onMouseTrack(e: PointerEvent) {
  prevMouseX = lastMouseX;
  lastMouseX = e.clientX;
}

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

function startAutoScroll() {
  cancelAnimationFrame(scrollRaf);
  document.addEventListener('pointermove', onMouseTrack);

  function tick() {
    if (!draggingSide || !activeRegion || !duration.value) return;

    const scrollEl = getScrollEl();
    if (!scrollEl) { scrollRaf = requestAnimationFrame(tick); return; }

    const clientW = scrollEl.clientWidth;
    const scrollW = scrollEl.scrollWidth;
    if (scrollW <= clientW) { scrollRaf = requestAnimationFrame(tick); return; }

    const hotZone = clientW * 0.15;
    const maxSpeed = scrollW * 0.005;

    const rect = scrollEl.getBoundingClientRect();
    const mouseInContainer = lastMouseX - rect.left;
    const rightBoundary = clientW - hotZone;

    let scrollDir: 'left' | 'right' | null = null;
    let t = 0;

    if (inHotZone) {
      if (mouseInContainer > rightBoundary) {
        scrollDir = 'right';
        t = Math.min((mouseInContainer - rightBoundary) / hotZone, 1);
      } else if (mouseInContainer < hotZone) {
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

        if (distFromRight < hotZone && mouseDelta > 0) {
          scrollDir = 'right';
          t = Math.min((hotZone - distFromRight) / hotZone, 1);
          break;
        } else if (distFromLeft < hotZone && mouseDelta < 0) {
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

      const speed = (0.2 + t * 0.8) * maxSpeed;

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
}

function onWheel(e: WheelEvent) {
  if (!wavesurfer || !duration.value) return;
  e.preventDefault();
  const scrollEl = getScrollEl();
  if (!scrollEl) return;

  if (e.shiftKey) {
    scrollEl.scrollLeft += e.deltaY * 0.5;
    return;
  }

  const rect = scrollEl.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const scrollW = scrollEl.scrollWidth;
  const timeAtMouse = ((scrollEl.scrollLeft + mouseX) / scrollW) * duration.value;

  const delta = e.deltaY > 0 ? -20 : 20;
  zoomLevel.value = Math.max(0, Math.min(zoomLevel.value + delta, 500));
  wavesurfer.zoom(zoomLevel.value);

  const newScrollW = scrollEl.scrollWidth;
  const newPx = (timeAtMouse / duration.value) * newScrollW;
  scrollEl.scrollLeft = newPx - mouseX;
}

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

async function initWavesurfer() {
  destroyWavesurfer();
  await nextTick();

  if (!waveformRef.value) return;

  regionsPlugin = RegionsPlugin.create();

  wavesurfer = WaveSurfer.create({
    container: waveformRef.value,
    waveColor: '#555',
    progressColor: '#1db954',
    cursorColor: '#1db954',
    height: 100,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    normalize: true,
    interact: false,
    hideScrollbar: false,
    plugins: [regionsPlugin]
  });

  wavesurfer.on('ready', () => {
    const shadow = waveformRef.value?.querySelector('div')?.shadowRoot;
    if (shadow) {
      const style = document.createElement('style');
      style.textContent = `
        .scroll::-webkit-scrollbar { height: 6px; }
        .scroll::-webkit-scrollbar-track { background: transparent; }
        .scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        .scroll::-webkit-scrollbar-thumb:hover { background: #888; }
        [part~="region-handle"] {
          border-color: #1db954 !important;
          background: rgba(29, 185, 84, 0.3) !important;
        }
        [part~="region-handle"]:hover {
          background: rgba(29, 185, 84, 0.5) !important;
        }
      `;
      shadow.appendChild(style);
    }

    duration.value = wavesurfer!.getDuration();
    endTime.value = duration.value;
    startTime.value = 0;

    activeRegion = regionsPlugin!.addRegion({
      start: 0,
      end: duration.value,
      color: 'rgba(29, 185, 84, 0.15)',
      drag: true,
      resize: true,
      minLength: MIN_DURATION
    });

    activeRegion.on('update', (side) => {
      if (!activeRegion) return;
      startTime.value = roundToHundredths(Math.max(0, activeRegion.start));
      endTime.value = roundToHundredths(Math.min(activeRegion.end, duration.value));
      if (!draggingSide) {
        draggingSide = side ?? 'drag';
        if (draggingSide === 'drag' && zoomLevel.value > 0) {
          zoomBeforeDrag = zoomLevel.value;
          const scrollEl = getScrollEl();
          if (scrollEl && duration.value) {
            const selDuration = activeRegion.end - activeRegion.start;
            const clientW = scrollEl.clientWidth;
            const dragZoom = Math.max((clientW * 0.5) / selDuration, clientW / duration.value);
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
      const clampedStart = roundToHundredths(Math.max(0, activeRegion.start));
      const clampedEnd = roundToHundredths(Math.min(activeRegion.end, duration.value));
      startTime.value = clampedStart;
      endTime.value = clampedEnd;
      activeRegion.setOptions({ start: clampedStart, end: clampedEnd });
      if (wasDrag) {
        zoomBeforeDrag = 0;
      }
    });
  });

  wavesurfer.load(props.fileUrl);
}

onMounted(() => {
  initWavesurfer();
});

onBeforeUnmount(() => {
  destroyWavesurfer();
});

function syncRegion(field: 'start' | 'end') {
  if (!activeRegion) return;
  activeRegion.setOptions({
    [field]: field === 'start' ? startTime.value : endTime.value
  });
}

function onStartChange(e: Event) {
  const parsed = parseTime((e.target as HTMLInputElement).value);
  startTime.value = Math.max(0, Math.min(parsed, endTime.value - MIN_DURATION));
  syncRegion('start');
}

function onEndChange(e: Event) {
  const parsed = parseTime((e.target as HTMLInputElement).value);
  endTime.value = Math.min(Math.max(parsed, startTime.value + MIN_DURATION), duration.value);
  syncRegion('end');
}

async function reload() {
  await initWavesurfer();
}

defineExpose({ startTime, endTime, duration, reload });
</script>

<template>
  <section class="edit-section">
    <div class="edit-section-header">
      <AppIcon name="edit" :size="16" />
      <span>{{ t('library.trim') }}</span>
    </div>

    <div ref="waveformRef" class="trim-section-waveform" @wheel="onWheel" />

    <div class="trim-section-times">
      <label class="trim-section-field">
        <span>{{ t('library.trimStart') }}</span>
        <input
          type="text"
          :value="formatTime(startTime)"
          @change="onStartChange"
        />
      </label>
      <label class="trim-section-field">
        <span>{{ t('library.trimEnd') }}</span>
        <input
          type="text"
          :value="formatTime(endTime)"
          @change="onEndChange"
        />
      </label>
      <div class="trim-section-duration">
        <span>{{ t('library.trimDuration') }}</span>
        <span class="trim-section-duration-value">{{ formatTime(endTime - startTime) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.edit-section {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  padding: 16px 20px;
}

.edit-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-white, #fff);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 14px;
}

.edit-section-header svg {
  color: var(--color-accent);
}

.trim-section-waveform {
  background: var(--color-bg, #121212);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 16px;
  min-height: 100px;
}

.trim-section-times {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.trim-section-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.trim-section-field span {
  font-size: 0.7rem;
  color: var(--color-text-dimmer);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trim-section-field input {
  background: var(--color-bg-input, #252525);
  border: 1px solid var(--color-border, #333);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--color-text-white, #fff);
  font-size: 0.8rem;
  font-family: monospace;
  outline: none;
  transition: border-color 0.15s;
}

.trim-section-field input:focus {
  border-color: var(--color-accent);
}

.trim-section-duration {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.trim-section-duration span {
  font-size: 0.7rem;
  color: var(--color-text-dimmer);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trim-section-duration-value {
  font-size: 0.8rem;
  font-family: monospace;
  color: var(--color-accent);
  padding: 6px 0;
}
</style>
