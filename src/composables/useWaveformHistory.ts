import { ref, computed, type ComputedRef } from 'vue';
import { WAVEFORM_HISTORY_MAX } from '@/enums/waveform';

interface HistoryEntry {
  start: number;
  end: number;
}

export interface UseWaveformHistoryReturn {
  canUndo: ComputedRef<boolean>;
  canRedo: ComputedRef<boolean>;
  push: (start: number, end: number) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  clear: () => void;
}

export function useWaveformHistory(): UseWaveformHistoryReturn {
  const stack = ref<HistoryEntry[]>([]);
  const cursor = ref(-1);

  const canUndo = computed(() => cursor.value > 0);
  const canRedo = computed(() => cursor.value < stack.value.length - 1);

  function isSameEntry(a: HistoryEntry, b: HistoryEntry): boolean {
    return a.start === b.start && a.end === b.end;
  }

  function push(start: number, end: number) {
    const entry: HistoryEntry = { start, end };

    // Skip duplicate of current position
    if (cursor.value >= 0 && isSameEntry(stack.value[cursor.value], entry)) return;

    // Truncate any redo entries ahead of cursor
    stack.value = stack.value.slice(0, cursor.value + 1);
    stack.value.push(entry);

    // Enforce max size
    if (stack.value.length > WAVEFORM_HISTORY_MAX) {
      stack.value = stack.value.slice(stack.value.length - WAVEFORM_HISTORY_MAX);
    }

    cursor.value = stack.value.length - 1;
  }

  function undo(): HistoryEntry | null {
    if (!canUndo.value) return null;
    cursor.value--;
    return stack.value[cursor.value];
  }

  function redo(): HistoryEntry | null {
    if (!canRedo.value) return null;
    cursor.value++;
    return stack.value[cursor.value];
  }

  function clear() {
    stack.value = [];
    cursor.value = -1;
  }

  return { canUndo, canRedo, push, undo, redo, clear };
}
