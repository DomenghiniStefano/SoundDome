<script setup lang="ts">
import { ref, watch, computed, watchEffect } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import { useLibraryStore } from '../../stores/library';
import { useStreamDeckStore } from '../../stores/streamdeck';
import { StreamDeckActionType, SystemStatType } from '../../enums/streamdeck';
import type { StreamDeckActionTypeValue } from '../../enums/streamdeck';
import { buildButtonMapping, canSaveButtonMapping } from '../../utils/streamdeck';
import IconPickerModal from '../ui/IconPickerModal.vue';
import EmojiPickerModal from '../ui/EmojiPickerModal.vue';
import AppIcon from '../ui/AppIcon.vue';
import type { IconNameValue } from '../../enums/icons';
import { parseImage, ImagePrefix } from '../../enums/ui';
import { useHotkeyCapture } from '../../composables/useHotkeyCapture';
import { pickExecutable, pickButtonImage } from '../../services/api';

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
const appPathValue = ref('');
const buttonImage = ref<string | null>(null);
const selectedFolderIcon = ref<string | null>(null);
const showIconPicker = ref(false);
const showFolderEmojiPicker = ref(false);

const { captured: capturedShortcut, listening: shortcutListening, startListening: startShortcutListening, stopListening: stopShortcutListening, resetCapture: resetShortcutCapture, onKeyDown: onShortcutKeyDown, onMouseDown: onShortcutMouseDown } = useHotkeyCapture(
  () => shortcutValue.value || null,
  () => new Map(),
  () => ''
);

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
      { value: StreamDeckActionType.LAUNCH_APP, label: t('streamDeck.launchApp') },
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
const showAppPicker = computed(() => selectedType.value === StreamDeckActionType.LAUNCH_APP);
const showFolderPicker = computed(() => selectedType.value === StreamDeckActionType.FOLDER);
const parsedFolderIcon = computed(() => parseImage(selectedFolderIcon.value));

function onFolderIconSelect(value: string) {
  selectedFolderIcon.value = value;
}

async function browseImage() {
  const imagePath = await pickButtonImage();
  if (imagePath) {
    buttonImage.value = imagePath;
  }
}

async function browseApp() {
  const filePath = await pickExecutable();
  if (filePath) {
    appPathValue.value = filePath;
    if (!customLabel.value) {
      const name = filePath.split(/[/\\]/).pop()?.replace(/\.\w+$/, '') || '';
      customLabel.value = name;
    }
  }
}

const isSaveDisabled = computed(() => !canSaveButtonMapping(
  selectedType.value, selectedItemId.value, shortcutValue.value, appPathValue.value, streamDeck.folders
));

watchEffect(() => {
  if (capturedShortcut.value !== null) {
    shortcutValue.value = capturedShortcut.value;
  }
});

watch(() => props.visible, (visible) => {
  if (visible) {
    if (props.currentMapping) {
      selectedType.value = props.currentMapping.type as StreamDeckActionTypeValue;
      selectedItemId.value = props.currentMapping.itemId || null;
      selectedStatType.value = (props.currentMapping.statType || SystemStatType.CPU) as typeof selectedStatType.value;
      shortcutValue.value = props.currentMapping.shortcut || '';
      appPathValue.value = props.currentMapping.appPath || '';
      buttonImage.value = props.currentMapping.image || null;
      customLabel.value = props.currentMapping.label || '';
      selectedFolderIndex.value = props.currentMapping.folderIndex ?? 0;
      selectedFolderIcon.value = props.currentMapping.icon || null;
    } else {
      selectedType.value = 'default';
      selectedItemId.value = null;
      selectedStatType.value = SystemStatType.CPU;
      shortcutValue.value = '';
      appPathValue.value = '';
      buttonImage.value = null;
      customLabel.value = '';
      selectedFolderIndex.value = 0;
      selectedFolderIcon.value = null;
    }
    resetShortcutCapture(shortcutValue.value || null);
    searchQuery.value = '';
  } else {
    stopShortcutListening();
  }
});

function onSave() {
  const mapping = buildButtonMapping({
    selectedType: selectedType.value,
    selectedItemId: selectedItemId.value,
    selectedStatType: selectedStatType.value,
    shortcutValue: shortcutValue.value,
    appPathValue: appPathValue.value,
    buttonImage: buttonImage.value,
    customLabel: customLabel.value,
    selectedFolderIndex: selectedFolderIndex.value,
    selectedFolderIcon: selectedFolderIcon.value,
    libraryItems: libraryStore.items,
    folders: streamDeck.folders,
  });
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
                <AppIcon v-else-if="parsedFolderIcon.type === 'icon'" :name="(parsedFolderIcon.value as IconNameValue)" :size="20" />
                <span v-else class="icon-preview-default">📁</span>
              </button>
              <button v-if="selectedFolderIcon" class="icon-clear" @click="selectedFolderIcon = null">
                &times;
              </button>
              <button class="icon-emoji-btn" @click="showFolderEmojiPicker = true">
                <span class="icon-emoji-icon">😀</span>
              </button>
            </div>
          </div>
        </template>

        <!-- Shortcut input -->
        <template v-if="showShortcutInput">
          <div class="type-select">
            <label>{{ t('streamDeck.shortcutLabel') }}</label>
            <div
              class="shortcut-capture"
              :class="{ listening: shortcutListening }"
              tabindex="0"
              @click="startShortcutListening"
              @keydown="onShortcutKeyDown"
              @mousedown="onShortcutMouseDown"
            >
              <template v-if="shortcutListening">
                <span class="shortcut-listening">{{ t('hotkey.pressKeys') }}</span>
              </template>
              <template v-else-if="shortcutValue">
                <span class="shortcut-keys">{{ shortcutValue }}</span>
              </template>
              <template v-else>
                <span class="shortcut-empty">{{ t('streamDeck.shortcutPlaceholder') }}</span>
              </template>
            </div>
            <button v-if="shortcutValue && !shortcutListening" class="shortcut-clear" @click="shortcutValue = ''; resetShortcutCapture(null)">
              {{ t('hotkey.remove') }}
            </button>
          </div>
          <div class="type-select">
            <label>{{ t('streamDeck.customLabel') }}</label>
            <input
              v-model="customLabel"
              type="text"
              :placeholder="t('streamDeck.customLabel')"
              class="search-input"
            />
          </div>
        </template>

        <!-- Launch App picker -->
        <template v-if="showAppPicker">
          <div class="type-select">
            <label>{{ t('streamDeck.appPath') }}</label>
            <div class="app-path-row">
              <input
                v-model="appPathValue"
                type="text"
                :placeholder="t('streamDeck.appPathPlaceholder')"
                class="search-input app-path-input"
                readonly
              />
              <button class="modal-btn browse-btn" @click="browseApp">
                {{ t('streamDeck.browse') }}
              </button>
            </div>
          </div>
          <div class="type-select">
            <label>{{ t('streamDeck.customLabel') }}</label>
            <input
              v-model="customLabel"
              type="text"
              :placeholder="t('streamDeck.launchApp')"
              class="search-input"
            />
          </div>
        </template>

        <!-- Button image (available for all types except default) -->
        <div v-if="selectedType !== 'default'" class="type-select image-section">
          <label>{{ t('streamDeck.buttonImage') }}</label>
          <div class="app-path-row">
            <div v-if="buttonImage" class="image-preview">
              <img :src="'file://' + buttonImage" alt="" />
            </div>
            <span v-else class="image-empty">{{ t('streamDeck.noImage') }}</span>
            <button class="modal-btn browse-btn" @click="browseImage">
              {{ t('streamDeck.browse') }}
            </button>
            <button v-if="buttonImage" class="shortcut-clear" @click="buttonImage = null">
              {{ t('hotkey.remove') }}
            </button>
          </div>
        </div>

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

  <EmojiPickerModal
    :visible="showFolderEmojiPicker"
    @select="(emoji: string) => { selectedFolderIcon = `${ImagePrefix.EMOJI}${emoji}`; }"
    @close="showFolderEmojiPicker = false"
  />
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
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
  color: var(--text-inverse);
  margin-bottom: 16px;
}

.type-select {
  margin-bottom: 14px;
}

.type-select label {
  display: block;
  font-size: 0.78rem;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.select-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
}

.search-row {
  margin-bottom: 10px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.85rem;
  box-sizing: border-box;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.sound-list {
  flex: 1;
  overflow-y: auto;
  max-height: 250px;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  margin-bottom: 16px;
}

.sound-item {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
}

.sound-item:hover {
  background: var(--bg-card-hover);
}

.sound-item.selected {
  background: var(--bg-active);
  color: var(--accent);
}

.empty-list {
  padding: 20px;
  text-align: center;
  color: var(--text-tertiary);
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
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.modal-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.modal-btn:active {
  transform: scale(0.97);
}

.modal-btn.primary {
  border-color: var(--accent);
  color: var(--accent);
}

.modal-btn.primary:hover {
  background: var(--accent);
  color: var(--text-inverse);
}

.modal-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.modal-btn:disabled:hover {
  border-color: var(--border-default);
  color: var(--text-primary);
  background: var(--bg-input);
}

.icon-preview-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-preview {
  width: 42px;
  height: 42px;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: var(--bg-input);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.icon-preview:hover {
  border-color: var(--accent);
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
  color: var(--text-tertiary);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px;
}

.icon-clear:hover {
  color: var(--color-error);
}

.empty-hint {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  margin-top: 6px;
}

.shortcut-capture {
  background: var(--bg-card);
  border: 2px solid var(--border-default);
  border-radius: var(--small-radius);
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s;
  outline: none;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shortcut-capture:focus,
.shortcut-capture.listening {
  border-color: var(--accent);
}

.shortcut-listening {
  font-size: 0.8rem;
  color: var(--accent);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.shortcut-keys {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-inverse);
  font-family: monospace;
  letter-spacing: 0.5px;
}

.shortcut-empty {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.shortcut-clear {
  border: none;
  background: none;
  color: var(--color-error);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 4px 0;
  margin-top: 4px;
}

.shortcut-clear:hover {
  opacity: 0.8;
}

.app-path-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.app-path-input {
  flex: 1;
  cursor: pointer;
}

.browse-btn {
  flex-shrink: 0;
  width: auto;
  padding: 8px 14px;
}

.image-section {
  border-top: 1px solid var(--border-default);
  padding-top: 14px;
}

.image-preview {
  width: 42px;
  height: 42px;
  border-radius: var(--small-radius);
  overflow: hidden;
  flex-shrink: 0;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-empty {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  flex: 1;
}

.icon-emoji-btn {
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  transition: border-color 0.15s;
}

.icon-emoji-btn:hover {
  border-color: var(--text-tertiary);
}

.icon-emoji-icon {
  font-size: 16px;
  line-height: 1;
}
</style>
