import { type Ref } from 'vue';
import _ from 'lodash';
import {
  WAVEFORM_HOT_ZONE_RATIO,
  WAVEFORM_MAX_SPEED_RATIO,
  WAVEFORM_MIN_SPEED_FACTOR,
  WAVEFORM_SCROLL_BOUNDARY_PX,
} from '@/enums/waveform';
import { roundToHundredths } from '@/utils/time';

type RegionInstance = {
  start: number;
  end: number;
  setOptions: (opts: Record<string, unknown>) => void;
};

type DragSide = 'start' | 'end' | 'drag';
type ScrollDirection = { dir: 'left' | 'right' | null; t: number };

export interface UseWaveformAutoScrollOptions {
  getActiveRegion: () => RegionInstance | null;
  getScrollEl: () => HTMLElement | null;
  duration: Ref<number>;
  startTime: Ref<number>;
  endTime: Ref<number>;
  minDuration: () => number;
}

export interface UseWaveformAutoScrollReturn {
  start: (side: DragSide) => void;
  stop: () => void;
  cleanup: () => void;
}

export function useWaveformAutoScroll(options: UseWaveformAutoScrollOptions): UseWaveformAutoScrollReturn {
  let draggingSide: DragSide | null = null;
  let scrollRaf = 0;
  let refUpdateRaf = 0;
  let inHotZone = false;
  let lastMouseX = 0;
  let prevMouseX = 0;
  let freshMouse = false;

  let origOnMove: ((dx: number) => void) | null = null;
  let origOnResize: ((dx: number, side: string) => void) | null = null;

  // --- Cursor ---

  function setDragCursor(side: DragSide | null) {
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

  // --- Region input monkey-patch (blocks wavesurfer drag during auto-scroll) ---

  function blockRegionInput() {
    const region = options.getActiveRegion();
    if (!region || origOnMove) return;
    const r = region as any;
    origOnMove = r.onMove.bind(r);
    origOnResize = r.onResize.bind(r);
    r.onMove = () => {};
    r.onResize = () => {};
  }

  function restoreRegionInput() {
    const region = options.getActiveRegion();
    if (!region || !origOnMove) return;
    const r = region as any;
    r.onMove = origOnMove;
    r.onResize = origOnResize;
    origOnMove = null;
    origOnResize = null;
  }

  // --- Batched ref updates (avoids Vue re-render every RAF tick) ---

  function scheduleRefUpdate(region: RegionInstance) {
    if (refUpdateRaf) return;
    refUpdateRaf = requestAnimationFrame(() => {
      refUpdateRaf = 0;
      options.startTime.value = roundToHundredths(region.start);
      options.endTime.value = roundToHundredths(region.end);
    });
  }

  function flushRefUpdate() {
    cancelAnimationFrame(refUpdateRaf);
    refUpdateRaf = 0;
    const region = options.getActiveRegion();
    if (region) {
      options.startTime.value = roundToHundredths(region.start);
      options.endTime.value = roundToHundredths(region.end);
    }
  }

  // --- Scroll helpers ---

  function canScroll(scrollEl: HTMLElement, scrollW: number): { left: boolean; right: boolean } {
    return {
      left: scrollEl.scrollLeft > WAVEFORM_SCROLL_BOUNDARY_PX,
      right: scrollEl.scrollLeft < scrollW - scrollEl.clientWidth - WAVEFORM_SCROLL_BOUNDARY_PX,
    };
  }

  function hotZoneIntensity(distance: number, hotZone: number): number {
    return Math.min(distance / hotZone, 1);
  }

  function detectHotZoneScroll(
    scrollEl: HTMLElement,
    clientW: number,
    can: { left: boolean; right: boolean },
  ): ScrollDirection {
    const hotZone = clientW * WAVEFORM_HOT_ZONE_RATIO;
    const mouseInContainer = lastMouseX - scrollEl.getBoundingClientRect().left;
    const rightBoundary = clientW - hotZone;

    if (mouseInContainer > rightBoundary && can.right) {
      return { dir: 'right', t: hotZoneIntensity(mouseInContainer - rightBoundary, hotZone) };
    }
    if (mouseInContainer < hotZone && can.left) {
      return { dir: 'left', t: hotZoneIntensity(hotZone - mouseInContainer, hotZone) };
    }
    return { dir: null, t: 0 };
  }

  function detectEdgeProximityScroll(
    scrollEl: HTMLElement,
    region: RegionInstance,
    clientW: number,
    scrollW: number,
    can: { left: boolean; right: boolean },
  ): ScrollDirection {
    const hotZone = clientW * WAVEFORM_HOT_ZONE_RATIO;
    const mouseDelta = lastMouseX - prevMouseX;
    const edges: readonly ('start' | 'end')[] = draggingSide === 'drag'
      ? ['start', 'end']
      : draggingSide ? [draggingSide as 'start' | 'end'] : [];

    for (const edge of edges) {
      const time = edge === 'start' ? region.start : region.end;
      const px = (time / options.duration.value) * scrollW;
      const distFromRight = (scrollEl.scrollLeft + clientW) - px;
      const distFromLeft = px - scrollEl.scrollLeft;

      if (distFromRight < hotZone && mouseDelta > 0 && can.right) {
        return { dir: 'right', t: hotZoneIntensity(hotZone - distFromRight, hotZone) };
      }
      if (distFromLeft < hotZone && mouseDelta < 0 && can.left) {
        return { dir: 'left', t: hotZoneIntensity(hotZone - distFromLeft, hotZone) };
      }
    }

    return { dir: null, t: 0 };
  }

  function calculateScrollDirection(
    scrollEl: HTMLElement,
    region: RegionInstance,
    clientW: number,
    scrollW: number,
  ): ScrollDirection {
    const can = canScroll(scrollEl, scrollW);

    return inHotZone
      ? detectHotZoneScroll(scrollEl, clientW, can)
      : detectEdgeProximityScroll(scrollEl, region, clientW, scrollW, can);
  }

  // --- Region position updates ---

  function updateRegionPosition(region: RegionInstance, timeDelta: number) {
    const newStart = Math.max(0, region.start + timeDelta);
    const newEnd = Math.min(options.duration.value, region.end + timeDelta);

    if (draggingSide === 'drag') {
      if (newEnd <= options.duration.value && newStart >= 0) {
        region.setOptions({ start: newStart, end: newEnd });
      }
    } else if (draggingSide === 'end') {
      region.setOptions({ end: newEnd });
    } else if (draggingSide === 'start') {
      region.setOptions({ start: newStart });
    }
  }

  function applyAutoScroll(
    scrollEl: HTMLElement,
    region: RegionInstance,
    scrollW: number,
    dir: 'left' | 'right',
    t: number,
  ) {
    const maxSpeed = scrollW * WAVEFORM_MAX_SPEED_RATIO;
    const speed = (WAVEFORM_MIN_SPEED_FACTOR + t * (1 - WAVEFORM_MIN_SPEED_FACTOR)) * maxSpeed;

    const scrollBefore = scrollEl.scrollLeft;
    scrollEl.scrollLeft += dir === 'right' ? speed : -speed;
    const scrollDelta = scrollEl.scrollLeft - scrollBefore;
    const timeDelta = (scrollDelta / scrollW) * options.duration.value;

    if (timeDelta !== 0) {
      updateRegionPosition(region, timeDelta);
      scheduleRefUpdate(region);
    }
  }

  function snapToMouse(scrollEl: HTMLElement, region: RegionInstance, scrollW: number) {
    const mouseInContainer = lastMouseX - scrollEl.getBoundingClientRect().left;
    const timeAtMouse = ((scrollEl.scrollLeft + mouseInContainer) / scrollW) * options.duration.value;
    const clampedTime = _.clamp(timeAtMouse, 0, options.duration.value);

    if (draggingSide === 'end') {
      region.setOptions({ end: Math.max(region.start + options.minDuration(), clampedTime) });
    } else if (draggingSide === 'start') {
      region.setOptions({ start: Math.min(region.end - options.minDuration(), clampedTime) });
    } else if (draggingSide === 'drag') {
      const regionLen = region.end - region.start;
      let newStart = clampedTime - regionLen / 2;
      let newEnd = clampedTime + regionLen / 2;
      if (newStart < 0) { newStart = 0; newEnd = regionLen; }
      if (newEnd > options.duration.value) { newEnd = options.duration.value; newStart = options.duration.value - regionLen; }
      region.setOptions({ start: newStart, end: newEnd });
    }

    scheduleRefUpdate(region);
  }

  // --- RAF loop ---

  function tick() {
    const region = options.getActiveRegion();
    if (!draggingSide || !region || !options.duration.value) return;

    const scrollEl = options.getScrollEl();
    if (!scrollEl) { scrollRaf = requestAnimationFrame(tick); return; }

    const clientW = scrollEl.clientWidth;
    const scrollW = scrollEl.scrollWidth;
    if (scrollW <= clientW) { scrollRaf = requestAnimationFrame(tick); return; }

    const { dir, t } = calculateScrollDirection(scrollEl, region, clientW, scrollW);

    if (dir) {
      if (!inHotZone) {
        inHotZone = true;
        blockRegionInput();
      }
      applyAutoScroll(scrollEl, region, scrollW, dir, t);
    } else if (inHotZone) {
      inHotZone = false;
      snapToMouse(scrollEl, region, scrollW);
      restoreRegionInput();
    }

    scrollRaf = requestAnimationFrame(tick);
  }

  // --- Lifecycle ---

  function cancelAllFrames() {
    cancelAnimationFrame(scrollRaf);
    cancelAnimationFrame(refUpdateRaf);
    scrollRaf = 0;
    refUpdateRaf = 0;
  }

  function start(side: DragSide) {
    cancelAnimationFrame(scrollRaf);
    draggingSide = side;
    freshMouse = false;
    document.addEventListener('pointermove', onMouseTrack);
    setDragCursor(side);
    scrollRaf = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAllFrames();
    document.removeEventListener('pointermove', onMouseTrack);
    if (inHotZone) restoreRegionInput();
    inHotZone = false;
    draggingSide = null;
    setDragCursor(null);
    flushRefUpdate();
  }

  function cleanup() {
    cancelAllFrames();
    document.removeEventListener('pointermove', onMouseTrack);
    if (origOnMove) restoreRegionInput();
    inHotZone = false;
    draggingSide = null;
    document.body.style.cursor = '';
    origOnMove = null;
    origOnResize = null;
  }

  return { start, stop, cleanup };
}
