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

    const delta = e.deltaY > 0 ? -WAVEFORM_ZOOM_STEP : WAVEFORM_ZOOM_STEP;
    options.zoomLevel.value = _.clamp(options.zoomLevel.value + delta, 0, WAVEFORM_ZOOM_MAX);
    ws.zoom(options.zoomLevel.value);

    // ws.zoom() triggers an async re-render — anchor scroll after it completes
    const dur = options.duration.value;
    ws.once('redrawcomplete', () => {
      const el = options.getScrollEl();
      if (!el || !dur) return;
      const newScrollW = el.scrollWidth;
      const newPx = (timeAtMouse / dur) * newScrollW;
      el.scrollLeft = newPx - mouseX;
    });
  }

  return { onWheel };
}
