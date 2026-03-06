import { ref, computed, onBeforeUnmount } from 'vue';
import _ from 'lodash';
import { DRAG_THRESHOLD } from '../enums/constants';

export function useDraggable() {
  const containerRef = ref<HTMLElement>();
  const posX = ref<number | null>(null);
  const posY = ref<number | null>(null);
  const dragging = ref(false);

  let dragStartX = 0;
  let dragStartY = 0;
  let elStartX = 0;
  let elStartY = 0;
  let didDrag = false;
  let elW = 0;
  let elH = 0;

  function onPointerDown(e: PointerEvent) {
    const el = containerRef.value;
    if (!el) return;

    dragging.value = true;
    didDrag = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = el.getBoundingClientRect();
    elStartX = rect.left;
    elStartY = rect.top;
    elW = rect.width;
    elH = rect.height;

    el.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging.value) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) didDrag = true;
    posX.value = _.clamp(elStartX + dx, 0, window.innerWidth - elW);
    posY.value = _.clamp(elStartY + dy, 0, window.innerHeight - elH);
  }

  function onPointerUp() {
    dragging.value = false;
  }

  function wasDragged(): boolean {
    return didDrag;
  }

  function resetPosition() {
    posX.value = null;
    posY.value = null;
  }

  const style = computed(() => {
    if (posX.value !== null && posY.value !== null) {
      return {
        top: posY.value + 'px',
        left: posX.value + 'px',
        right: 'auto',
        bottom: 'auto',
      };
    }
    return {};
  });

  onBeforeUnmount(() => {
    dragging.value = false;
  });

  return {
    containerRef,
    dragging,
    style,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    wasDragged,
    resetPosition,
  };
}
