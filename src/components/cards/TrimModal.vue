<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import AppIcon from '../ui/AppIcon.vue';
import { useLibraryStore } from '../../stores/library';

const props = defineProps<{
  visible: boolean;
  item: LibraryItem;
}>();

const emit = defineEmits<{
  close: [];
  trimmed: [];
}>();

const { t } = useI18n();
const libraryStore = useLibraryStore();

const waveformRef = ref<HTMLDivElement>();
const startTime = ref(0);
const endTime = ref(0);
const duration = ref(0);
const saving = ref(false);
const testing = ref(false);
const error = ref('');

let wavesurfer: WaveSurfer | null = null;
let regionsPlugin: RegionsPlugin | null = null;
let activeRegion: ReturnType<RegionsPlugin['addRegion']> | null = null;
let testAudio: HTMLAudioElement | null = null;
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

async function resolveFileUrl(): Promise<string> {
  const filePath = await libraryStore.getFilePath(props.item.filename);
  return `file://${filePath}`;
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
    const selDuration = activeRegion.end - activeRegion.start;

    const rect = scrollEl.getBoundingClientRect();
    const mouseInContainer = lastMouseX - rect.left;
    const rightBoundary = clientW - hotZone;

    let scrollDir: 'left' | 'right' | null = null;
    let t = 0;

    if (inHotZone) {
      // Already in hotzone: use MOUSE to decide if still in hotzone
      if (mouseInContainer > rightBoundary) {
        scrollDir = 'right';
        t = Math.min((mouseInContainer - rightBoundary) / hotZone, 1);
      } else if (mouseInContainer < hotZone) {
        scrollDir = 'left';
        t = Math.min((hotZone - mouseInContainer) / hotZone, 1);
      }
    } else {
      // Not in hotzone: use REGION EDGE to decide if entering
      // Only enter if mouse is moving outward (expanding or dragging toward edge)
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

function zoomToSelection(start: number, end: number) {
  if (!wavesurfer || !duration.value) return;
  const scrollEl = getScrollEl();
  if (!scrollEl) return;

  const selDuration = end - start;
  const clientW = scrollEl.clientWidth;

  // The selection should occupy 80% of the viewport
  // minPxPerSec = clientW / totalDuration at zoom 0
  // We want selDuration to fill 80% of clientW → pxPerSec = (clientW * 0.8) / selDuration
  const targetPxPerSec = (clientW * 0.8) / selDuration;
  const basePxPerSec = clientW / duration.value;
  // zoom(0) = basePxPerSec, cap at 100% zoom (basePxPerSec)
  const zoom = Math.min(Math.max(targetPxPerSec, basePxPerSec), zoomBeforeDrag);

  zoomLevel.value = zoom;
  wavesurfer.zoom(zoom);

  // After zoom, scroll to center the selection with balanced padding
  nextTick(() => {
    if (!scrollEl || !duration.value) return;
    const newScrollW = scrollEl.scrollWidth;
    const selCenterPx = ((start + end) / 2 / duration.value) * newScrollW;

    // Desired padding: 10% of viewport on each side
    // But balance if selection is near edges
    const padLeft = Math.min(start / duration.value * newScrollW, clientW * 0.1);
    const padRight = Math.min(((duration.value - end) / duration.value) * newScrollW, clientW * 0.1);
    const totalPad = padLeft + padRight;
    const selPx = newScrollW * (selDuration / duration.value);
    const viewNeeded = selPx + totalPad;

    // Center the selection accounting for unbalanced padding
    const selStartPx = (start / duration.value) * newScrollW;
    scrollEl.scrollLeft = selStartPx - padLeft;
  });
}

function onWheel(e: WheelEvent) {
  if (!wavesurfer || !duration.value) return;
  e.preventDefault();
  const scrollEl = getScrollEl();
  if (!scrollEl) return;

  if (e.shiftKey) {
    // Shift+wheel: horizontal scroll
    scrollEl.scrollLeft += e.deltaY * 0.5;
    return;
  }

  // Time under the mouse before zoom
  const rect = scrollEl.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const scrollW = scrollEl.scrollWidth;
  const timeAtMouse = ((scrollEl.scrollLeft + mouseX) / scrollW) * duration.value;

  const delta = e.deltaY > 0 ? -20 : 20;
  zoomLevel.value = Math.max(0, Math.min(zoomLevel.value + delta, 500));
  wavesurfer.zoom(zoomLevel.value);

  // After zoom, adjust scroll so the same time stays under the mouse
  const newScrollW = scrollEl.scrollWidth;
  const newPx = (timeAtMouse / duration.value) * newScrollW;
  scrollEl.scrollLeft = newPx - mouseX;
}

function destroyWavesurfer() {
  stopTest();
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
  error.value = '';
  await nextTick();

  if (!waveformRef.value) return;

  const fileUrl = await resolveFileUrl();

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
        console.log('[TRIM] drag start, side:', draggingSide, 'zoomLevel:', zoomLevel.value);
        if (draggingSide === 'drag' && zoomLevel.value > 0) {
          zoomBeforeDrag = zoomLevel.value;
          // Zoom out just enough: selection occupies ~50% of viewport, leaving room to drag
          const scrollEl = getScrollEl();
          if (scrollEl && duration.value) {
            const selDuration = activeRegion.end - activeRegion.start;
            const clientW = scrollEl.clientWidth;
            const dragZoom = Math.max((clientW * 0.5) / selDuration, clientW / duration.value);
            // Only zoom out if current zoom is tighter
            if (dragZoom < zoomLevel.value) {
              zoomLevel.value = dragZoom;
              wavesurfer!.zoom(dragZoom);
              // Center on selection
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
      console.log('[TRIM] drag end, side:', draggingSide, 'wasInHotZone:', inHotZone);
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

  wavesurfer.load(fileUrl);
}

watch(() => props.visible, (visible) => {
  if (visible) {
    initWavesurfer();
  } else {
    destroyWavesurfer();
    error.value = '';
  }
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

async function onTest() {
  if (testing.value) {
    stopTest();
    return;
  }

  const fileUrl = await resolveFileUrl();

  testAudio = new Audio(fileUrl);
  testAudio.currentTime = startTime.value;
  testing.value = true;

  const trimEnd = endTime.value;

  testAudio.addEventListener('timeupdate', () => {
    if (testAudio && testAudio.currentTime >= trimEnd) {
      stopTest();
    }
  });
  testAudio.addEventListener('ended', () => stopTest());
  testAudio.play();
}

function stopTest() {
  if (testAudio) {
    testAudio.pause();
    testAudio.src = '';
    testAudio = null;
  }
  testing.value = false;
}

async function onTrimSave() {
  saving.value = true;
  error.value = '';
  stopTest();

  const result = await libraryStore.trim(props.item.id, startTime.value, endTime.value);
  saving.value = false;

  if (result.success) {
    emit('trimmed');
    emit('close');
  } else {
    error.value = result.error || t('toast.trimError');
  }
}

function onClose() {
  stopTest();
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="trim-modal-overlay" @click="onClose">
      <div class="trim-modal" @click.stop>
        <div class="trim-modal-header">
          <span class="trim-modal-title">{{ item.name }}</span>
          <button class="trim-modal-close" @click="onClose">
            <AppIcon name="close" :size="16" />
          </button>
        </div>

        <div ref="waveformRef" class="trim-waveform" @wheel="onWheel" />

        <div class="trim-times">
          <label class="trim-time-field">
            <span>{{ t('library.trimStart') }}</span>
            <input
              type="text"
              :value="formatTime(startTime)"
              @change="onStartChange"
            />
          </label>
          <label class="trim-time-field">
            <span>{{ t('library.trimEnd') }}</span>
            <input
              type="text"
              :value="formatTime(endTime)"
              @change="onEndChange"
            />
          </label>
          <div class="trim-duration">
            <span>{{ t('library.trimDuration') }}</span>
            <span class="trim-duration-value">{{ formatTime(endTime - startTime) }}</span>
          </div>
        </div>

        <div v-if="error" class="trim-error">{{ error }}</div>

        <div class="trim-actions">
          <button class="trim-btn trim-btn-test" :class="{ active: testing }" @click="onTest">
            <AppIcon :name="testing ? 'stop' : 'headphones'" :size="12" />
            {{ t('library.trimTest') }}
          </button>
          <div class="trim-actions-right">
            <button class="trim-btn trim-btn-cancel" @click="onClose">
              {{ t('common.cancel') }}
            </button>
            <button class="trim-btn trim-btn-save" :disabled="saving" @click="onTrimSave">
              {{ saving ? t('library.trimSaving') : t('library.trimSave') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
/* Trim modal (unscoped for Teleport) */
.trim-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trim-modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  padding: 20px;
  width: 560px;
  max-width: 90vw;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.trim-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.trim-modal-title {
  font-size: 0.9rem;
  color: var(--color-text-white, #fff);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.trim-modal-close {
  border: none;
  background: none;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.trim-modal-close:hover {
  color: var(--color-text-white);
}

.trim-waveform {
  background: var(--color-bg, #121212);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 16px;
  min-height: 100px;
}

.trim-error {
  color: var(--color-error);
  font-size: 0.78rem;
  margin-bottom: 12px;
}

.trim-times {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: flex-end;
}

.trim-time-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.trim-time-field span {
  font-size: 0.7rem;
  color: var(--color-text-dimmer);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trim-time-field input {
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

.trim-time-field input:focus {
  border-color: var(--color-accent);
}

.trim-duration {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.trim-duration span {
  font-size: 0.7rem;
  color: var(--color-text-dimmer);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trim-duration-value {
  font-size: 0.8rem;
  font-family: monospace;
  color: var(--color-accent);
  padding: 6px 0;
}

.trim-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.trim-actions-right {
  display: flex;
  gap: 8px;
}

.trim-btn {
  border: none;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s, background 0.15s;
}

.trim-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.trim-btn-test {
  background: var(--color-bg-input);
  color: var(--color-text-white);
}

.trim-btn-test:hover {
  background: var(--color-bg-card-hover);
}

.trim-btn-test.active {
  background: rgba(231, 76, 60, 0.15);
  color: var(--color-error);
}

.trim-btn-cancel {
  background: var(--color-bg-input);
  color: var(--color-text-dimmer);
}

.trim-btn-cancel:hover {
  color: var(--color-text-white);
}

.trim-btn-save {
  background: var(--color-accent);
  color: #000;
  font-weight: 600;
}

.trim-btn-save:hover:not(:disabled) {
  opacity: 0.85;
}
</style>
