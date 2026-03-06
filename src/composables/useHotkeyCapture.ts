import { ref, computed } from 'vue';
import { MODIFIER_KEYS, mapKey } from '../enums/hotkeys';

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

  function startListening() {
    listening.value = true;
  }

  function resetCapture(hotkey: string | null) {
    captured.value = hotkey;
  }

  function onKeyDown(e: KeyboardEvent): boolean {
    if (!listening.value) return false;
    e.preventDefault();
    e.stopPropagation();

    if ((MODIFIER_KEYS as readonly string[]).includes(e.key)) return false;

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    const key = mapKey(e);
    if (key) parts.push(key);

    if (parts.length > 0) {
      captured.value = parts.join('+');
      listening.value = false;
      return true;
    }
    return false;
  }

  return {
    captured,
    listening,
    conflict,
    startListening,
    resetCapture,
    onKeyDown,
  };
}
