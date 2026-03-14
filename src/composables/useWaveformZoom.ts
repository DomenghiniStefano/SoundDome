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
}

export function useWaveformZoom(options: UseWaveformZoomOptions): UseWaveformZoomReturn {
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
    const scrollW = scrollEl.scrollWidth;
    const timeAtMouse = ((scrollEl.scrollLeft + mouseX) / scrollW) * options.duration.value;

    // Wavesurfer uses fillParent: the waveform only becomes scrollable when
    // duration * minPxPerSec > containerWidth. When zooming in from 0, we must
    // jump past that threshold or the zoom is a visual no-op.
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
    ws.zoom(newZoom);

    // render() runs synchronously (no yields) — DOM widths are already updated
    if (newZoom > 0) {
      const newScrollW = scrollEl.scrollWidth;
      const newPx = (timeAtMouse / options.duration.value) * newScrollW;
      scrollEl.scrollLeft = newPx - mouseX;
    }
  }

  return { onWheel };
}
