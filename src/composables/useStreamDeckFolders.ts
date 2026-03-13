import { ref } from 'vue';
import type { StreamDeckContext } from '@/composables/useStreamDeckContext';
import { parseImage } from '@/enums/ui';

export function useStreamDeckFolders(
  ctx: StreamDeckContext,
  dragDrop: { cleanupEmptyFolder: (idx: number) => void }
) {
  const { streamDeck, confirmDialog, t, editingFolderIndex, editingPageIndex, activeTab,
    showButtonModal, selectedKeyIndex, folderModalIndex, folderModalPage, folderModalEditingKey } = ctx;

  const editingFolderName = ref<number | null>(null);
  const editFolderNameValue = ref('');
  const showFolderIconPicker = ref(false);
  const folderIconTarget = ref<number | null>(null);
  const addingFolder = ref(false);
  const newFolderName = ref('');

  function selectFolder(index: number) {
    editingFolderIndex.value = index;
    editingPageIndex.value = 0;
    activeTab.value = 'folders';
  }

  function backToFolders() {
    editingFolderIndex.value = null;
    editingPageIndex.value = 0;
  }

  function startAddFolder() {
    newFolderName.value = `Folder ${streamDeck.folders.length + 1}`;
    addingFolder.value = true;
  }

  async function finishAddFolder() {
    if (!addingFolder.value) return;
    const name = newFolderName.value.trim();
    addingFolder.value = false;
    if (!name) return;
    streamDeck.addFolder(name);
    await streamDeck.saveMappings();
  }

  function deleteFolder(index: number) {
    const folder = streamDeck.folders[index];
    if (!folder) return;
    confirmDialog.show(
      t('streamDeck.deleteFolder'),
      t('streamDeck.confirmDeleteFolder', { name: folder.name }),
      async () => {
        if (editingFolderIndex.value === index) {
          editingFolderIndex.value = null;
          editingPageIndex.value = 0;
        }
        streamDeck.removeFolder(index);
        await streamDeck.saveMappings();
      }
    );
  }

  function startRenameFolder(index: number) {
    editingFolderName.value = index;
    editFolderNameValue.value = streamDeck.folders[index].name;
  }

  async function finishRenameFolder() {
    if (editingFolderName.value === null) return;
    const name = editFolderNameValue.value.trim();
    if (name) {
      streamDeck.renameFolder(editingFolderName.value, name);
      await streamDeck.saveMappings();
    }
    editingFolderName.value = null;
  }

  async function onFolderNameChange(name: string) {
    if (folderModalIndex.value === null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    streamDeck.renameFolder(folderModalIndex.value, trimmed);
    await streamDeck.saveMappings();
  }

  function openFolderIconPicker(index: number) {
    folderIconTarget.value = index;
    showFolderIconPicker.value = true;
  }

  async function onFolderIconSelect(value: string) {
    if (folderIconTarget.value !== null) {
      streamDeck.setFolderIcon(folderIconTarget.value, value);
      await streamDeck.saveMappings();
    }
  }

  function getFolderIconDisplay(icon: string | undefined) {
    return parseImage(icon);
  }

  async function toggleFolderCloseAfterAction() {
    if (folderModalIndex.value === null) return;
    const folder = streamDeck.folders[folderModalIndex.value];
    if (!folder) return;
    folder.closeAfterAction = !folder.closeAfterAction;
    await streamDeck.saveMappings();
  }

  async function setFolderCloseButtonKey(value: string) {
    if (folderModalIndex.value === null) return;
    const folder = streamDeck.folders[folderModalIndex.value];
    if (!folder) return;
    folder.closeButtonKey = value === '' ? null : Number(value);
    await streamDeck.saveMappings();
  }

  function onFolderModalKeyClick(keyIndex: number) {
    folderModalEditingKey.value = keyIndex;
    selectedKeyIndex.value = keyIndex;
    showButtonModal.value = true;
  }

  async function onFolderModalMappingSave(mapping: StreamDeckButtonMapping | null) {
    if (folderModalIndex.value === null || folderModalEditingKey.value === null) return;
    const fIdx = folderModalIndex.value;
    streamDeck.setFolderButtonMapping(fIdx, folderModalPage.value, folderModalEditingKey.value, mapping);
    folderModalEditingKey.value = null;
    showButtonModal.value = false;
    selectedKeyIndex.value = null;
    dragDrop.cleanupEmptyFolder(fIdx);
    await streamDeck.saveMappings();
  }

  return {
    editingFolderName,
    editFolderNameValue,
    showFolderIconPicker,
    folderIconTarget,
    addingFolder,
    newFolderName,
    selectFolder,
    backToFolders,
    startAddFolder,
    finishAddFolder,
    deleteFolder,
    startRenameFolder,
    finishRenameFolder,
    onFolderNameChange,
    openFolderIconPicker,
    onFolderIconSelect,
    getFolderIconDisplay,
    toggleFolderCloseAfterAction,
    setFolderCloseButtonKey,
    onFolderModalKeyClick,
    onFolderModalMappingSave,
  };
}
