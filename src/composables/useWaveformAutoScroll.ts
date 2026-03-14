import { type Ref } from 'vue';
import _ from 'lodash';
import {
  WAVEFORM_HOT_ZONE_RATIO,
  WAVEFORM_MAX_SPEED_RATIO,
  WAVEFORM_MIN_SPEED_FACTOR,
} from '@/enums/waveform';
import { roundToHundredths } from '@/utils/time';

type RegionInstance = { start: number; end: number; setOptions: (opts: Record<string, unknown>) => void; onMove: (dx: number) => void; onResize: (dx: number, side: string) => void };

export interface UseWaveformAutoScrollOptions {
  getActiveRegion: () => RegionInstance | null;
  getScrollEl: () => HTMLElement | null;
  duration: Ref<number>;
  startTime: Ref<number>;
  endTime: Ref<number>;
  minDuration: () => number;
}

export interface UseWaveformAutoScrollReturn {
  start: (side: 'start' | 'end' | 'drag') => void;
  stop: () => void;
  cleanup: () => void;
}

export function useWaveformAutoScroll(options: UseWaveformAutoScrollOptions): UseWaveformAutoScrollReturn {
  let draggingSide: 'start' | 'end' | 'drag' | null = null;
  let scrollRaf = 0;
  let inHotZone = false;
  let lastMouseX = 0;
  let prevMouseX = 0;
  let freshMouse = false;

  let origOnMove: ((dx: number) => void) | null = null;
  let origOnResize: ((dx: number, side: string) => void) | null = null;

  function setDragCursor(side: 'start' | 'end' | 'drag' | null) {
    if (side === 'start' || side === 'end') {
      document.body.style.cursor = 'ew-resize';
    } else if (side === 'drag') {
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = '';
    }
  }

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

  function calculateScrollDirection(
    scrollEl: HTMLElement,
    activeRegion: RegionInstance,
    clientW: number,
    scrollW: number,
  ): { dir: 'left' | 'right' | null; t: number } {
    const hotZone = clientW * WAVEFORM_HOT_ZONE_RATIO;
    const rect = scrollEl.getBoundingClientRect();
    const mouseInContainer = lastMouseX - rect.left;
    const rightBoundary = clientW - hotZone;
    const canScrollRight = scrollEl.scrollLeft < scrollW - clientW - 0.5;
    const canScrollLeft = scrollEl.scrollLeft > 0.5;

    if (inHotZone) {
      if (mouseInContainer > rightBoundary && canScrollRight) {
        return { dir: 'right', t: Math.min((mouseInContainer - rightBoundary) / hotZone, 1) };
      }
      if (mouseInContainer < hotZone && canScrollLeft) {
        return { dir: 'left', t: Math.min((hotZone - mouseInContainer) / hotZone, 1) };
      }
      return { dir: null, t: 0 };
    }

    const mouseDelta = lastMouseX - prevMouseX;
    const edges = draggingSide === 'drag' ? (['start', 'end'] as const) : draggingSide ? [draggingSide] : [];

    for (const edge of edges) {
      const time = edge === 'start' ? activeRegion.start : activeRegion.end;
      const px = (time / options.duration.value) * scrollW;
      const distFromRight = (scrollEl.scrollLeft + clientW) - px;
      const distFromLeft = px - scrollEl.scrollLeft;

      if (distFromRight < hotZone && mouseDelta > 0 && canScrollRight) {
        return { dir: 'right', t: Math.min((hotZone - distFromRight) / hotZone, 1) };
      }
      if (distFromLeft < hotZone && mouseDelta < 0 && canScrollLeft) {
        return { dir: 'left', t: Math.min((hotZone - distFromLeft) / hotZone, 1) };
      }
    }

    return { dir: null, t: 0 };
  }

  function applyAutoScroll(
    scrollEl: HTMLElement,
    activeRegion: RegionInstance,
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
      const newStart = Math.max(0, activeRegion.start + timeDelta);
      const newEnd = Math.min(options.duration.value, activeRegion.end + timeDelta);
      if (draggingSide === 'drag') {
        if (newEnd <= options.duration.value && newStart >= 0) {
          activeRegion.setOptions({ start: newStart, end: newEnd });
        }
      } else if (draggingSide === 'end') {
        activeRegion.setOptions({ end: newEnd });
      } else if (draggingSide === 'start') {
        activeRegion.setOptions({ start: newStart });
      }
      options.startTime.value = roundToHundredths(activeRegion.start);
      options.endTime.value = roundToHundredths(activeRegion.end);
    }
  }

  function snapToMouse(scrollEl: HTMLElement, activeRegion: RegionInstance, scrollW: number) {
    const rect = scrollEl.getBoundingClientRect();
    const mouseInContainer = lastMouseX - rect.left;
    const timeAtMouse = ((scrollEl.scrollLeft + mouseInContainer) / scrollW) * options.duration.value;
    const clampedTime = _.clamp(timeAtMouse, 0, options.duration.value);

    if (draggingSide === 'end') {
      const newEnd = Math.max(activeRegion.start + options.minDuration(), clampedTime);
      activeRegion.setOptions({ end: newEnd });
    } else if (draggingSide === 'start') {
      const newStart = Math.min(activeRegion.end - options.minDuration(), clampedTime);
      activeRegion.setOptions({ start: newStart });
    } else if (draggingSide === 'drag') {
      const regionLen = activeRegion.end - activeRegion.start;
      const mid = clampedTime;
      let newStart = mid - regionLen / 2;
      let newEnd = mid + regionLen / 2;
      if (newStart < 0) { newStart = 0; newEnd = regionLen; }
      if (newEnd > options.duration.value) { newEnd = options.duration.value; newStart = options.duration.value - regionLen; }
      activeRegion.setOptions({ start: newStart, end: newEnd });
    }

    options.startTime.value = roundToHundredths(activeRegion.start);
    options.endTime.value = roundToHundredths(activeRegion.end);
  }

  function start(side: 'start' | 'end' | 'drag') {
    cancelAnimationFrame(scrollRaf);
    draggingSide = side;
    freshMouse = false;
    document.addEventListener('pointermove', onMouseTrack);
    setDragCursor(side);

    function tick() {
      const activeRegion = options.getActiveRegion();
      if (!draggingSide || !activeRegion || !options.duration.value) return;

      const scrollEl = options.getScrollEl();
      if (!scrollEl) { scrollRaf = requestAnimationFrame(tick); return; }

      const clientW = scrollEl.clientWidth;
      const scrollW = scrollEl.scrollWidth;
      if (scrollW <= clientW) { scrollRaf = requestAnimationFrame(tick); return; }

      const { dir, t } = calculateScrollDirection(scrollEl, activeRegion, clientW, scrollW);

      if (dir) {
        if (!inHotZone) {
          inHotZone = true;
          blockRegionInput();
        }
        applyAutoScroll(scrollEl, activeRegion, scrollW, dir, t);
      } else if (inHotZone) {
        inHotZone = false;
        snapToMouse(scrollEl, activeRegion, scrollW);
        restoreRegionInput();
      }

      scrollRaf = requestAnimationFrame(tick);
    }

    scrollRaf = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(scrollRaf);
    scrollRaf = 0;
    document.removeEventListener('pointermove', onMouseTrack);
    if (inHotZone) restoreRegionInput();
    inHotZone = false;
    draggingSide = null;
    setDragCursor(null);
  }

  function cleanup() {
    cancelAnimationFrame(scrollRaf);
    scrollRaf = 0;
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
