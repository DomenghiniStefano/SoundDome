import { ref, nextTick, type Ref } from 'vue';
import _ from 'lodash';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import {
  WAVEFORM_REGION_OPACITY_HEX,
  WAVEFORM_HANDLE_OPACITY_HEX,
  WAVEFORM_HANDLE_HOVER_OPACITY_HEX,
  WAVEFORM_DRAG_ZOOM_VIEWPORT_RATIO,
} from '@/enums/waveform';
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
  loading: Ref<boolean>;
  getWavesurfer: () => WaveSurfer | null;
  getActiveRegion: () => RegionInstance | null;
  getScrollEl: () => HTMLElement | null;
  init: (src: string) => Promise<void>;
  destroy: () => void;
  setSelection: (start: number, end: number) => void;
  setSelectionSilent: (start: number, end: number) => void;
  syncRegionFromInput: (field: 'start' | 'end') => void;
}

export function useWaveformRegion(options: UseWaveformRegionOptions): UseWaveformRegionReturn {
  const startTime = ref(0);
  const endTime = ref(0);
  const duration = ref(0);
  const zoomLevel = ref(0);
  const loading = ref(false);

  let wavesurfer: WaveSurfer | null = null;
  let regionsPlugin: RegionsPlugin | null = null;
  let activeRegion: RegionInstance | null = null;
  let zoomBeforeDrag = 0;
  let draggingSide: 'start' | 'end' | 'drag' | null = null;
  let cachedScrollEl: HTMLElement | null = null;
  let cachedShadowRoot: ShadowRoot | null = null;
  let syncRaf: number | null = null;

  // --- Accessors ---

  function getWavesurfer(): WaveSurfer | null {
    return wavesurfer;
  }

  function getActiveRegion(): RegionInstance | null {
    return activeRegion;
  }

  function getShadowRoot(): ShadowRoot | null {
    if (cachedShadowRoot) return cachedShadowRoot;
    cachedShadowRoot = options.waveformRef.value?.querySelector('div')?.shadowRoot ?? null;
    return cachedShadowRoot;
  }

  function getScrollEl(): HTMLElement | null {
    if (cachedScrollEl && cachedScrollEl.isConnected) return cachedScrollEl;
    const shadow = getShadowRoot();
    cachedScrollEl = shadow?.querySelector('.scroll') as HTMLElement | null;
    return cachedScrollEl;
  }

  // --- Helpers ---

  function getCssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function resolveColors(vars: { cssVar: string; fallback: string }[]): string[] {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    document.body.appendChild(el);
    const results = vars.map(({ cssVar, fallback }) => {
      el.style.backgroundColor = `var(${cssVar})`;
      return getComputedStyle(el).backgroundColor || fallback;
    });
    el.remove();
    return results;
  }

  function clampRegionTime(start: number, end: number): { start: number; end: number } {
    return {
      start: roundToHundredths(_.clamp(start, 0, duration.value)),
      end: roundToHundredths(_.clamp(end, 0, duration.value)),
    };
  }

  function syncRefsFromRegion() {
    if (!activeRegion) return;
    const clamped = clampRegionTime(activeRegion.start, activeRegion.end);
    startTime.value = clamped.start;
    endTime.value = clamped.end;
  }

  function scrollToRegionCenter(scrollEl: HTMLElement, regionStart: number, regionEnd: number) {
    const mid = ((regionStart + regionEnd) / 2 / duration.value) * scrollEl.scrollWidth;
    scrollEl.scrollLeft = mid - scrollEl.clientWidth / 2;
  }

  function emitSelection() {
    options.onSelectionUpdate({ start: startTime.value, end: endTime.value });
  }

  // --- Shadow DOM styles ---

  function injectShadowStyles(accentColor: string) {
    const shadow = getShadowRoot();
    if (!shadow) return;

    const existing = shadow.querySelector('[data-waveform-styles]');
    if (existing) existing.remove();

    // Resolve scrollbar colors — CSS vars don't work in ::-webkit-scrollbar pseudo-elements inside shadow DOM.
    // getComputedStyle().getPropertyValue() returns raw var() references for custom properties,
    // so we resolve them via a temp element's computed backgroundColor.
    const [thumbColor, thumbHoverColor] = resolveColors([
      { cssVar: '--scrollbar-thumb', fallback: '#555' },
      { cssVar: '--scrollbar-thumb-hover', fallback: '#888' },
    ]);

    const style = document.createElement('style');
    style.setAttribute('data-waveform-styles', '');
    style.textContent = `
      .scroll::-webkit-scrollbar { height: 6px; }
      .scroll::-webkit-scrollbar-track { background: transparent; }
      .scroll::-webkit-scrollbar-thumb { background: ${thumbColor}; border-radius: 3px; }
      .scroll::-webkit-scrollbar-thumb:hover { background: ${thumbHoverColor}; }
      [part~="region-handle"] {
        border-color: ${accentColor} !important;
        background: ${accentColor}${WAVEFORM_HANDLE_OPACITY_HEX} !important;
      }
      [part~="region-handle"]:hover {
        background: ${accentColor}${WAVEFORM_HANDLE_HOVER_OPACITY_HEX} !important;
      }
    `;
    shadow.appendChild(style);
  }

  // --- Drag-zoom logic ---

  function applyDragZoomOut() {
    if (!activeRegion || !wavesurfer) return;

    zoomBeforeDrag = zoomLevel.value;
    const scrollEl = getScrollEl();
    if (!scrollEl || !duration.value) return;

    const selDuration = activeRegion.end - activeRegion.start;
    const clientW = scrollEl.clientWidth;
    const dragZoom = Math.max(
      (clientW * WAVEFORM_DRAG_ZOOM_VIEWPORT_RATIO) / selDuration,
      clientW / duration.value,
    );

    if (dragZoom >= zoomLevel.value) return;

    zoomLevel.value = dragZoom;
    wavesurfer.zoom(dragZoom);
    nextTick(() => {
      const el = getScrollEl();
      if (!el || !activeRegion || !duration.value) return;
      scrollToRegionCenter(el, activeRegion.start, activeRegion.end);
    });
  }

  function restoreZoomAfterDrag(regionStart: number, regionEnd: number) {
    if (!wavesurfer || zoomBeforeDrag <= 0) {
      zoomBeforeDrag = 0;
      return;
    }

    zoomLevel.value = zoomBeforeDrag;
    wavesurfer.zoom(zoomBeforeDrag);
    zoomBeforeDrag = 0;
    nextTick(() => {
      const el = getScrollEl();
      if (!el || !duration.value) return;
      scrollToRegionCenter(el, regionStart, regionEnd);
    });
  }

  // --- Region event handlers ---

  function onRegionUpdate(side: string | undefined) {
    if (!activeRegion) return;

    if (draggingSide) {
      // During active drags, batch ref syncs via RAF to avoid per-mousemove re-renders
      if (syncRaf === null) {
        syncRaf = requestAnimationFrame(() => {
          syncRaf = null;
          syncRefsFromRegion();
        });
      }
      return;
    }

    syncRefsFromRegion();

    draggingSide = (side ?? 'drag') as 'start' | 'end' | 'drag';

    if (draggingSide === 'drag' && zoomLevel.value > 0) {
      applyDragZoomOut();
    }

    options.onDragStart(draggingSide);
  }

  function onRegionUpdateEnd() {
    // Cancel any pending batched sync — we flush final values below
    if (syncRaf !== null) {
      cancelAnimationFrame(syncRaf);
      syncRaf = null;
    }

    const wasDrag = draggingSide === 'drag';
    draggingSide = null;
    options.onDragEnd(wasDrag);

    if (!activeRegion) return;

    const clamped = clampRegionTime(activeRegion.start, activeRegion.end);
    startTime.value = clamped.start;
    endTime.value = clamped.end;
    activeRegion.setOptions({ start: clamped.start, end: clamped.end });

    if (wasDrag) {
      restoreZoomAfterDrag(clamped.start, clamped.end);
    }

    emitSelection();
  }

  // --- Lifecycle ---

  function destroy() {
    if (syncRaf !== null) {
      cancelAnimationFrame(syncRaf);
      syncRaf = null;
    }
    draggingSide = null;
    zoomLevel.value = 0;
    cachedScrollEl = null;
    cachedShadowRoot = null;
    if (wavesurfer) {
      wavesurfer.destroy();
      wavesurfer = null;
      regionsPlugin = null;
      activeRegion = null;
    }
  }

  async function init(src: string) {
    destroy();
    loading.value = true;
    await nextTick();

    if (!options.waveformRef.value || !src) {
      loading.value = false;
      return;
    }

    const accentColor = options.accentColor();
    const regionColor = accentColor + WAVEFORM_REGION_OPACITY_HEX;

    regionsPlugin = RegionsPlugin.create();

    wavesurfer = WaveSurfer.create({
      container: options.waveformRef.value,
      waveColor: options.waveColor(),
      progressColor: accentColor,
      cursorColor: getCssVar('--waveform-cursor') || accentColor,
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
      loading.value = false;
      injectShadowStyles(accentColor);

      duration.value = wavesurfer!.getDuration();
      startTime.value = 0;
      endTime.value = duration.value;

      activeRegion = regionsPlugin!.addRegion({
        start: 0,
        end: duration.value,
        color: regionColor,
        drag: true,
        resize: true,
        minLength: options.minDuration(),
      });

      activeRegion.on('update', onRegionUpdate);
      activeRegion.on('update-end', onRegionUpdateEnd);

      options.onReady(duration.value);
      emitSelection();
    });

    wavesurfer.load(src);
  }

  // --- Public API ---

  function applySelection(start: number, end: number) {
    const clamped = clampRegionTime(start, end);
    startTime.value = clamped.start;
    endTime.value = clamped.end;
    if (activeRegion) {
      activeRegion.setOptions({ start: clamped.start, end: clamped.end });
    }
    return clamped;
  }

  function setSelection(start: number, end: number) {
    applySelection(start, end);
    emitSelection();
  }

  function setSelectionSilent(start: number, end: number) {
    applySelection(start, end);
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
    loading,
    getWavesurfer,
    getActiveRegion,
    getScrollEl,
    init,
    destroy,
    setSelection,
    setSelectionSilent,
    syncRegionFromInput,
  };
}
