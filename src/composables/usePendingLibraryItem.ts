import { ref, computed, type Ref } from 'vue';
import _ from 'lodash';
import { useLibraryStore } from '../stores/library';
import { VOLUME_ITEM_DEFAULT } from '../enums/constants';
import { isFileImage } from '../enums/ui';

export function usePendingLibraryItem(itemId: Ref<string>) {
  const libraryStore = useLibraryStore();

  const item = computed<LibraryItem | undefined>(() =>
    _.find(libraryStore.items, { id: itemId.value })
  );

  const fileUrl = ref('');
  const pendingImage = ref<string | null>(null);
  const pendingImageUrl = ref<string | null>(null);
  const pendingName = ref('');
  const pendingVolume = ref(VOLUME_ITEM_DEFAULT);
  const pendingHotkey = ref<string | null>(null);
  const pendingFavorite = ref(false);
  const pendingBackupEnabled = ref(true);
  const backups = ref<BackupItem[]>([]);

  function initPending(it: LibraryItem) {
    pendingName.value = it.name;
    pendingImage.value = it.image;
    pendingVolume.value = it.volume;
    pendingHotkey.value = it.hotkey;
    pendingBackupEnabled.value = it.backupEnabled;
    pendingFavorite.value = it.favorite;
  }

  async function loadFileUrl() {
    const id = itemId.value;
    if (_.isEmpty(libraryStore.items)) await libraryStore.load();
    const it = _.find(libraryStore.items, { id });
    if (it) {
      const path = await libraryStore.getFilePath(it.filename);
      fileUrl.value = `file://${path}`;
      backups.value = await libraryStore.listBackups(id);
      initPending(it);
      if (isFileImage(it.image)) {
        const imgPath = await libraryStore.getFilePath(it.image!);
        pendingImageUrl.value = `file://${imgPath}?t=${Date.now()}`;
      }
    }
  }

  return {
    item,
    fileUrl,
    pendingName,
    pendingImage,
    pendingImageUrl,
    pendingVolume,
    pendingHotkey,
    pendingFavorite,
    pendingBackupEnabled,
    backups,
    initPending,
    loadFileUrl,
  };
}
