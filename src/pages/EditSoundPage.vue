<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppIcon from '../components/ui/AppIcon.vue';
import SwitchToggle from '../components/ui/SwitchToggle.vue';
import VolumeSection from '../components/edit/VolumeSection.vue';
import TrimSection from '../components/edit/TrimSection.vue';
import HotkeySection from '../components/edit/HotkeySection.vue';
import BackupSection from '../components/edit/BackupSection.vue';
import _ from 'lodash';
import { useLibraryStore } from '../stores/library';
import { useAudio } from '../composables/useAudio';
import { VOLUME_DIVISOR } from '../enums/constants';
import { RouteName } from '../enums/routes';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const libraryStore = useLibraryStore();
const { playLibraryItem, activeRoutedAudios } = useAudio();

const trimRef = ref<InstanceType<typeof TrimSection>>();
const testing = ref(false);
const saving = ref(false);
const restoring = ref(false);
const backups = ref<BackupItem[]>([]);
const trimError = ref('');
let testAudio: HTMLAudioElement | null = null;

const item = computed<LibraryItem | undefined>(() =>
  _.find(libraryStore.items, { id: route.params.id as string })
);

const fileUrl = ref('');

async function loadFileUrl() {
  const id = route.params.id as string;
  // Ensure library is loaded
  if (_.isEmpty(libraryStore.items)) await libraryStore.load();
  const it = _.find(libraryStore.items, { id });
  if (it) {
    const path = await libraryStore.getFilePath(it.filename);
    fileUrl.value = `file://${path}`;
    backups.value = await libraryStore.listBackups(id);
  }
}
loadFileUrl();

const usedHotkeys = computed(() => {
  const withHotkey = _.filter(libraryStore.items, 'hotkey') as LibraryItem[];
  return new Map(_.map(withHotkey, it => [it.hotkey, it.name] as [string, string]));
});

const testVolume = computed(() => {
  if (!item.value || item.value.useDefault) return 1;
  return item.value.volume / VOLUME_DIVISOR;
});

watch(testVolume, (v) => {
  if (testAudio) testAudio.volume = v;
  for (const audio of activeRoutedAudios.value) {
    audio.volume = v;
  }
});

function isFullSelection(): boolean {
  if (!trimRef.value || !trimRef.value.duration) return true;
  return trimRef.value.startTime === 0 && trimRef.value.endTime >= trimRef.value.duration;
}

function goBack() {
  router.push({ name: RouteName.LIBRARY });
}

async function onUpdate(data: Partial<Pick<LibraryItem, 'volume' | 'useDefault' | 'hotkey' | 'backupEnabled'>>) {
  if (!item.value) return;
  await libraryStore.update(item.value.id, data);
}

async function onTest() {
  if (testing.value) {
    stopTest();
    return;
  }
  if (!fileUrl.value || !trimRef.value) return;

  testAudio = new Audio(fileUrl.value);
  testAudio.currentTime = trimRef.value.startTime;
  testAudio.volume = testVolume.value;
  testing.value = true;

  const trimEnd = trimRef.value.endTime;

  testAudio.addEventListener('timeupdate', () => {
    if (testAudio && testAudio.currentTime >= trimEnd) {
      stopTest();
    }
  });
  testAudio.addEventListener('ended', () => stopTest());
  testAudio.play();
}

function stopTest() {
  if (testAudio) {
    testAudio.pause();
    testAudio.src = '';
    testAudio = null;
  }
  testing.value = false;
}

async function reloadAudioFile() {
  if (!item.value || !trimRef.value) return;
  await libraryStore.load();
  const path = await libraryStore.getFilePath(item.value.filename);
  fileUrl.value = `file://${path}?t=${Date.now()}`;
  backups.value = await libraryStore.listBackups(item.value.id);
  await trimRef.value.reload();
}

async function onTrimSave(andExit = false) {
  if (!item.value || !trimRef.value) return;
  stopTest();

  if (isFullSelection()) {
    if (andExit) goBack();
    return;
  }

  saving.value = true;
  trimError.value = '';

  const result = await libraryStore.trim(item.value.id, trimRef.value.startTime, trimRef.value.endTime);
  saving.value = false;

  if (!result.success) {
    trimError.value = result.error || t('toast.trimError');
    return;
  }

  if (andExit) {
    await libraryStore.load();
    goBack();
  } else {
    await reloadAudioFile();
  }
}

async function onRestore(timestamp: number) {
  if (!item.value || !trimRef.value) return;
  restoring.value = true;
  trimError.value = '';
  stopTest();

  const result = await libraryStore.restoreBackup(item.value.id, timestamp);
  restoring.value = false;

  if (!result.success) {
    trimError.value = result.error || t('toast.trimError');
    return;
  }

  await reloadAudioFile();
}

async function onDeleteBackup(timestamp: number) {
  if (!item.value) return;
  await libraryStore.deleteBackup(item.value.id, timestamp);
  backups.value = await libraryStore.listBackups(item.value.id);
}

async function onDeleteAllBackups() {
  if (!item.value) return;
  await libraryStore.deleteAllBackups(item.value.id);
  backups.value = [];
}

async function onPlay() {
  if (!item.value) return;
  await playLibraryItem(item.value);
}
</script>

<template>
  <div class="page">
    <div v-if="item && fileUrl" class="edit-page">
      <div class="edit-page-header">
        <button class="edit-page-back" @click="goBack">
          <AppIcon name="arrow-back" :size="18" />
        </button>
        <div class="edit-page-title">
          <span class="edit-page-name">{{ item.name }}</span>
          <span class="edit-page-subtitle">{{ t('editSound.subtitle') }}</span>
        </div>
      </div>

      <div class="edit-page-layout">
        <div class="edit-page-sections">
          <VolumeSection
            :volume="item.volume"
            :use-default="item.useDefault"
            @update:volume="(v) => onUpdate({ volume: v })"
            @update:use-default="(v) => onUpdate({ useDefault: v })"
          />

          <TrimSection
            ref="trimRef"
            :file-url="fileUrl"
          />

          <BackupSection
            :name="item.name"
            :backups="backups"
            :restoring="restoring"
            @restore="onRestore"
            @delete="onDeleteBackup"
            @delete-all="onDeleteAllBackups"
          />

          <HotkeySection
            :name="item.name"
            :hotkey="item.hotkey"
            :used-hotkeys="usedHotkeys"
            @update:hotkey="(v) => onUpdate({ hotkey: v })"
          />
        </div>

        <div class="edit-page-sidebar">
          <button class="edit-action-btn test" :class="{ active: testing }" @click="onTest">
            <AppIcon :name="testing ? 'stop' : 'headphones'" :size="14" />
            {{ testing ? t('editSound.stopTest') : t('editSound.test') }}
          </button>
          <button class="edit-action-btn play" @click="onPlay">
            <AppIcon name="play" :size="14" />
            {{ t('editSound.play') }}
          </button>
          <div class="edit-sidebar-toggle">
            <SwitchToggle
              :model-value="item.backupEnabled"
              @update:model-value="(v) => onUpdate({ backupEnabled: v })"
            />
            <span class="edit-sidebar-toggle-label">{{ t('editSound.backupOnTrim') }}</span>
          </div>
          <button class="edit-action-btn trim" :disabled="saving" @click="onTrimSave(false)">
            {{ saving ? t('editSound.saving') : t('editSound.save') }}
          </button>
          <button class="edit-action-btn trim-exit" :disabled="saving" @click="onTrimSave(true)">
            {{ t('editSound.saveAndExit') }}
          </button>
          <div v-if="trimError" class="edit-page-error">{{ trimError }}</div>
        </div>
      </div>
    </div>

    <div v-else class="edit-page-notfound">
      <p>{{ t('editSound.notFound') }}</p>
      <button class="edit-page-back-btn" @click="goBack">
        {{ t('editSound.backToLibrary') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--page-padding);
}

.edit-page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.edit-page-back {
  border: none;
  background: none;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color 0.15s, background 0.15s;
}

.edit-page-back:hover {
  color: var(--color-text-white);
  background: var(--color-bg-card-hover);
}

.edit-page-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.edit-page-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-white, #fff);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-page-subtitle {
  font-size: 0.75rem;
  color: var(--color-text-dimmer);
}

.edit-page-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.edit-page-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-width: 0;
  max-width: 560px;
}

.edit-page-sidebar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 160px;
  flex-shrink: 0;
  position: sticky;
  top: 20px;
}

.edit-action-btn {
  width: 100%;
  border: none;
  cursor: pointer;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: opacity 0.15s, background 0.15s;
}

.edit-action-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.edit-action-btn.test {
  background: var(--color-bg-card);
  color: var(--color-text-white);
  border: 1px solid var(--color-border, #333);
}

.edit-action-btn.test:hover {
  background: var(--color-bg-card-hover);
}

.edit-action-btn.test.active {
  background: rgba(231, 76, 60, 0.15);
  color: var(--color-error);
  border-color: transparent;
}

.edit-action-btn.play {
  background: var(--color-bg-card);
  color: var(--color-accent);
  border: 1px solid var(--color-border, #333);
}

.edit-action-btn.play:hover {
  background: var(--color-bg-card-hover);
}

.edit-action-btn.trim {
  background: var(--color-accent);
  color: #000;
}

.edit-action-btn.trim:hover:not(:disabled) {
  opacity: 0.85;
}

.edit-action-btn.trim-exit {
  background: transparent;
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
}

.edit-action-btn.trim-exit:hover:not(:disabled) {
  background: var(--color-accent);
  color: #000;
}

.edit-sidebar-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.edit-sidebar-toggle-label {
  font-size: 0.72rem;
  color: var(--color-text-dimmer);
}

.edit-page-error {
  color: var(--color-error);
  font-size: 0.78rem;
}

.edit-page-notfound {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--color-text-dimmer);
  gap: 16px;
}

.edit-page-back-btn {
  border: none;
  background: var(--color-accent);
  color: #000;
  cursor: pointer;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}

.edit-page-back-btn:hover {
  opacity: 0.85;
}
</style>
