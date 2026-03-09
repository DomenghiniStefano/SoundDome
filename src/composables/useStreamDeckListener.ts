import { onMounted, onUnmounted } from 'vue';
import _ from 'lodash';
import { useLibraryStore } from '../stores/library';
import { useStreamDeckStore } from '../stores/streamdeck';
import { useAudio } from './useAudio';
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
      console.log('[StreamDeck] Renderer received button press, id:', id, 'library items:', libraryStore.items.length);
      const item = _.find(libraryStore.items, { id });
      if (!item) {
        console.log('[StreamDeck] Item not found in library store');
        return;
      }
      console.log('[StreamDeck] Playing:', item.name);
      await playLibraryItem(item);
    });

    onStreamdeckConnect(() => {
      streamDeckStore.isConnected = true;
    });

    onStreamdeckDisconnect(() => {
      streamDeckStore.isConnected = false;
    });

    onStreamdeckPageChange((data: { page: number; folder: number | null }) => {
      streamDeckStore.currentPage = data.page;
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
