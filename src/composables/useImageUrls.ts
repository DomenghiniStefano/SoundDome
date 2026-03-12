import { ref, watch } from 'vue';
import { isFileImage } from '../enums/ui';
import { useLibraryStore } from '../stores/library';

export function useImageUrls() {
  const libraryStore = useLibraryStore();
  const imageUrls = ref<Record<string, string>>({});

  async function loadImageUrls() {
    const urls: Record<string, string> = {};
    for (const item of libraryStore.items) {
      if (isFileImage(item.image)) {
        const imgPath = await libraryStore.getFilePath(item.image!);
        urls[item.id] = `file://${imgPath.replace(/\\/g, '/')}`;
      }
    }
    imageUrls.value = urls;
  }

  watch(() => libraryStore.items, loadImageUrls, { deep: true, immediate: true });

  return {
    imageUrls,
    loadImageUrls,
  };
}
