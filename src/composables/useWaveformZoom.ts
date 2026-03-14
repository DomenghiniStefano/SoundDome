import { type Ref } from 'vue';
import _ from 'lodash';
import type WaveSurfer from 'wavesurfer.js';
import {
  WAVEFORM_SCROLL_SHIFT_MULTIPLIER,
  WAVEFORM_ZOOM_STEP,
  WAVEFORM_ZOOM_MAX,
} from '@/enums/waveform';

export interface UseWaveformZoomOptions {
  waveformRef: Ref<HTMLDivElement | undefined>;
  getWavesurfer: () => WaveSurfer | null;
  getScrollEl: () => HTMLElement | null;
  duration: Ref<number>;
  zoomLevel: Ref<number>;
}

export interface UseWaveformZoomReturn {
  attach: () => void;
  detach: () => void;
}

export function useWaveformZoom(options: UseWaveformZoomOptions): UseWaveformZoomReturn {
  function onWheel(e: WheelEvent) {
    const ws = options.getWavesurfer();
    if (!ws || !options.duration.value) return;
    e.preventDefault();

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

    const delta = e.deltaY > 0 ? -WAVEFORM_ZOOM_STEP : WAVEFORM_ZOOM_STEP;
    options.zoomLevel.value = _.clamp(options.zoomLevel.value + delta, 0, WAVEFORM_ZOOM_MAX);
    ws.zoom(options.zoomLevel.value);

    const newScrollW = scrollEl.scrollWidth;
    const newPx = (timeAtMouse / options.duration.value) * newScrollW;
    scrollEl.scrollLeft = newPx - mouseX;
  }

  function attach() {
    options.waveformRef.value?.addEventListener('wheel', onWheel, { passive: false });
  }

  function detach() {
    options.waveformRef.value?.removeEventListener('wheel', onWheel);
  }

  return { attach, detach };
}
