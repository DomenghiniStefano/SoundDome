import { ref, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import _ from 'lodash';
import { useStreamDeckStore } from '@/stores/streamdeck';
import { useLibraryStore } from '@/stores/library';
import { useConfirmDialog } from '@/composables/useConfirmDialog';
import { StreamDeckActionType, SYSTEM_STAT_LABELS } from '@/enums/streamdeck';
import { parseImage } from '@/enums/ui';
import type { IconNameValue } from '@/enums/icons';

export interface StreamDeckContext {
  streamDeck: ReturnType<typeof useStreamDeckStore>;
  libraryStore: ReturnType<typeof useLibraryStore>;
  confirmDialog: ReturnType<typeof useConfirmDialog>;
  t: (key: string, params?: Record<string, unknown>) => string;
  editingFolderIndex: Ref<number | null>;
  editingPageIndex: Ref<number>;
  activeTab: Ref<'pages' | 'folders'>;
  showButtonModal: Ref<boolean>;
  selectedKeyIndex: Ref<number | null>;
  folderModalIndex: Ref<number | null>;
  folderModalPage: Ref<number>;
  folderModalEditingKey: Ref<number | null>;
  editingPages: ComputedRef<{ name: string; buttons: Record<string, StreamDeckButtonMapping> }[]>;
  currentButtons: ComputedRef<Record<string, StreamDeckButtonMapping>>;
  folderModalButtons: ComputedRef<Record<string, StreamDeckButtonMapping>>;
  folderModalPages: ComputedRef<{ name: string; buttons: Record<string, StreamDeckButtonMapping> }[]>;
  selectedMapping: ComputedRef<StreamDeckButtonMapping | null>;
  folderModalSelectedMapping: ComputedRef<StreamDeckButtonMapping | null>;
  getButtonInfoFrom: (buttons: Record<string, StreamDeckButtonMapping>, keyIndex: number) => { label: string; icon: IconNameValue | null; emoji: string | null; type: string };
  getButtonInfo: (keyIndex: number) => { label: string; icon: IconNameValue | null; emoji: string | null; type: string };
  getFolderModalButtonInfo: (keyIndex: number) => { label: string; icon: IconNameValue | null; emoji: string | null; type: string };
  getTypeClass: (keyIndex: number) => string;
  getFolderModalTypeClass: (keyIndex: number) => string;
}

export function useStreamDeckContext(t: (key: string, params?: Record<string, unknown>) => string): StreamDeckContext {
  const streamDeck = useStreamDeckStore();
  const libraryStore = useLibraryStore();
  const confirmDialog = useConfirmDialog();

  const editingFolderIndex = ref<number | null>(null);
  const editingPageIndex = ref(0);
  const activeTab = ref<'pages' | 'folders'>('pages');

  const showButtonModal = ref(false);
  const selectedKeyIndex = ref<number | null>(null);

  const folderModalIndex = ref<number | null>(null);
  const folderModalPage = ref(0);
  const folderModalEditingKey = ref<number | null>(null);

  const editingPages = computed(() => {
    if (editingFolderIndex.value !== null) {
      const folder = streamDeck.folders[editingFolderIndex.value];
      return folder ? folder.pages : [];
    }
    return streamDeck.pages;
  });

  const currentButtons = computed(() => {
    if (editingFolderIndex.value !== null) {
      const folder = streamDeck.folders[editingFolderIndex.value];
      if (folder && editingPageIndex.value < folder.pages.length) {
        return folder.pages[editingPageIndex.value].buttons;
      }
      return {};
    }
    if (editingPageIndex.value < streamDeck.pages.length) {
      return streamDeck.pages[editingPageIndex.value].buttons;
    }
    return {};
  });

  const folderModalButtons = computed(() => {
    if (folderModalIndex.value === null) return {};
    const folder = streamDeck.folders[folderModalIndex.value];
    if (!folder || folderModalPage.value >= folder.pages.length) return {};
    const buttons = folder.pages[folderModalPage.value].buttons;
    if (folder.closeButtonKey !== undefined && folder.closeButtonKey !== null) {
      const key = String(folder.closeButtonKey);
      if (!buttons[key]) {
        return { ...buttons, [key]: { type: StreamDeckActionType.GO_BACK } };
      }
    }
    return buttons;
  });

  const folderModalPages = computed(() => {
    if (folderModalIndex.value === null) return [];
    const folder = streamDeck.folders[folderModalIndex.value];
    return folder ? folder.pages : [];
  });

  const folderModalSelectedMapping = computed<StreamDeckButtonMapping | null>(() => {
    if (folderModalEditingKey.value === null) return null;
    return folderModalButtons.value[String(folderModalEditingKey.value)] || null;
  });

  const selectedMapping = computed<StreamDeckButtonMapping | null>(() => {
    if (folderModalEditingKey.value !== null) return folderModalSelectedMapping.value;
    if (selectedKeyIndex.value === null) return null;
    return currentButtons.value[String(selectedKeyIndex.value)] || null;
  });

  function getButtonInfoFrom(buttons: Record<string, StreamDeckButtonMapping>, keyIndex: number): { label: string; icon: IconNameValue | null; emoji: string | null; type: string } {
    const mapping = buttons[String(keyIndex)];
    if (mapping) {
      switch (mapping.type) {
        case StreamDeckActionType.SOUND: {
          if (mapping.itemId) {
            const item = _.find(libraryStore.items, { id: mapping.itemId });
            if (item?.image) {
              const parsed = parseImage(item.image);
              if (parsed.type === 'emoji') return { label: item.name, icon: null, emoji: parsed.value, type: 'sound' };
              if (parsed.type === 'icon') return { label: item.name, icon: parsed.value as IconNameValue, emoji: null, type: 'sound' };
            }
            return { label: item ? item.name : t('streamDeck.unknownSound'), icon: 'music' as IconNameValue, emoji: null, type: 'sound' };
          }
          return { label: t('streamDeck.sound'), icon: 'music' as IconNameValue, emoji: null, type: 'sound' };
        }
        case StreamDeckActionType.STOP_ALL:
          return { label: t('streamDeck.stopAll'), icon: 'stop' as IconNameValue, emoji: null, type: 'action' };
        case StreamDeckActionType.PAGE_NEXT:
          return { label: t('streamDeck.pageNext'), icon: 'play' as IconNameValue, emoji: null, type: 'action' };
        case StreamDeckActionType.PAGE_PREV:
          return { label: t('streamDeck.pagePrev'), icon: 'arrow-back' as IconNameValue, emoji: null, type: 'action' };
        case StreamDeckActionType.FOLDER: {
          let folderName = t('streamDeck.folder');
          let folderIconValue: string | undefined;
          if (mapping.folderIndex !== undefined && mapping.folderIndex < streamDeck.folders.length) {
            const folder = streamDeck.folders[mapping.folderIndex];
            folderName = folder.name;
            folderIconValue = mapping.icon || folder.icon;
          }
          if (folderIconValue) {
            const parsed = parseImage(folderIconValue);
            if (parsed.type === 'emoji') return { label: folderName, icon: null, emoji: parsed.value, type: 'folder' };
            if (parsed.type === 'icon') return { label: folderName, icon: parsed.value as IconNameValue, emoji: null, type: 'folder' };
          }
          return { label: folderName, icon: 'folder' as IconNameValue, emoji: null, type: 'folder' };
        }
        case StreamDeckActionType.GO_BACK:
          return { label: t('streamDeck.goBack'), icon: 'arrow-back' as IconNameValue, emoji: null, type: 'action' };
        case StreamDeckActionType.MEDIA_PLAY_PAUSE:
          return { label: t('streamDeck.mediaPlayPause'), icon: 'play' as IconNameValue, emoji: null, type: 'media' };
        case StreamDeckActionType.MEDIA_NEXT:
          return { label: t('streamDeck.mediaNext'), icon: 'play' as IconNameValue, emoji: null, type: 'media' };
        case StreamDeckActionType.MEDIA_PREV:
          return { label: t('streamDeck.mediaPrev'), icon: 'arrow-back' as IconNameValue, emoji: null, type: 'media' };
        case StreamDeckActionType.MEDIA_VOLUME_UP:
          return { label: t('streamDeck.mediaVolumeUp'), icon: 'volume-high' as IconNameValue, emoji: null, type: 'media' };
        case StreamDeckActionType.MEDIA_VOLUME_DOWN:
          return { label: t('streamDeck.mediaVolumeDown'), icon: 'volume' as IconNameValue, emoji: null, type: 'media' };
        case StreamDeckActionType.MEDIA_MUTE:
          return { label: t('streamDeck.mediaMute'), icon: 'volume-off' as IconNameValue, emoji: null, type: 'media' };
        case StreamDeckActionType.SHORTCUT:
          return { label: mapping.label || mapping.shortcut || t('streamDeck.shortcut'), icon: 'keyboard' as IconNameValue, emoji: null, type: 'shortcut' };
        case StreamDeckActionType.LAUNCH_APP: {
          const appName = mapping.label || (mapping.appPath ? mapping.appPath.split(/[/\\]/).pop()?.replace(/\.exe$/i, '') : t('streamDeck.launchApp'));
          return { label: appName || t('streamDeck.launchApp'), icon: 'open' as IconNameValue, emoji: null, type: 'shortcut' };
        }
        case StreamDeckActionType.SYSTEM_STAT: {
          const st = mapping.statType || '';
          return { label: SYSTEM_STAT_LABELS[st] || t('streamDeck.systemStat'), icon: 'settings' as IconNameValue, emoji: null, type: 'stat' };
        }
      }
    }
    return { label: '', icon: null, emoji: null, type: 'empty' };
  }

  function getButtonInfo(keyIndex: number) {
    return getButtonInfoFrom(currentButtons.value, keyIndex);
  }

  function getFolderModalButtonInfo(keyIndex: number) {
    return getButtonInfoFrom(folderModalButtons.value, keyIndex);
  }

  function getTypeClass(keyIndex: number): string {
    return `type-${getButtonInfo(keyIndex).type}`;
  }

  function getFolderModalTypeClass(keyIndex: number): string {
    return `type-${getFolderModalButtonInfo(keyIndex).type}`;
  }

  return {
    streamDeck,
    libraryStore,
    confirmDialog,
    t,
    editingFolderIndex,
    editingPageIndex,
    activeTab,
    showButtonModal,
    selectedKeyIndex,
    folderModalIndex,
    folderModalPage,
    folderModalEditingKey,
    editingPages,
    currentButtons,
    folderModalButtons,
    folderModalPages,
    selectedMapping,
    folderModalSelectedMapping,
    getButtonInfoFrom,
    getButtonInfo,
    getFolderModalButtonInfo,
    getTypeClass,
    getFolderModalTypeClass,
  };
}
