import type { Directive } from 'vue';

const TOOLTIP_OFFSET = 8;
const SHOW_DELAY = 400;
const HIDE_DELAY = 0;

let tooltipEl: HTMLDivElement | null = null;
let showTimeout: ReturnType<typeof setTimeout> | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

function getTooltipEl(): HTMLDivElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'v-tooltip';
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function clearTimers() {
  if (showTimeout) { clearTimeout(showTimeout); showTimeout = null; }
  if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
}

function position(tip: HTMLDivElement, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 4;

  // Vertical: prefer below, flip above if no room, clamp as last resort
  let top: number;
  const below = rect.bottom + TOOLTIP_OFFSET;
  const above = rect.top - tipRect.height - TOOLTIP_OFFSET;
  const fitsBelow = below + tipRect.height <= vh - pad;
  const fitsAbove = above >= pad;

  if (fitsBelow) {
    top = below;
  } else if (fitsAbove) {
    top = above;
  } else {
    // Neither side fits — pick whichever has more room and clamp
    top = (vh - rect.bottom > rect.top) ? below : above;
    top = Math.max(pad, Math.min(top, vh - tipRect.height - pad));
  }

  // Horizontal: center on element, then clamp to viewport
  let left = rect.left + (rect.width - tipRect.width) / 2;
  left = Math.max(pad, Math.min(left, vw - tipRect.width - pad));

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function show(el: HTMLElement) {
  const text = (el as any).__tooltipText;
  if (!text) return;

  clearTimers();
  showTimeout = setTimeout(() => {
    const tip = getTooltipEl();
    tip.textContent = text;
    tip.style.display = 'block';
    tip.style.opacity = '0';

    position(tip, el);
    tip.style.opacity = '1';
  }, SHOW_DELAY);
}

function hide() {
  clearTimers();
  hideTimeout = setTimeout(() => {
    if (tooltipEl) {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.display = 'none';
    }
  }, HIDE_DELAY);
}

function onMouseEnter(this: HTMLElement) { show(this); }
function onMouseLeave() { hide(); }
function onMouseDown() { hide(); }

export const vTooltip: Directive<HTMLElement, string | undefined> = {
  mounted(el, { value }) {
    if (!value) return;
    (el as any).__tooltipText = value;
    // Suppress native tooltip
    el.removeAttribute('title');
    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mousedown', onMouseDown);
  },
  updated(el, { value }) {
    (el as any).__tooltipText = value || '';
    if (!value) {
      hide();
    }
  },
  unmounted(el) {
    el.removeEventListener('mouseenter', onMouseEnter);
    el.removeEventListener('mouseleave', onMouseLeave);
    el.removeEventListener('mousedown', onMouseDown);
    hide();
  }
};
