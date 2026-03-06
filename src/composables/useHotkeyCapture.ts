import { ref, computed } from 'vue';
import _ from 'lodash';
import { MODIFIER_KEYS, MOUSE_BUTTON_LABELS, MOUSE_BUTTONS_REQUIRING_MODIFIER, mapKey } from '../enums/hotkeys';
import { hotkeySuspend } from '../services/api';

function blockEvent(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}

export function useHotkeyCapture(
  currentHotkey: () => string | null,
  usedHotkeys: () => Map<string, string>,
  ownerName: () => string
) {
  const captured = ref<string | null>(currentHotkey());
  const listening = ref(false);

  const conflict = computed(() => {
    if (!captured.value) return null;
    const owner = usedHotkeys().get(captured.value);
    if (owner && owner !== ownerName()) return owner;
    return null;
  });

  function addGlobalBlockers() {
    window.addEventListener('mouseup', blockEvent, true);
    window.addEventListener('auxclick', blockEvent, true);
    window.addEventListener('contextmenu', blockEvent, true);
  }

  function removeGlobalBlockers() {
    window.removeEventListener('mouseup', blockEvent, true);
    window.removeEventListener('auxclick', blockEvent, true);
    window.removeEventListener('contextmenu', blockEvent, true);
  }

  function startListening() {
    listening.value = true;
    hotkeySuspend(true);
    addGlobalBlockers();
  }

  function resetCapture(hotkey: string | null) {
    captured.value = hotkey;
  }

  function finishCapture(value: string) {
    captured.value = value;
    listening.value = false;
    hotkeySuspend(false);
    window.addEventListener('mouseup', () => removeGlobalBlockers(), { once: true, capture: true });
  }

  function onKeyDown(e: KeyboardEvent): boolean {
    if (!listening.value) return false;
    e.preventDefault();
    e.stopPropagation();

    if (_.includes(MODIFIER_KEYS, e.key)) return false;

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    const key = mapKey(e);
    if (key) parts.push(key);

    if (parts.length > 0) {
      finishCapture(parts.join('+'));
      return true;
    }
    return false;
  }

  function onMouseDown(e: MouseEvent): boolean {
    if (!listening.value) return false;

    const label = MOUSE_BUTTON_LABELS[e.button];
    if (!label) return false;

    const hasModifier = e.ctrlKey || e.shiftKey || e.altKey;
    const needsModifier = _.includes(MOUSE_BUTTONS_REQUIRING_MODIFIER, e.button);
    if (needsModifier && !hasModifier) return false;

    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    parts.push(label);

    finishCapture(parts.join('+'));
    return true;
  }

  function stopListening() {
    if (listening.value) {
      listening.value = false;
      hotkeySuspend(false);
      removeGlobalBlockers();
    }
  }

  return {
    captured,
    listening,
    conflict,
    startListening,
    stopListening,
    resetCapture,
    onKeyDown,
    onMouseDown,
  };
}
