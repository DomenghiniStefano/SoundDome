<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import { useLibraryStore } from '../../stores/library';
import { useStreamDeckStore } from '../../stores/streamdeck';
import { StreamDeckActionType, SystemStatType } from '../../enums/streamdeck';
import type { StreamDeckActionTypeValue } from '../../enums/streamdeck';
import IconPickerModal from '../ui/IconPickerModal.vue';
import AppIcon from '../ui/AppIcon.vue';
import { parseImage } from '../../enums/ui';

const props = defineProps<{
  visible: boolean;
  keyIndex: number | null;
  currentMapping: StreamDeckButtonMapping | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [mapping: StreamDeckButtonMapping | null];
}>();

const { t } = useI18n();
const libraryStore = useLibraryStore();
const streamDeck = useStreamDeckStore();

const selectedType = ref<StreamDeckActionTypeValue | 'default'>('default');
const selectedItemId = ref<string | null>(null);
const selectedStatType = ref(SystemStatType.CPU);
const shortcutValue = ref('');
const customLabel = ref('');
const searchQuery = ref('');
const selectedFolderIndex = ref(0);
const selectedFolderIcon = ref<string | null>(null);
const showIconPicker = ref(false);

const actionGroups = computed(() => [
  {
    label: '',
    options: [
      { value: 'default' as const, label: t('streamDeck.defaultAction') },
    ],
  },
  {
    label: 'SoundDome',
    options: [
      { value: StreamDeckActionType.SOUND, label: t('streamDeck.sound') },
      { value: StreamDeckActionType.STOP_ALL, label: t('streamDeck.stopAll') },
      { value: StreamDeckActionType.PAGE_NEXT, label: t('streamDeck.pageNext') },
      { value: StreamDeckActionType.PAGE_PREV, label: t('streamDeck.pagePrev') },
      { value: StreamDeckActionType.FOLDER, label: t('streamDeck.folder') },
      { value: StreamDeckActionType.GO_BACK, label: t('streamDeck.goBack') },
    ],
  },
  {
    label: 'Media',
    options: [
      { value: StreamDeckActionType.MEDIA_PLAY_PAUSE, label: t('streamDeck.mediaPlayPause') },
      { value: StreamDeckActionType.MEDIA_NEXT, label: t('streamDeck.mediaNext') },
      { value: StreamDeckActionType.MEDIA_PREV, label: t('streamDeck.mediaPrev') },
      { value: StreamDeckActionType.MEDIA_VOLUME_UP, label: t('streamDeck.mediaVolumeUp') },
      { value: StreamDeckActionType.MEDIA_VOLUME_DOWN, label: t('streamDeck.mediaVolumeDown') },
      { value: StreamDeckActionType.MEDIA_MUTE, label: t('streamDeck.mediaMute') },
    ],
  },
  {
    label: 'System',
    options: [
      { value: StreamDeckActionType.SYSTEM_STAT, label: t('streamDeck.systemStat') },
      { value: StreamDeckActionType.SHORTCUT, label: t('streamDeck.shortcut') },
    ],
  },
]);

const statTypes = computed(() => [
  { value: SystemStatType.CPU, label: t('streamDeck.statCpu') },
  { value: SystemStatType.RAM, label: t('streamDeck.statRam') },
  { value: SystemStatType.GPU, label: t('streamDeck.statGpu') },
  { value: SystemStatType.CPU_TEMP, label: t('streamDeck.statCpuTemp') },
  { value: SystemStatType.GPU_TEMP, label: t('streamDeck.statGpuTemp') },
  { value: SystemStatType.GPU_VRAM, label: t('streamDeck.statGpuVram') },
  { value: SystemStatType.DISK, label: t('streamDeck.statDisk') },
  { value: SystemStatType.NET_UP, label: t('streamDeck.statNetUp') },
  { value: SystemStatType.NET_DOWN, label: t('streamDeck.statNetDown') },
  { value: SystemStatType.UPTIME, label: t('streamDeck.statUptime') },
]);

const filteredLibrary = computed(() => {
  if (!searchQuery.value) return libraryStore.items;
  const q = searchQuery.value.toLowerCase();
  return _.filter(libraryStore.items, (item: LibraryItem) =>
    item.name.toLowerCase().includes(q)
  );
});

const showSoundPicker = computed(() => selectedType.value === StreamDeckActionType.SOUND);
const showStatPicker = computed(() => selectedType.value === StreamDeckActionType.SYSTEM_STAT);
const showShortcutInput = computed(() => selectedType.value === StreamDeckActionType.SHORTCUT);
const showFolderPicker = computed(() => selectedType.value === StreamDeckActionType.FOLDER);
const parsedFolderIcon = computed(() => parseImage(selectedFolderIcon.value));

function onFolderIconSelect(value: string) {
  selectedFolderIcon.value = value;
}

const isSaveDisabled = computed(() => {
  if (selectedType.value === StreamDeckActionType.SOUND && !selectedItemId.value) return true;
  if (selectedType.value === StreamDeckActionType.SHORTCUT && !shortcutValue.value.trim()) return true;
  if (selectedType.value === StreamDeckActionType.FOLDER && _.isEmpty(streamDeck.folders)) return true;
  return false;
});

watch(() => props.visible, (visible) => {
  if (visible) {
    if (props.currentMapping) {
      selectedType.value = props.currentMapping.type as StreamDeckActionTypeValue;
      selectedItemId.value = props.currentMapping.itemId || null;
      selectedStatType.value = (props.currentMapping.statType || SystemStatType.CPU) as typeof selectedStatType.value;
      shortcutValue.value = props.currentMapping.shortcut || '';
      customLabel.value = props.currentMapping.label || '';
      selectedFolderIndex.value = props.currentMapping.folderIndex ?? 0;
      selectedFolderIcon.value = props.currentMapping.icon || null;
    } else {
      selectedType.value = 'default';
      selectedItemId.value = null;
      selectedStatType.value = SystemStatType.CPU;
      shortcutValue.value = '';
      customLabel.value = '';
      selectedFolderIndex.value = 0;
      selectedFolderIcon.value = null;
    }
    searchQuery.value = '';
  }
});

function onSave() {
  if (selectedType.value === 'default') {
    emit('save', null);
    return;
  }

  const mapping: StreamDeckButtonMapping = {
    type: selectedType.value,
  };

  if (selectedType.value === StreamDeckActionType.SOUND && selectedItemId.value) {
    mapping.itemId = selectedItemId.value;
    const item = _.find(libraryStore.items, { id: selectedItemId.value });
    if (item) mapping.label = item.name;
  }

  if (selectedType.value === StreamDeckActionType.SYSTEM_STAT) {
    mapping.statType = selectedStatType.value;
  }

  if (selectedType.value === StreamDeckActionType.SHORTCUT) {
    mapping.shortcut = shortcutValue.value.trim();
    if (customLabel.value.trim()) {
      mapping.label = customLabel.value.trim();
    }
  }

  if (selectedType.value === StreamDeckActionType.FOLDER) {
    mapping.folderIndex = selectedFolderIndex.value;
    if (selectedFolderIcon.value) {
      mapping.icon = selectedFolderIcon.value;
    }
    const folder = streamDeck.folders[selectedFolderIndex.value];
    if (folder) mapping.label = folder.name;
  }

  // Map media action types to their mediaAction field
  const mediaMap: Record<string, string> = {
    [StreamDeckActionType.MEDIA_PLAY_PAUSE]: 'playPause',
    [StreamDeckActionType.MEDIA_NEXT]: 'nextTrack',
    [StreamDeckActionType.MEDIA_PREV]: 'prevTrack',
    [StreamDeckActionType.MEDIA_VOLUME_UP]: 'volumeUp',
    [StreamDeckActionType.MEDIA_VOLUME_DOWN]: 'volumeDown',
    [StreamDeckActionType.MEDIA_MUTE]: 'volumeMute',
  };
  if (mediaMap[selectedType.value]) {
    mapping.mediaAction = mediaMap[selectedType.value];
  }

  emit('save', mapping);
}

function onCancel() {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="onCancel">
      <div class="modal">
        <h3 class="modal-title">{{ t('streamDeck.assignButton') }}</h3>

        <div class="type-select">
          <label>{{ t('streamDeck.actionType') }}</label>
          <select v-model="selectedType" class="select-input">
            <template v-for="group in actionGroups" :key="group.label">
              <optgroup v-if="group.label" :label="group.label">
                <option v-for="action in group.options" :key="action.value" :value="action.value">
                  {{ action.label }}
                </option>
              </optgroup>
              <template v-else>
                <option v-for="action in group.options" :key="action.value" :value="action.value">
                  {{ action.label }}
                </option>
              </template>
            </template>
          </select>
        </div>

        <!-- Sound picker -->
        <template v-if="showSoundPicker">
          <div class="search-row">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('streamDeck.searchSound')"
              class="search-input"
            />
          </div>
          <div class="sound-list">
            <button
              v-for="item in filteredLibrary"
              :key="item.id"
              class="sound-item"
              :class="{ selected: selectedItemId === item.id }"
              @click="selectedItemId = item.id"
            >
              {{ item.name }}
            </button>
            <div v-if="_.isEmpty(filteredLibrary)" class="empty-list">
              {{ t('streamDeck.noSounds') }}
            </div>
          </div>
        </template>

        <!-- Stat type picker -->
        <template v-if="showStatPicker">
          <div class="type-select">
            <label>{{ t('streamDeck.statType') }}</label>
            <select v-model="selectedStatType" class="select-input">
              <option v-for="stat in statTypes" :key="stat.value" :value="stat.value">
                {{ stat.label }}
              </option>
            </select>
          </div>
        </template>

        <!-- Folder page picker -->
        <template v-if="showFolderPicker">
          <div class="type-select">
            <label>{{ t('streamDeck.targetFolder') }}</label>
            <select v-model.number="selectedFolderIndex" class="select-input">
              <option
                v-for="(folder, idx) in streamDeck.folders"
                :key="idx"
                :value="idx"
              >
                {{ folder.name }}
              </option>
            </select>
            <div v-if="_.isEmpty(streamDeck.folders)" class="empty-hint">
              {{ t('streamDeck.noFolders') }}
            </div>
          </div>
          <div class="type-select">
            <label>{{ t('streamDeck.folderIcon') }}</label>
            <div class="icon-preview-row">
              <button class="icon-preview" @click="showIconPicker = true">
                <span v-if="!selectedFolderIcon" class="icon-preview-default">📁</span>
                <span v-else-if="parsedFolderIcon.type === 'emoji'" class="icon-preview-emoji">{{ parsedFolderIcon.value }}</span>
                <AppIcon v-else-if="parsedFolderIcon.type === 'icon'" :name="parsedFolderIcon.value!" :size="20" />
                <span v-else class="icon-preview-default">📁</span>
              </button>
              <button v-if="selectedFolderIcon" class="icon-clear" @click="selectedFolderIcon = null">
                &times;
              </button>
            </div>
          </div>
        </template>

        <!-- Shortcut input -->
        <template v-if="showShortcutInput">
          <div class="type-select">
            <label>{{ t('streamDeck.shortcutLabel') }}</label>
            <input
              v-model="shortcutValue"
              type="text"
              :placeholder="t('streamDeck.shortcutPlaceholder')"
              class="search-input"
            />
          </div>
          <div class="type-select">
            <label>{{ t('streamDeck.customLabel') }}</label>
            <input
              v-model="customLabel"
              type="text"
              placeholder="My Shortcut"
              class="search-input"
            />
          </div>
        </template>

        <div class="modal-actions">
          <button class="modal-btn" @click="onCancel">{{ t('common.cancel') }}</button>
          <button
            class="modal-btn primary"
            :disabled="isSaveDisabled"
            @click="onSave"
          >
            {{ t('common.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <IconPickerModal
    :visible="showIconPicker"
    :selected="selectedFolderIcon"
    @select="onFolderIconSelect"
    @close="showIconPicker = false"
  />
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius);
  padding: 24px;
  max-width: 420px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-white);
  margin-bottom: 16px;
}

.type-select {
  margin-bottom: 14px;
}

.type-select label {
  display: block;
  font-size: 0.78rem;
  color: var(--color-text-dim);
  margin-bottom: 6px;
}

.select-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
}

.search-row {
  margin-bottom: 10px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  color: var(--color-text);
  font-size: 0.85rem;
  box-sizing: border-box;
}

.search-input::placeholder {
  color: var(--color-text-dim);
}

.sound-list {
  flex: 1;
  overflow-y: auto;
  max-height: 250px;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  margin-bottom: 16px;
}

.sound-item {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
}

.sound-item:hover {
  background: var(--color-bg-card-hover);
}

.sound-item.selected {
  background: var(--color-active-bg);
  color: var(--color-accent);
}

.empty-list {
  padding: 20px;
  text-align: center;
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-btn {
  padding: 8px 0;
  width: 90px;
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.modal-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.modal-btn:active {
  transform: scale(0.97);
}

.modal-btn.primary {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.modal-btn.primary:hover {
  background: var(--color-accent);
  color: #fff;
}

.modal-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.modal-btn:disabled:hover {
  border-color: var(--color-border);
  color: var(--color-text);
  background: var(--color-bg-input);
}

.icon-preview-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-preview {
  width: 42px;
  height: 42px;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.icon-preview:hover {
  border-color: var(--color-accent);
}

.icon-preview-default {
  font-size: 1.2rem;
}

.icon-preview-emoji {
  font-size: 1.2rem;
}

.icon-clear {
  border: none;
  background: transparent;
  color: var(--color-text-dim);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px;
}

.icon-clear:hover {
  color: var(--color-error);
}

.empty-hint {
  font-size: 0.78rem;
  color: var(--color-text-dim);
  margin-top: 6px;
}
</style>
