import { onMounted, onUnmounted } from 'vue';
import _ from 'lodash';
import { useLibraryStore } from '../stores/library';
import { useAudio } from './useAudio';
import {
  onHotkeyPlay,
  removeHotkeyPlayListener,
  onHotkeyStop,
  removeHotkeyStopListener
} from '../services/api';

export function useHotkeyListener() {
  const libraryStore = useLibraryStore();
  const { playLibraryItem, stopEverything } = useAudio();

  onMounted(() => {
    onHotkeyStop(() => {
      stopEverything();
    });

    onHotkeyPlay(async (id: string) => {
      const item = _.find(libraryStore.items, { id });
      if (!item) return;
      await playLibraryItem(item);
    });
  });

  onUnmounted(() => {
    removeHotkeyPlayListener();
    removeHotkeyStopListener();
  });
}
