import { ref, nextTick, type Ref } from 'vue';
import _ from 'lodash';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { WAVEFORM_REGION_OPACITY_HEX, WAVEFORM_DRAG_ZOOM_VIEWPORT_RATIO } from '@/enums/waveform';
import { roundToHundredths } from '@/utils/time';

type RegionInstance = ReturnType<RegionsPlugin['addRegion']>;

export interface UseWaveformRegionOptions {
  waveformRef: Ref<HTMLDivElement | undefined>;
  accentColor: () => string;
  waveColor: () => string;
  height: () => number;
  barWidth: () => number;
  barGap: () => number;
  barRadius: () => number;
  minDuration: () => number;
  onReady: (duration: number) => void;
  onSelectionUpdate: (sel: { start: number; end: number }) => void;
  onDragStart: (side: 'start' | 'end' | 'drag') => void;
  onDragEnd: (wasDrag: boolean) => void;
}

export interface UseWaveformRegionReturn {
  startTime: Ref<number>;
  endTime: Ref<number>;
  duration: Ref<number>;
  zoomLevel: Ref<number>;
  getWavesurfer: () => WaveSurfer | null;
  getActiveRegion: () => RegionInstance | null;
  getScrollEl: () => HTMLElement | null;
  init: (src: string) => Promise<void>;
  destroy: () => void;
  setSelection: (start: number, end: number) => void;
  syncRegionFromInput: (field: 'start' | 'end') => void;
}

export function useWaveformRegion(options: UseWaveformRegionOptions): UseWaveformRegionReturn {
  const startTime = ref(0);
  const endTime = ref(0);
  const duration = ref(0);
  const zoomLevel = ref(0);

  let wavesurfer: WaveSurfer | null = null;
  let regionsPlugin: RegionsPlugin | null = null;
  let activeRegion: RegionInstance | null = null;
  let zoomBeforeDrag = 0;
  let draggingSide: 'start' | 'end' | 'drag' | null = null;

  function getWavesurfer(): WaveSurfer | null {
    return wavesurfer;
  }

  function getActiveRegion(): RegionInstance | null {
    return activeRegion;
  }

  function getScrollEl(): HTMLElement | null {
    const shadow = options.waveformRef.value?.querySelector('div')?.shadowRoot;
    return shadow?.querySelector('.scroll') as HTMLElement | null;
  }

  function injectShadowStyles(accentColor: string) {
    const shadow = options.waveformRef.value?.querySelector('div')?.shadowRoot;
    if (!shadow) return;

    const existing = shadow.querySelector('[data-waveform-styles]');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.setAttribute('data-waveform-styles', '');
    style.textContent = `
      .scroll::-webkit-scrollbar { height: 6px; }
      .scroll::-webkit-scrollbar-track { background: transparent; }
      .scroll::-webkit-scrollbar-thumb { background: var(--border-default, #333); border-radius: 3px; }
      .scroll::-webkit-scrollbar-thumb:hover { background: var(--text-secondary, #888); }
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

  function emitSelection() {
    options.onSelectionUpdate({ start: startTime.value, end: endTime.value });
  }

  function destroy() {
    zoomLevel.value = 0;
    if (wavesurfer) {
      wavesurfer.destroy();
      wavesurfer = null;
      regionsPlugin = null;
      activeRegion = null;
    }
  }

  async function init(src: string) {
    destroy();
    await nextTick();

    if (!options.waveformRef.value || !src) return;

    const accentColor = options.accentColor();
    const regionColor = accentColor + WAVEFORM_REGION_OPACITY_HEX;

    regionsPlugin = RegionsPlugin.create();

    wavesurfer = WaveSurfer.create({
      container: options.waveformRef.value,
      waveColor: options.waveColor(),
      progressColor: accentColor,
      cursorColor: getComputedStyle(document.documentElement).getPropertyValue('--waveform-cursor').trim() || accentColor,
      height: options.height(),
      barWidth: options.barWidth(),
      barGap: options.barGap(),
      barRadius: options.barRadius(),
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
        minLength: options.minDuration(),
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
              const dragZoom = Math.max(
                (clientW * WAVEFORM_DRAG_ZOOM_VIEWPORT_RATIO) / selDuration,
                clientW / duration.value,
              );
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

          options.onDragStart(draggingSide);
        }
      });

      activeRegion.on('update-end', () => {
        const wasDrag = draggingSide === 'drag';
        draggingSide = null;
        options.onDragEnd(wasDrag);

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

      options.onReady(duration.value);
      emitSelection();
    });

    wavesurfer.load(src);
  }

  function setSelection(start: number, end: number) {
    startTime.value = roundToHundredths(_.clamp(start, 0, duration.value));
    endTime.value = roundToHundredths(_.clamp(end, 0, duration.value));
    if (activeRegion) {
      activeRegion.setOptions({ start: startTime.value, end: endTime.value });
    }
    emitSelection();
  }

  function syncRegionFromInput(field: 'start' | 'end') {
    if (!activeRegion) return;
    activeRegion.setOptions({
      [field]: field === 'start' ? startTime.value : endTime.value,
    });
    emitSelection();
  }

  return {
    startTime,
    endTime,
    duration,
    zoomLevel,
    getWavesurfer,
    getActiveRegion,
    getScrollEl,
    init,
    destroy,
    setSelection,
    syncRegionFromInput,
  };
}
