import { ref } from 'vue';
import type { StreamDeckContext } from '@/composables/useStreamDeckContext';

export function useStreamDeckPages(ctx: StreamDeckContext) {
  const { streamDeck, confirmDialog, t, editingFolderIndex, editingPageIndex, editingPages } = ctx;

  const editingPageName = ref<number | null>(null);
  const editPageNameValue = ref('');

  function switchPage(pageIndex: number) {
    editingPageIndex.value = pageIndex;
  }

  async function addPage() {
    const name = `Page ${editingPages.value.length + 1}`;
    if (editingFolderIndex.value !== null) {
      streamDeck.addFolderPage(editingFolderIndex.value, name);
    } else {
      streamDeck.addPage(name);
    }
    editingPageIndex.value = editingPages.value.length - 1;
    await streamDeck.saveMappings();
  }

  function deletePage(pageIndex: number) {
    if (editingPages.value.length <= 1) return;
    const pageName = editingPages.value[pageIndex].name;
    confirmDialog.show(
      t('streamDeck.deletePage'),
      t('streamDeck.confirmDeletePage', { name: pageName }),
      async () => {
        if (editingFolderIndex.value !== null) {
          streamDeck.removeFolderPage(editingFolderIndex.value, pageIndex);
        } else {
          streamDeck.removePage(pageIndex);
        }
        if (editingPageIndex.value >= editingPages.value.length) {
          editingPageIndex.value = editingPages.value.length - 1;
        }
        await streamDeck.saveMappings();
      }
    );
  }

  function startRenamePage(pageIndex: number) {
    editingPageName.value = pageIndex;
    editPageNameValue.value = editingPages.value[pageIndex].name;
  }

  async function finishRenamePage() {
    if (editingPageName.value === null) return;
    const name = editPageNameValue.value.trim();
    if (name) {
      if (editingFolderIndex.value !== null) {
        streamDeck.renameFolderPage(editingFolderIndex.value, editingPageName.value, name);
      } else {
        streamDeck.renamePage(editingPageName.value, name);
      }
      await streamDeck.saveMappings();
    }
    editingPageName.value = null;
  }

  return {
    editingPageName,
    editPageNameValue,
    switchPage,
    addPage,
    deletePage,
    startRenamePage,
    finishRenamePage,
  };
}
