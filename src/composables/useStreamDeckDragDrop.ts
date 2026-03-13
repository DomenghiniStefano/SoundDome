import { ref } from 'vue';
import _ from 'lodash';
import type { StreamDeckContext } from '@/composables/useStreamDeckContext';
import { StreamDeckActionType, LCD_KEY_COUNT } from '@/enums/streamdeck';

interface DragContext {
  source: 'grid' | 'folder-modal';
  keyIndex: number;
}

export function useStreamDeckDragDrop(ctx: StreamDeckContext) {
  const { streamDeck, editingFolderIndex, editingPageIndex, currentButtons, folderModalIndex, folderModalPage, folderModalButtons } = ctx;

  const dragCtx = ref<DragContext | null>(null);
  const dragOver = ref<number | null>(null);
  const dragOverZone = ref<'center' | 'edge' | null>(null);
  const dragOverTarget = ref<'grid' | 'folder-modal' | null>(null);
  const folderModalDragOver = ref<number | null>(null);

  function isFolderEmpty(folderIdx: number): boolean {
    const folder = streamDeck.folders[folderIdx];
    if (!folder) return true;
    return _.every(folder.pages, (page) => _.isEmpty(page.buttons));
  }

  function cleanupEmptyFolder(folderIdx: number) {
    if (!isFolderEmpty(folderIdx)) return;
    if (folderModalIndex.value === folderIdx) {
      folderModalIndex.value = null;
    }
    streamDeck.removeFolder(folderIdx);
  }

  function onDragStart(e: DragEvent, keyIndex: number, source: 'grid' | 'folder-modal' = 'grid') {
    dragCtx.value = { source, keyIndex };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(keyIndex));
    }
  }

  function onDragOver(e: DragEvent, keyIndex: number, target: 'grid' | 'folder-modal' = 'grid') {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dragOverTarget.value = target;

    if (target === 'folder-modal') {
      folderModalDragOver.value = keyIndex;
      dragOver.value = null;
      dragOverZone.value = null;
    } else {
      dragOver.value = keyIndex;
      folderModalDragOver.value = null;

      const hasButton = !!currentButtons.value[String(keyIndex)];
      if (hasButton && e.currentTarget instanceof HTMLElement) {
        const rect = e.currentTarget.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width;
        const relY = (e.clientY - rect.top) / rect.height;
        const inCenter = relX > 0.2 && relX < 0.8 && relY > 0.2 && relY < 0.8;
        dragOverZone.value = inCenter ? 'center' : 'edge';
      } else {
        dragOverZone.value = null;
      }
    }
  }

  function onDragLeave(target: 'grid' | 'folder-modal' = 'grid') {
    if (target === 'folder-modal') {
      folderModalDragOver.value = null;
    } else {
      dragOver.value = null;
      dragOverZone.value = null;
    }
  }

  function onDragEnd() {
    dragCtx.value = null;
    dragOver.value = null;
    dragOverZone.value = null;
    dragOverTarget.value = null;
    folderModalDragOver.value = null;
  }

  function removeFromSource(dc: DragContext, mapping: StreamDeckButtonMapping | null) {
    if (dc.source === 'grid') {
      if (editingFolderIndex.value !== null) {
        streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, dc.keyIndex, mapping);
      } else {
        streamDeck.setButtonMapping(editingPageIndex.value, dc.keyIndex, mapping);
      }
    } else if (dc.source === 'folder-modal' && folderModalIndex.value !== null) {
      streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, dc.keyIndex, mapping);
    }
  }

  function getSourceMapping(dc: DragContext): StreamDeckButtonMapping | null {
    if (dc.source === 'grid') {
      return currentButtons.value[String(dc.keyIndex)] || null;
    } else if (dc.source === 'folder-modal' && folderModalIndex.value !== null) {
      return folderModalButtons.value[String(dc.keyIndex)] || null;
    }
    return null;
  }

  async function onDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    const dropZone = dragOverZone.value;
    dragOver.value = null;
    dragOverZone.value = null;
    folderModalDragOver.value = null;
    const dc = dragCtx.value;
    dragCtx.value = null;
    if (!dc) return;

    const sourceMapping = getSourceMapping(dc);
    if (!sourceMapping) return;

    // Cross-grid: from folder modal → main grid
    if (dc.source === 'folder-modal' && folderModalIndex.value !== null) {
      const srcFolderIdx = folderModalIndex.value;
      const targetMapping = currentButtons.value[String(targetIndex)] || null;
      if (!targetMapping) {
        if (editingFolderIndex.value !== null) {
          streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, targetIndex, sourceMapping);
        } else {
          streamDeck.setButtonMapping(editingPageIndex.value, targetIndex, sourceMapping);
        }
        removeFromSource(dc, null);
      } else {
        if (editingFolderIndex.value !== null) {
          streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, targetIndex, sourceMapping);
        } else {
          streamDeck.setButtonMapping(editingPageIndex.value, targetIndex, sourceMapping);
        }
        removeFromSource(dc, targetMapping);
      }
      cleanupEmptyFolder(srcFolderIdx);
      await streamDeck.saveMappings();
      return;
    }

    // Same grid (source === 'grid')
    if (dc.keyIndex === targetIndex) return;
    const targetMapping = currentButtons.value[String(targetIndex)] || null;

    // Dropping onto center of a folder button → add source to that folder
    if (targetMapping && targetMapping.type === StreamDeckActionType.FOLDER && targetMapping.folderIndex !== undefined && dropZone === 'center') {
      const folder = streamDeck.folders[targetMapping.folderIndex];
      if (folder) {
        const folderButtons = folder.pages[0]?.buttons || {};
        let slot = -1;
        for (let i = 0; i < LCD_KEY_COUNT; i++) {
          if (!folderButtons[String(i)]) { slot = i; break; }
        }
        if (slot >= 0) {
          streamDeck.setFolderButtonMapping(targetMapping.folderIndex, 0, slot, { ...sourceMapping });
          removeFromSource(dc, null);
          await streamDeck.saveMappings();
          return;
        }
      }
    }

    // Dropping onto empty slot → just move
    if (!targetMapping) {
      if (editingFolderIndex.value !== null) {
        streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, targetIndex, sourceMapping);
      } else {
        streamDeck.setButtonMapping(editingPageIndex.value, targetIndex, sourceMapping);
      }
      removeFromSource(dc, null);
      await streamDeck.saveMappings();
      return;
    }

    // Dropping two non-folder buttons together on center → create a new folder with both
    if (dropZone === 'center' && sourceMapping.type !== StreamDeckActionType.FOLDER && targetMapping.type !== StreamDeckActionType.FOLDER) {
      const folderName = `Folder ${streamDeck.folders.length + 1}`;
      streamDeck.addFolder(folderName);
      const newFolderIdx = streamDeck.folders.length - 1;

      streamDeck.setFolderButtonMapping(newFolderIdx, 0, 0, { ...sourceMapping });
      streamDeck.setFolderButtonMapping(newFolderIdx, 0, 1, { ...targetMapping });

      const folderMapping: StreamDeckButtonMapping = {
        type: StreamDeckActionType.FOLDER,
        folderIndex: newFolderIdx,
        label: folderName,
      };
      if (editingFolderIndex.value !== null) {
        streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, targetIndex, folderMapping);
      } else {
        streamDeck.setButtonMapping(editingPageIndex.value, targetIndex, folderMapping);
      }
      removeFromSource(dc, null);
      await streamDeck.saveMappings();
      return;
    }

    // Default: swap the two buttons
    if (editingFolderIndex.value !== null) {
      streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, targetIndex, sourceMapping);
    } else {
      streamDeck.setButtonMapping(editingPageIndex.value, targetIndex, sourceMapping);
    }
    removeFromSource(dc, targetMapping);
    await streamDeck.saveMappings();
  }

  // Drop on folder modal grid
  async function onFolderModalDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    folderModalDragOver.value = null;
    dragOver.value = null;
    dragOverZone.value = null;
    const dc = dragCtx.value;
    dragCtx.value = null;
    if (!dc || folderModalIndex.value === null) return;

    const sourceMapping = getSourceMapping(dc);
    if (!sourceMapping) return;

    const targetMapping = folderModalButtons.value[String(targetIndex)] || null;

    if (dc.source === 'grid') {
      // Cross-grid: from main grid → folder modal
      if (!targetMapping) {
        streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, targetIndex, sourceMapping);
        removeFromSource(dc, null);
      } else {
        streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, targetIndex, sourceMapping);
        removeFromSource(dc, targetMapping);
      }
      await streamDeck.saveMappings();
      return;
    }

    // Same grid (folder-modal → folder-modal)
    if (dc.keyIndex === targetIndex) return;

    if (!targetMapping) {
      streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, targetIndex, sourceMapping);
      streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, dc.keyIndex, null);
    } else {
      streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, targetIndex, sourceMapping);
      streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, dc.keyIndex, targetMapping);
    }
    await streamDeck.saveMappings();
  }

  return {
    dragCtx,
    dragOver,
    dragOverZone,
    dragOverTarget,
    folderModalDragOver,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDragEnd,
    onDrop,
    onFolderModalDrop,
    cleanupEmptyFolder,
    isFolderEmpty,
  };
}
