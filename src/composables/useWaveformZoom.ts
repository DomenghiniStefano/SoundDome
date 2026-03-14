import { type Ref } from 'vue';
import _ from 'lodash';
import type WaveSurfer from 'wavesurfer.js';
import {
  WAVEFORM_SCROLL_SHIFT_MULTIPLIER,
  WAVEFORM_ZOOM_STEP,
  WAVEFORM_ZOOM_MAX,
} from '@/enums/waveform';

export interface UseWaveformZoomOptions {
  getWavesurfer: () => WaveSurfer | null;
  getScrollEl: () => HTMLElement | null;
  duration: Ref<number>;
  zoomLevel: Ref<number>;
}

export interface UseWaveformZoomReturn {
  onWheel: (e: WheelEvent) => void;
  cleanup: () => void;
}

export function useWaveformZoom(options: UseWaveformZoomOptions): UseWaveformZoomReturn {
  let zoomRaf: number | null = null;
  let pendingMouseX = 0;
  let pendingScrollLeft = 0;
  let pendingZoom = 0;

  function flushZoom() {
    zoomRaf = null;

    const ws = options.getWavesurfer();
    const scrollEl = options.getScrollEl();
    if (!ws || !scrollEl || !options.duration.value) return;

    // Skip if zoom level was changed externally (e.g. drag-zoom, zoom reset)
    if (options.zoomLevel.value !== pendingZoom) return;

    const scrollW = scrollEl.scrollWidth;
    const timeAtMouse = ((pendingScrollLeft + pendingMouseX) / scrollW) * options.duration.value;

    ws.zoom(pendingZoom);

    if (pendingZoom > 0) {
      const newScrollW = scrollEl.scrollWidth;
      const newPx = (timeAtMouse / options.duration.value) * newScrollW;
      scrollEl.scrollLeft = newPx - pendingMouseX;
    }
  }

  function onWheel(e: WheelEvent) {
    const ws = options.getWavesurfer();
    if (!ws || !options.duration.value) return;

    const scrollEl = options.getScrollEl();
    if (!scrollEl) return;

    if (e.shiftKey) {
      scrollEl.scrollLeft += e.deltaY * WAVEFORM_SCROLL_SHIFT_MULTIPLIER;
      return;
    }

    const rect = scrollEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const naturalPxPerSec = scrollEl.clientWidth / options.duration.value;
    const minEffectiveZoom = Math.ceil(naturalPxPerSec) + WAVEFORM_ZOOM_STEP;

    const zoomingIn = e.deltaY < 0;
    let newZoom: number;

    if (zoomingIn) {
      const floor = options.zoomLevel.value === 0 ? minEffectiveZoom : options.zoomLevel.value + WAVEFORM_ZOOM_STEP;
      newZoom = _.clamp(floor, 0, WAVEFORM_ZOOM_MAX);
    } else {
      const candidate = options.zoomLevel.value - WAVEFORM_ZOOM_STEP;
      newZoom = candidate <= minEffectiveZoom ? 0 : candidate;
    }

    if (newZoom === options.zoomLevel.value) return;

    options.zoomLevel.value = newZoom;
    pendingMouseX = mouseX;
    pendingScrollLeft = scrollEl.scrollLeft;
    pendingZoom = newZoom;

    if (zoomRaf === null) {
      zoomRaf = requestAnimationFrame(flushZoom);
    }
  }

  function cleanup() {
    if (zoomRaf !== null) {
      cancelAnimationFrame(zoomRaf);
      zoomRaf = null;
    }
  }

  return { onWheel, cleanup };
}
