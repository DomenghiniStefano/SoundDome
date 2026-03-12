import { onMounted, onUnmounted } from 'vue';
import _ from 'lodash';
import { useLibraryStore } from '../stores/library';
import { useStreamDeckStore } from '../stores/streamdeck';
import { useAudio } from './useAudio';
import { log } from '../utils/logger';
import {
  onStreamdeckButtonPress,
  removeStreamdeckButtonPressListener,
  onStreamdeckConnect,
  removeStreamdeckConnectListener,
  onStreamdeckDisconnect,
  removeStreamdeckDisconnectListener,
  onStreamdeckPageChange,
  removeStreamdeckPageChangeListener,
} from '../services/api';

export function useStreamDeckListener() {
  const libraryStore = useLibraryStore();
  const streamDeckStore = useStreamDeckStore();
  const { playLibraryItem } = useAudio();

  onMounted(async () => {
    // Ensure library is loaded so we can find items by ID
    if (_.isEmpty(libraryStore.items)) {
      await libraryStore.load();
    }

    onStreamdeckButtonPress(async (id: string) => {
      log.debug('[StreamDeck] Renderer received button press, id:', id, 'library items:', libraryStore.items.length);
      const item = _.find(libraryStore.items, { id });
      if (!item) {
        log.debug('[StreamDeck] Item not found in library store');
        return;
      }
      log.debug('[StreamDeck] Playing:', item.name);
      await playLibraryItem(item);
    });

    onStreamdeckConnect(() => {
      streamDeckStore.setConnected(true);
    });

    onStreamdeckDisconnect(() => {
      streamDeckStore.setConnected(false);
    });

    onStreamdeckPageChange((data: { page: number; folder: number | null }) => {
      streamDeckStore.setCurrentPage(data.page);
    });

    streamDeckStore.load();
  });

  onUnmounted(() => {
    removeStreamdeckButtonPressListener();
    removeStreamdeckConnectListener();
    removeStreamdeckDisconnectListener();
    removeStreamdeckPageChangeListener();
  });
}
