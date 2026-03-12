<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import PageHeader from '../components/layout/PageHeader.vue';
import VolumeSlider from '../components/settings/VolumeSlider.vue';
import StreamDeckButtonModal from '../components/settings/StreamDeckButtonModal.vue';
import IconPickerModal from '../components/ui/IconPickerModal.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import SwitchToggle from '../components/ui/SwitchToggle.vue';
import { useStreamDeckStore } from '../stores/streamdeck';
import { useLibraryStore } from '../stores/library';
import { useConfirmDialog } from '../composables/useConfirmDialog';
import type { IconNameValue } from '../enums/icons';
import { StreamDeckActionType, SYSTEM_STAT_LABELS, STATS_POLL_INTERVAL_MS, LCD_KEY_COUNT } from '../enums/streamdeck';
import { parseImage } from '../enums/ui';
import { streamdeckSystemStats, streamdeckExportMappings, streamdeckImportMappings, streamdeckResetMappings } from '../services/api';
import ConfirmModal from '../components/ui/ConfirmModal.vue';

const { t } = useI18n();
const streamDeck = useStreamDeckStore();
const libraryStore = useLibraryStore();
const confirmDialog = useConfirmDialog();

const showButtonModal = ref(false);
const showResetConfirm = ref(false);
const selectedKeyIndex = ref<number | null>(null);
const statsInterval = ref<ReturnType<typeof setInterval> | null>(null);
const liveStats = ref<SystemStatsData | null>(null);
const editingPageName = ref<number | null>(null);
const editPageNameValue = ref('');
const editingFolderName = ref<number | null>(null);
const editFolderNameValue = ref('');

// Editing context
const editingFolderIndex = ref<number | null>(null);
const editingPageIndex = ref(0);
const activeTab = ref<'pages' | 'folders'>('pages');

// Folder modal
const folderModalIndex = ref<number | null>(null);
const folderModalPage = ref(0);
const folderModalEditingKey = ref<number | null>(null);

// Folder icon picker
const showFolderIconPicker = ref(false);
const folderIconTarget = ref<number | null>(null);

// Add folder inline
const addingFolder = ref(false);
const newFolderName = ref('');

// Context menu
const contextMenu = ref<{ x: number; y: number; keyIndex: number; source: 'grid' | 'folder-modal' } | null>(null);

function onContextMenu(e: MouseEvent, keyIndex: number, source: 'grid' | 'folder-modal' = 'grid') {
  const buttons = source === 'folder-modal' ? folderModalButtons.value : currentButtons.value;
  if (!buttons[String(keyIndex)]) return;
  e.preventDefault();
  contextMenu.value = { x: e.clientX, y: e.clientY, keyIndex, source };
}

function closeContextMenu() {
  contextMenu.value = null;
}

async function contextMenuDelete() {
  if (!contextMenu.value) return;
  const { keyIndex, source } = contextMenu.value;
  contextMenu.value = null;
  if (source === 'folder-modal' && folderModalIndex.value !== null) {
    const fIdx = folderModalIndex.value;
    streamDeck.setFolderButtonMapping(fIdx, folderModalPage.value, keyIndex, null);
    cleanupEmptyFolder(fIdx);
  } else if (source === 'grid') {
    if (editingFolderIndex.value !== null) {
      streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, keyIndex, null);
    } else {
      streamDeck.setButtonMapping(editingPageIndex.value, keyIndex, null);
    }
  }
  await streamDeck.saveMappings();
}

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

function getButtonInfo(keyIndex: number) {
  return getButtonInfoFrom(currentButtons.value, keyIndex);
}

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

function getTypeClass(keyIndex: number): string {
  return `type-${getButtonInfo(keyIndex).type}`;
}

// Folder modal
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

function getFolderModalButtonInfo(keyIndex: number) {
  return getButtonInfoFrom(folderModalButtons.value, keyIndex);
}

function getFolderModalTypeClass(keyIndex: number): string {
  return `type-${getFolderModalButtonInfo(keyIndex).type}`;
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
  cleanupEmptyFolder(fIdx);
  await streamDeck.saveMappings();
}

const folderModalSelectedMapping = computed<StreamDeckButtonMapping | null>(() => {
  if (folderModalEditingKey.value === null) return null;
  return folderModalButtons.value[String(folderModalEditingKey.value)] || null;
});

// Drag and drop
interface DragContext {
  source: 'grid' | 'folder-modal';
  keyIndex: number;
}
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

function removeFromSource(ctx: DragContext, mapping: StreamDeckButtonMapping | null) {
  if (ctx.source === 'grid') {
    if (editingFolderIndex.value !== null) {
      streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, ctx.keyIndex, mapping);
    } else {
      streamDeck.setButtonMapping(editingPageIndex.value, ctx.keyIndex, mapping);
    }
  } else if (ctx.source === 'folder-modal' && folderModalIndex.value !== null) {
    streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, ctx.keyIndex, mapping);
  }
}

function getSourceMapping(ctx: DragContext): StreamDeckButtonMapping | null {
  if (ctx.source === 'grid') {
    return currentButtons.value[String(ctx.keyIndex)] || null;
  } else if (ctx.source === 'folder-modal' && folderModalIndex.value !== null) {
    return folderModalButtons.value[String(ctx.keyIndex)] || null;
  }
  return null;
}

async function onDrop(e: DragEvent, targetIndex: number) {
  e.preventDefault();
  const dropZone = dragOverZone.value;
  dragOver.value = null;
  dragOverZone.value = null;
  folderModalDragOver.value = null;
  const ctx = dragCtx.value;
  dragCtx.value = null;
  if (!ctx) return;

  const sourceMapping = getSourceMapping(ctx);
  if (!sourceMapping) return;

  // Cross-grid: from folder modal → main grid
  if (ctx.source === 'folder-modal' && folderModalIndex.value !== null) {
    const srcFolderIdx = folderModalIndex.value;
    const targetMapping = currentButtons.value[String(targetIndex)] || null;
    if (!targetMapping) {
      if (editingFolderIndex.value !== null) {
        streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, targetIndex, sourceMapping);
      } else {
        streamDeck.setButtonMapping(editingPageIndex.value, targetIndex, sourceMapping);
      }
      removeFromSource(ctx, null);
    } else {
      if (editingFolderIndex.value !== null) {
        streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, targetIndex, sourceMapping);
      } else {
        streamDeck.setButtonMapping(editingPageIndex.value, targetIndex, sourceMapping);
      }
      removeFromSource(ctx, targetMapping);
    }
    cleanupEmptyFolder(srcFolderIdx);
    await streamDeck.saveMappings();
    return;
  }

  // Same grid (source === 'grid')
  if (ctx.keyIndex === targetIndex) return;
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
        removeFromSource(ctx, null);
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
    removeFromSource(ctx, null);
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
    removeFromSource(ctx, null);
    await streamDeck.saveMappings();
    return;
  }

  // Default: swap the two buttons
  if (editingFolderIndex.value !== null) {
    streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, targetIndex, sourceMapping);
  } else {
    streamDeck.setButtonMapping(editingPageIndex.value, targetIndex, sourceMapping);
  }
  removeFromSource(ctx, targetMapping);
  await streamDeck.saveMappings();
}

// Drop on folder modal grid
async function onFolderModalDrop(e: DragEvent, targetIndex: number) {
  e.preventDefault();
  folderModalDragOver.value = null;
  dragOver.value = null;
  dragOverZone.value = null;
  const ctx = dragCtx.value;
  dragCtx.value = null;
  if (!ctx || folderModalIndex.value === null) return;

  const sourceMapping = getSourceMapping(ctx);
  if (!sourceMapping) return;

  const targetMapping = folderModalButtons.value[String(targetIndex)] || null;

  if (ctx.source === 'grid') {
    // Cross-grid: from main grid → folder modal
    if (!targetMapping) {
      streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, targetIndex, sourceMapping);
      removeFromSource(ctx, null);
    } else {
      streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, targetIndex, sourceMapping);
      removeFromSource(ctx, targetMapping);
    }
    await streamDeck.saveMappings();
    return;
  }

  // Same grid (folder-modal → folder-modal)
  if (ctx.keyIndex === targetIndex) return;

  if (!targetMapping) {
    streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, targetIndex, sourceMapping);
    streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, ctx.keyIndex, null);
  } else {
    streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, targetIndex, sourceMapping);
    streamDeck.setFolderButtonMapping(folderModalIndex.value, folderModalPage.value, ctx.keyIndex, targetMapping);
  }
  await streamDeck.saveMappings();
}

function onKeyClick(keyIndex: number) {
  const info = getButtonInfo(keyIndex);
  const mapping = currentButtons.value[String(keyIndex)];
  if (info.type === 'folder' && mapping && mapping.folderIndex !== undefined) {
    folderModalIndex.value = mapping.folderIndex;
    folderModalPage.value = 0;
    return;
  }
  folderModalEditingKey.value = null;
  selectedKeyIndex.value = keyIndex;
  showButtonModal.value = true;
}

function onModalClose() {
  showButtonModal.value = false;
  selectedKeyIndex.value = null;
}

async function onMappingSave(mapping: StreamDeckButtonMapping | null) {
  // Editing from folder modal
  if (folderModalEditingKey.value !== null) {
    onFolderModalMappingSave(mapping);
    return;
  }
  if (selectedKeyIndex.value === null) return;
  if (editingFolderIndex.value !== null) {
    streamDeck.setFolderButtonMapping(editingFolderIndex.value, editingPageIndex.value, selectedKeyIndex.value, mapping);
  } else {
    streamDeck.setButtonMapping(editingPageIndex.value, selectedKeyIndex.value, mapping);
  }
  showButtonModal.value = false;
  selectedKeyIndex.value = null;
  try {
    await streamDeck.saveMappings();
  } catch (err) {
    console.error('[StreamDeckPage] saveMappings failed:', err);
  }
}

async function onBrightnessChange(value: number) {
  await streamDeck.setBrightness(value);
}

const selectedMapping = computed<StreamDeckButtonMapping | null>(() => {
  if (folderModalEditingKey.value !== null) return folderModalSelectedMapping.value;
  if (selectedKeyIndex.value === null) return null;
  return currentButtons.value[String(selectedKeyIndex.value)] || null;
});

// Page management
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

// Folder management
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

// Data management
async function onExportMappings() {
  const result = await streamdeckExportMappings();
  if (result.success) {
    // Could add toast here in the future
  }
}

async function onImportMappings() {
  const result = await streamdeckImportMappings();
  if (result.success) {
    await streamDeck.load();
  }
}

async function onResetMappings() {
  showResetConfirm.value = true;
}

async function confirmReset() {
  showResetConfirm.value = false;
  const result = await streamdeckResetMappings();
  if (result) {
    await streamDeck.load();
  }
}

// Stats polling
async function pollStats() {
  try {
    liveStats.value = await streamdeckSystemStats();
  } catch {
    // ignore
  }
}

onMounted(async () => {
  await streamDeck.load();
  if (_.isEmpty(libraryStore.items)) {
    await libraryStore.load();
  }
  pollStats();
  statsInterval.value = setInterval(pollStats, STATS_POLL_INTERVAL_MS);
});

onUnmounted(() => {
  if (statsInterval.value) {
    clearInterval(statsInterval.value);
  }
});
</script>

<template>
  <div class="streamdeck-page">
    <PageHeader :title="t('streamDeck.title')" :subtitle="t('streamDeck.subtitle')" />

    <div class="deck-content">
      <!-- Connection status -->
      <div class="status-bar">
        <div class="status-indicator" :class="{ connected: streamDeck.isConnected }">
          <span class="status-dot" />
          {{ streamDeck.isConnected ? t('streamDeck.connected') : t('streamDeck.disconnected') }}
        </div>
        <div v-if="liveStats" class="live-stats">
          <span class="stat-pill">CPU {{ liveStats.cpuPercent }}%</span>
          <span class="stat-pill">RAM {{ liveStats.ramPercent }}%</span>
          <span class="stat-pill">GPU {{ liveStats.gpuPercent }}%</span>
        </div>
      </div>

      <!-- Brightness -->
      <div v-if="streamDeck.isConnected" class="brightness-row">
        <VolumeSlider
          :model-value="streamDeck.brightness"
          :label="t('streamDeck.brightness')"
          value-text="%"
          @update:model-value="onBrightnessChange"
        >
          <template #icon>
            <AppIcon name="sun" :size="16" />
          </template>
        </VolumeSlider>
      </div>

      <!-- Section Tabs: Pages / Folders -->
      <div class="section-tabs">
        <button
          class="section-tab"
          :class="{ active: activeTab === 'pages' && editingFolderIndex === null }"
          @click="activeTab = 'pages'; editingFolderIndex = null; editingPageIndex = 0"
        >
          {{ t('streamDeck.pages') }}
        </button>
        <button
          class="section-tab"
          :class="{ active: activeTab === 'folders' || editingFolderIndex !== null }"
          @click="activeTab = 'folders'; editingFolderIndex = null"
        >
          {{ t('streamDeck.folders') }}
        </button>
      </div>

      <!-- Folders list -->
      <template v-if="activeTab === 'folders' && editingFolderIndex === null">
        <div class="folder-list-wrapper">
          <div class="folder-list">
            <div
              v-for="(folder, idx) in streamDeck.folders"
              :key="idx"
              class="folder-item"
            >
              <button class="folder-icon-btn" @click="openFolderIconPicker(idx)">
                <span v-if="!folder.icon" class="folder-icon-display">📁</span>
                <span v-else-if="getFolderIconDisplay(folder.icon).type === 'emoji'" class="folder-icon-display">{{ getFolderIconDisplay(folder.icon).value }}</span>
                <AppIcon v-else-if="getFolderIconDisplay(folder.icon).type === 'icon'" :name="(getFolderIconDisplay(folder.icon).value as IconNameValue)" :size="18" />
                <span v-else class="folder-icon-display">📁</span>
              </button>
              <button class="folder-name-btn" @click="selectFolder(idx)" @dblclick.stop="startRenameFolder(idx)">
                <template v-if="editingFolderName === idx">
                  <input
                    v-model="editFolderNameValue"
                    class="rename-input"
                    @blur="finishRenameFolder"
                    @keydown.enter="finishRenameFolder"
                    @keydown.escape="editingFolderName = null"
                    @click.stop
                    autofocus
                  />
                </template>
                <template v-else>
                  {{ folder.name }}
                </template>
                <span class="folder-page-count">{{ folder.pages.length }} {{ folder.pages.length === 1 ? 'page' : 'pages' }}</span>
              </button>
              <button class="folder-delete" @click="deleteFolder(idx)" :title="t('streamDeck.deleteFolder')">
                &times;
              </button>
            </div>
            <div v-if="_.isEmpty(streamDeck.folders)" class="empty-folders">
              {{ t('streamDeck.noFolders') }}
            </div>
          </div>
          <div v-if="addingFolder" class="add-folder-input">
            <input
              v-model="newFolderName"
              class="rename-input wide"
              :placeholder="t('streamDeck.newFolderName')"
              @blur="finishAddFolder"
              @keydown.enter="finishAddFolder"
              @keydown.escape="addingFolder = false"
              autofocus
            />
          </div>
          <button v-else class="add-btn" @click="startAddFolder">
            + {{ t('streamDeck.addFolder') }}
          </button>
        </div>
      </template>

      <!-- Page editing (top-level or inside folder) -->
      <template v-if="activeTab === 'pages' || editingFolderIndex !== null">
        <!-- Folder breadcrumb -->
        <div v-if="editingFolderIndex !== null" class="breadcrumb">
          <button class="breadcrumb-link" @click="backToFolders">
            {{ t('streamDeck.folders') }}
          </button>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-current">{{ streamDeck.folders[editingFolderIndex]?.name }}</span>
        </div>

        <!-- Page Tabs -->
        <div class="page-tabs">
          <div class="tabs-row">
            <button
              v-for="(page, idx) in editingPages"
              :key="idx"
              class="page-tab"
              :class="{ active: editingPageIndex === idx }"
              @click="switchPage(idx)"
              @dblclick="startRenamePage(idx)"
            >
              <template v-if="editingPageName === idx">
                <input
                  v-model="editPageNameValue"
                  class="rename-input"
                  @blur="finishRenamePage"
                  @keydown.enter="finishRenamePage"
                  @keydown.escape="editingPageName = null"
                  @click.stop
                  autofocus
                />
              </template>
              <template v-else>
                {{ page.name }}
              </template>
              <button
                v-if="editingPages.length > 1 && editingPageIndex === idx"
                class="tab-delete"
                @click.stop="deletePage(idx)"
              >
                &times;
              </button>
            </button>
            <button class="page-tab add-tab" @click="addPage">
              +
            </button>
          </div>
        </div>

        <!-- Key Grid -->
        <div class="deck-grid-wrapper">
          <div class="lcd-grid">
            <button
              v-for="keyIndex in LCD_KEY_COUNT"
              :key="keyIndex - 1"
              class="deck-key lcd"
              :class="[
                getTypeClass(keyIndex - 1),
                {
                  selected: selectedKeyIndex === keyIndex - 1,
                  dragging: dragCtx?.source === 'grid' && dragCtx?.keyIndex === keyIndex - 1,
                  'drag-over': dragOver === keyIndex - 1 && !(dragCtx?.source === 'grid' && dragCtx?.keyIndex === keyIndex - 1),
                  'drag-over-folder': dragOver === keyIndex - 1 && !(dragCtx?.source === 'grid' && dragCtx?.keyIndex === keyIndex - 1) && currentButtons[String(keyIndex - 1)] && dragOverZone === 'center',
                  'drag-over-swap': dragOver === keyIndex - 1 && !(dragCtx?.source === 'grid' && dragCtx?.keyIndex === keyIndex - 1) && currentButtons[String(keyIndex - 1)] && dragOverZone === 'edge',
                },
              ]"
              :draggable="!!currentButtons[String(keyIndex - 1)]"
              @click="onKeyClick(keyIndex - 1)"
              @contextmenu="onContextMenu($event, keyIndex - 1, 'grid')"
              @dragstart="onDragStart($event, keyIndex - 1, 'grid')"
              @dragover="onDragOver($event, keyIndex - 1, 'grid')"
              @dragleave="onDragLeave('grid')"
              @dragend="onDragEnd"
              @drop="onDrop($event, keyIndex - 1)"
            >
              <span v-if="getButtonInfo(keyIndex - 1).emoji" class="key-emoji">{{ getButtonInfo(keyIndex - 1).emoji }}</span>
              <AppIcon v-else-if="getButtonInfo(keyIndex - 1).icon" :name="getButtonInfo(keyIndex - 1).icon!" :size="20" class="key-icon" />
              <span class="key-text">{{ getButtonInfo(keyIndex - 1).label }}</span>
              <span
                v-if="dragOver === keyIndex - 1 && dragCtx && !(dragCtx.source === 'grid' && dragCtx.keyIndex === keyIndex - 1)"
                class="drop-indicator"
                :class="{
                  'drop-add': currentButtons[String(keyIndex - 1)] && dragOverZone === 'center',
                  'drop-swap': currentButtons[String(keyIndex - 1)] && dragOverZone === 'edge',
                  'drop-move': !currentButtons[String(keyIndex - 1)],
                }"
              >
                <template v-if="currentButtons[String(keyIndex - 1)] && dragOverZone === 'center' && getButtonInfo(keyIndex - 1).type === 'folder'">+ Add</template>
                <template v-else-if="currentButtons[String(keyIndex - 1)] && dragOverZone === 'center'">+ Folder</template>
                <template v-else-if="currentButtons[String(keyIndex - 1)]">⇄ Swap</template>
                <template v-else>↓ Move</template>
              </span>
            </button>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="quick-actions">
          <button class="action-btn" @click="streamDeck.refreshImages()">
            <AppIcon name="history" :size="16" />
            Refresh Display
          </button>
        </div>
      </template>

      <!-- Data management -->
      <div class="data-management">
        <h3>{{ t('streamDeck.pages') }}</h3>
        <div class="data-actions">
          <button class="action-btn" @click="onExportMappings">
            <AppIcon name="download" :size="16" />
            {{ t('streamDeck.exportMappings') }}
          </button>
          <button class="action-btn" @click="onImportMappings">
            <AppIcon name="upload" :size="16" />
            {{ t('streamDeck.importMappings') }}
          </button>
          <button class="action-btn danger" @click="onResetMappings">
            <AppIcon name="history" :size="16" />
            {{ t('streamDeck.resetMappings') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div v-if="contextMenu" class="context-overlay" @click="closeContextMenu" @contextmenu.prevent="closeContextMenu">
      <div class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }">
        <button class="context-item delete" @click="contextMenuDelete">
          <AppIcon name="trash" :size="14" />
          {{ t('library.delete') }}
        </button>
      </div>
    </div>

    <!-- Folder Modal -->
    <div v-if="folderModalIndex !== null" class="folder-modal-overlay" :class="{ 'is-dragging': dragCtx !== null }" @click.self="folderModalIndex = null">
        <div class="folder-modal">
          <div class="folder-modal-header">
            <button class="folder-icon-btn" @click="openFolderIconPicker(folderModalIndex!)">
              <span v-if="!streamDeck.folders[folderModalIndex!]?.icon" class="folder-icon-default">📁</span>
              <span v-else-if="getFolderIconDisplay(streamDeck.folders[folderModalIndex!]?.icon).type === 'emoji'" class="folder-icon-emoji">{{ getFolderIconDisplay(streamDeck.folders[folderModalIndex!]?.icon).value }}</span>
              <AppIcon v-else-if="getFolderIconDisplay(streamDeck.folders[folderModalIndex!]?.icon).type === 'icon'" :name="(getFolderIconDisplay(streamDeck.folders[folderModalIndex!]?.icon).value as IconNameValue)" :size="18" />
            </button>
            <input
              class="folder-name-input"
              :value="streamDeck.folders[folderModalIndex!]?.name || ''"
              @change="onFolderNameChange(($event.target as HTMLInputElement).value)"
            />
            <button class="folder-modal-close" @click="folderModalIndex = null">&times;</button>
          </div>

          <!-- Page tabs inside folder modal -->
          <div v-if="folderModalPages.length > 1" class="folder-modal-tabs">
            <button
              v-for="(page, idx) in folderModalPages"
              :key="idx"
              class="page-tab"
              :class="{ active: folderModalPage === idx }"
              @click="folderModalPage = idx"
            >
              {{ page.name }}
            </button>
          </div>

          <!-- Folder modal grid -->
          <div class="folder-modal-grid-wrapper">
            <div class="lcd-grid">
              <button
                v-for="keyIndex in LCD_KEY_COUNT"
                :key="keyIndex - 1"
                class="deck-key lcd"
                :class="[
                  getFolderModalTypeClass(keyIndex - 1),
                  {
                    dragging: dragCtx?.source === 'folder-modal' && dragCtx?.keyIndex === keyIndex - 1,
                    'drag-over': folderModalDragOver === keyIndex - 1 && !(dragCtx?.source === 'folder-modal' && dragCtx?.keyIndex === keyIndex - 1),
                  },
                ]"
                :draggable="!!folderModalButtons[String(keyIndex - 1)]"
                @click="onFolderModalKeyClick(keyIndex - 1)"
                @contextmenu="onContextMenu($event, keyIndex - 1, 'folder-modal')"
                @dragstart="onDragStart($event, keyIndex - 1, 'folder-modal')"
                @dragover="onDragOver($event, keyIndex - 1, 'folder-modal')"
                @dragleave="onDragLeave('folder-modal')"
                @dragend="onDragEnd"
                @drop="onFolderModalDrop($event, keyIndex - 1)"
              >
                <span v-if="getFolderModalButtonInfo(keyIndex - 1).emoji" class="key-emoji">{{ getFolderModalButtonInfo(keyIndex - 1).emoji }}</span>
                <AppIcon v-else-if="getFolderModalButtonInfo(keyIndex - 1).icon" :name="getFolderModalButtonInfo(keyIndex - 1).icon!" :size="20" class="key-icon" />
                <span class="key-text">{{ getFolderModalButtonInfo(keyIndex - 1).label }}</span>
                <span
                  v-if="folderModalDragOver === keyIndex - 1 && dragCtx && !(dragCtx.source === 'folder-modal' && dragCtx.keyIndex === keyIndex - 1)"
                  class="drop-indicator"
                  :class="{
                    'drop-swap': folderModalButtons[String(keyIndex - 1)],
                    'drop-move': !folderModalButtons[String(keyIndex - 1)],
                  }"
                >
                  <template v-if="folderModalButtons[String(keyIndex - 1)]">⇄ Swap</template>
                  <template v-else>↓ Move</template>
                </span>
              </button>
            </div>
          </div>

          <!-- Folder settings -->
          <div class="folder-modal-settings">
            <div class="folder-setting-row">
              <span class="folder-setting-label">{{ t('streamDeck.closeAfterAction') }}</span>
              <SwitchToggle
                :model-value="streamDeck.folders[folderModalIndex]?.closeAfterAction === true"
                @update:model-value="toggleFolderCloseAfterAction"
              />
            </div>
            <div class="folder-setting-row">
              <span class="folder-setting-label">{{ t('streamDeck.closeButtonKey') }}</span>
              <select
                class="folder-setting-select"
                :value="streamDeck.folders[folderModalIndex]?.closeButtonKey ?? ''"
                @change="setFolderCloseButtonKey(($event.target as HTMLSelectElement).value)"
              >
                <option value="">{{ t('streamDeck.none') }}</option>
                <option v-for="i in LCD_KEY_COUNT" :key="i - 1" :value="i - 1">
                  Key {{ i }}
                </option>
              </select>
            </div>
          </div>

          <div class="folder-modal-hint">
            {{ t('streamDeck.folderDragHint') }}
          </div>
        </div>
    </div>

    <StreamDeckButtonModal
      :visible="showButtonModal"
      :key-index="selectedKeyIndex"
      :current-mapping="selectedMapping"
      @close="onModalClose"
      @save="onMappingSave"
    />

    <IconPickerModal
      :visible="showFolderIconPicker"
      :selected="folderIconTarget !== null ? (streamDeck.folders[folderIconTarget]?.icon || null) : null"
      @select="onFolderIconSelect"
      @close="showFolderIconPicker = false"
    />

    <ConfirmModal
      :visible="showResetConfirm"
      :title="t('streamDeck.resetMappings')"
      :message="t('streamDeck.confirmResetMappings')"
      @confirm="confirmReset"
      @cancel="showResetConfirm = false"
    />

    <ConfirmModal
      :visible="confirmDialog.visible.value"
      :title="confirmDialog.title.value"
      :message="confirmDialog.message.value"
      @confirm="confirmDialog.confirm"
      @cancel="confirmDialog.cancel"
    />
  </div>
</template>

<style scoped>
.streamdeck-page {
  padding: var(--page-padding);
}

.deck-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.status-indicator.connected {
  color: var(--accent);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-error);
}

.status-indicator.connected .status-dot {
  background: var(--accent);
}

.live-stats {
  display: flex;
  gap: 8px;
}

.stat-pill {
  font-size: 0.72rem;
  padding: 3px 8px;
  border-radius: 10px;
  background: var(--bg-input);
  color: var(--text-tertiary);
  font-family: monospace;
}

.brightness-row {
  padding: 8px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
}

/* Section tabs */
.section-tabs {
  display: flex;
  gap: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
  overflow: hidden;
}

.section-tab {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
  border-bottom: 2px solid transparent;
}

.section-tab:hover {
  color: var(--text-primary);
}

.section-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

/* Folder list */
.folder-list-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
  padding: 12px;
}

.folder-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: var(--bg-input);
  overflow: hidden;
}

.folder-icon-btn {
  padding: 10px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
  border-right: 1px solid var(--border-default);
}

.folder-icon-btn:hover {
  background: var(--bg-card-hover);
}

.folder-icon-display {
  font-size: 1.1rem;
}

.folder-name-btn {
  flex: 1;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.folder-name-btn:hover {
  background: var(--bg-card-hover);
}

.folder-page-count {
  font-size: 0.72rem;
  color: var(--text-tertiary);
  margin-left: auto;
}

.folder-delete {
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 1.1rem;
  cursor: pointer;
  transition: color 0.1s;
}

.folder-delete:hover {
  color: var(--color-error);
}

.empty-folders {
  padding: 20px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px;
  border: 1px dashed var(--border-default);
  border-radius: var(--small-radius);
  background: transparent;
  color: var(--text-tertiary);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s;
}

.add-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  padding: 8px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
}

.breadcrumb-link {
  border: none;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-size: 0.82rem;
  padding: 0;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-sep {
  color: var(--text-tertiary);
}

.breadcrumb-current {
  color: var(--text-primary);
}

/* Page tabs */
.page-tabs {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
  padding: 8px 12px;
}

.tabs-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.page-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: var(--bg-input);
  color: var(--text-tertiary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.page-tab:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.page-tab.active {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--bg-active);
}

.page-tab.add-tab {
  padding: 6px 12px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-tertiary);
}

.page-tab.add-tab:hover {
  color: var(--accent);
}

.tab-delete {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}

.tab-delete:hover {
  color: var(--color-error);
}

.rename-input {
  width: 80px;
  padding: 2px 4px;
  border: 1px solid var(--accent);
  border-radius: 3px;
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.8rem;
}

.rename-input.wide {
  width: 100%;
  padding: 8px 12px;
  font-size: 0.85rem;
}

.add-folder-input {
  width: 100%;
}

.deck-grid-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
  padding: 20px;
}

.lcd-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.deck-key {
  position: relative;
  aspect-ratio: 1;
  border: 2px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px;
  gap: 4px;
  transition: all 0.15s;
  min-height: 72px;
  overflow: hidden;
}

.deck-key:hover {
  border-color: var(--accent);
  transform: scale(1.03);
}

.deck-key.selected {
  border-color: var(--accent);
  box-shadow: 0 0 12px var(--sd-blue-subtle);
}

.deck-key.type-sound { border-color: var(--sd-green-subtle); }
.deck-key.type-media { border-color: var(--sd-blue-subtle); }
.deck-key.type-stat { border-color: var(--sd-purple-subtle); }
.deck-key.type-shortcut { border-color: var(--sd-orange-subtle); }
.deck-key.type-action { border-color: var(--color-error-subtle); }
.deck-key.type-folder { border-color: var(--sd-orange-subtle); }
.deck-key.type-empty { border-color: var(--border-default); opacity: 0.5; }

.deck-key.type-sound:hover { border-color: var(--sd-green); }
.deck-key.type-media:hover { border-color: var(--sd-blue); }
.deck-key.type-stat:hover { border-color: var(--sd-purple); }
.deck-key.type-shortcut:hover { border-color: var(--sd-orange); }
.deck-key.type-action:hover { border-color: var(--sd-red); }
.deck-key.type-folder:hover { border-color: var(--sd-orange); }
.deck-key.type-empty:hover { border-color: var(--accent); opacity: 1; }

.deck-key.dragging {
  opacity: 0.3;
  transform: scale(0.95);
}

.deck-key.drag-over {
  border-color: var(--accent) !important;
  box-shadow: 0 0 12px var(--sd-blue-subtle);
  transform: scale(1.05);
}

.deck-key.drag-over-folder {
  border-color: var(--sd-orange) !important;
  box-shadow: 0 0 16px var(--sd-orange-subtle);
  transform: scale(1.08);
}

.deck-key.drag-over-swap {
  border-color: var(--accent) !important;
  box-shadow: 0 0 12px var(--sd-blue-subtle);
  transform: scale(1.05);
}

.drop-indicator {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.6rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 5;
}

.drop-indicator.drop-add {
  background: var(--sd-orange);
  color: var(--text-inverse);
}

.drop-indicator.drop-swap {
  background: var(--sd-blue);
  color: var(--text-inverse);
}

.drop-indicator.drop-move {
  background: var(--sd-green);
  color: var(--text-inverse);
}

.key-emoji {
  font-size: 1.4rem;
  line-height: 1;
  flex-shrink: 0;
}

.key-icon {
  opacity: 0.6;
  flex-shrink: 0;
}

.key-text {
  font-size: 0.65rem;
  text-align: center;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  word-break: break-word;
  color: var(--text-tertiary);
}

.quick-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: var(--bg-input);
  color: var(--text-tertiary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Folder modal */
.folder-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.folder-modal-overlay.is-dragging {
  pointer-events: none;
  background: var(--bg-overlay-light);
}

.folder-modal-overlay.is-dragging .folder-modal {
  pointer-events: auto;
}

.folder-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
  padding: 20px;
  width: 480px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.folder-modal-header {
  display: flex;
  align-items: center;
}

.folder-icon-btn {
  background: none;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s;
}

.folder-icon-btn:hover {
  border-color: var(--accent);
}

.folder-icon-default,
.folder-icon-emoji {
  font-size: 1.1rem;
}

.folder-name-input {
  flex: 1;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--small-radius);
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  padding: 4px 8px;
  margin: 0 8px;
  outline: none;
  transition: border-color 0.15s;
}

.folder-name-input:hover {
  border-color: var(--border-default);
}

.folder-name-input:focus {
  border-color: var(--accent);
}

.folder-modal-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 1.4rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.folder-modal-close:hover {
  color: var(--text-primary);
}

.folder-modal-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.folder-modal-grid-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
  padding: 16px;
}

.folder-modal-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
}

.folder-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.folder-setting-label {
  font-size: 0.82rem;
  color: var(--text-primary);
}

.folder-setting-select {
  padding: 4px 8px;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
}

.folder-modal-hint {
  font-size: 0.72rem;
  color: var(--text-tertiary);
  text-align: center;
}

/* Context menu */
.context-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
}

.context-menu {
  position: fixed;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--bg-overlay-light);
  min-width: 140px;
  overflow: hidden;
  z-index: 201;
}

.context-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 14px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.1s;
}

.context-item:hover {
  background: var(--bg-input);
}

.context-item.delete {
  color: var(--color-error);
}

.data-management {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}

.data-management h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.data-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn.danger {
  color: var(--color-error);
  border-color: var(--color-error);
}

.action-btn.danger:hover {
  background: var(--color-error);
  color: var(--text-inverse);
}
</style>
