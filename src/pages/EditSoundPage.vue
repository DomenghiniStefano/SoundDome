<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppIcon from '../components/ui/AppIcon.vue';
import IconButton from '../components/ui/IconButton.vue';
import VolumeSection from '../components/edit/VolumeSection.vue';
import TrimSection from '../components/edit/TrimSection.vue';
import HotkeySection from '../components/edit/HotkeySection.vue';
import BackupSection from '../components/edit/BackupSection.vue';
import GroupsSection from '../components/edit/GroupsSection.vue';
import ImageSection from '../components/edit/ImageSection.vue';
import LoadingBars from '../components/ui/LoadingBars.vue';
import ToastNotification from '../components/ui/ToastNotification.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import type { ModalAction } from '../components/ui/ConfirmModal.vue';
import _ from 'lodash';
import { useLibraryStore } from '../stores/library';
import { useAudio } from '../composables/useAudio';
import { useUsedHotkeys } from '../composables/useUsedHotkeys';
import { useToast } from '../composables/useToast';
import { VOLUME_DIVISOR, VOLUME_ITEM_DEFAULT } from '../enums/constants';
import { RouteName } from '../enums/routes';
import { isFileImage, ToastType } from '../enums/ui';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const libraryStore = useLibraryStore();
const { activeRoutedAudios } = useAudio();

const trimRef = ref<InstanceType<typeof TrimSection>>();
const testing = ref(false);
const saving = ref(false);
const restoring = ref(false);
const redownloading = ref(false);
const showRedownloadConfirm = ref(false);
const backups = ref<BackupItem[]>([]);
const trimError = ref('');
const { toastMessage, toastType, showToast } = useToast();
let testAudio: HTMLAudioElement | null = null;

const item = computed<LibraryItem | undefined>(() =>
  _.find(libraryStore.items, { id: route.params.id as string })
);

const fileUrl = ref('');
const pendingImage = ref<string | null>(null);
const pendingImageUrl = ref<string | null>(null);
const pendingName = ref('');
const pendingVolume = ref(VOLUME_ITEM_DEFAULT);
const pendingHotkey = ref<string | null>(null);
const pendingFavorite = ref(false);
const pendingBackupEnabled = ref(true);
const editingName = ref(false);
const nameInputRef = ref<HTMLInputElement>();

watch(editingName, async (val) => {
  if (val) {
    await nextTick();
    nameInputRef.value?.focus();
    nameInputRef.value?.select();
  }
});

function initPending(it: LibraryItem) {
  pendingName.value = it.name;
  pendingImage.value = it.image;
  pendingVolume.value = it.volume;
  pendingHotkey.value = it.hotkey;
  pendingBackupEnabled.value = it.backupEnabled;
  pendingFavorite.value = it.favorite;
}

function onNameBlur() {
  editingName.value = false;
  if (!pendingName.value.trim() && item.value) {
    pendingName.value = item.value.name;
  }
}

async function loadFileUrl() {
  const id = route.params.id as string;
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
loadFileUrl();

const { usedHotkeys } = useUsedHotkeys();

const testVolume = computed(() => _.clamp(pendingVolume.value / VOLUME_DIVISOR, 0, 1));

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

function onPendingUpdate(data: Partial<Pick<LibraryItem, 'volume' | 'hotkey' | 'backupEnabled'>>) {
  if ('volume' in data) pendingVolume.value = data.volume!;
  if ('hotkey' in data) pendingHotkey.value = data.hotkey!;
  if ('backupEnabled' in data) pendingBackupEnabled.value = data.backupEnabled!;
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

  saving.value = true;
  trimError.value = '';

  await saveAllChanges();

  if (!isFullSelection()) {
    const result = await libraryStore.trim(item.value.id, trimRef.value.startTime, trimRef.value.endTime);

    if (!result.success) {
      saving.value = false;
      trimError.value = result.error || t('toast.trimError');
      return;
    }
  }

  saving.value = false;

  if (andExit) {
    await libraryStore.load();
    skipGuard.value = true;
    goBack();
  } else {
    await reloadAudioFile();
    showToast(t('toast.saved'), ToastType.SUCCESS);
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

async function onRedownload() {
  if (!item.value || !item.value.sourceUrl || redownloading.value) return;
  redownloading.value = true;
  stopTest();
  try {
    const success = await libraryStore.reset(item.value.id);
    if (success) {
      await reloadAudioFile();
      showToast(t('toast.redownloaded'), ToastType.SUCCESS);
    } else {
      showToast(t('toast.redownloadFailed'), ToastType.ERROR);
    }
  } catch {
    showToast(t('toast.redownloadFailed'), ToastType.ERROR);
  } finally {
    redownloading.value = false;
  }
}

async function onSetImage() {
  if (!item.value) return;
  const updated = await libraryStore.setImage(item.value.id);
  if (updated?.image) {
    pendingImage.value = updated.image;
    const imgPath = await libraryStore.getFilePath(updated.image);
    pendingImageUrl.value = `file://${imgPath}?t=${Date.now()}`;
  }
}

function onRemoveImage() {
  pendingImage.value = null;
  pendingImageUrl.value = null;
}

function onSelectImage(value: string) {
  pendingImage.value = value;
  pendingImageUrl.value = null;
}

async function saveAllChanges() {
  if (!item.value) return;

  if (isFileImage(item.value.image) && item.value.image !== pendingImage.value) {
    await libraryStore.removeImage(item.value.id);
  }

  await libraryStore.update(item.value.id, {
    name: pendingName.value.trim(),
    image: pendingImage.value,
    volume: pendingVolume.value,
    hotkey: pendingHotkey.value,
    backupEnabled: pendingBackupEnabled.value,
    favorite: pendingFavorite.value,
  });
}

const hasUnsavedChanges = computed(() => {
  if (!item.value) return false;
  if (pendingName.value.trim() !== item.value.name) return true;
  if (pendingImage.value !== item.value.image) return true;
  if (pendingVolume.value !== item.value.volume) return true;
  if (pendingHotkey.value !== item.value.hotkey) return true;
  if (pendingBackupEnabled.value !== item.value.backupEnabled) return true;
  if (pendingFavorite.value !== item.value.favorite) return true;
  if (!isFullSelection()) return true;
  return false;
});

const showUnsavedConfirm = ref(false);
const skipGuard = ref(false);

function goBackSafe() {
  if (hasUnsavedChanges.value) {
    showUnsavedConfirm.value = true;
  } else {
    goBack();
  }
}

function onConfirmLeave() {
  showUnsavedConfirm.value = false;
  skipGuard.value = true;
  stopTest();
  goBack();
}

async function onSaveAndLeave() {
  showUnsavedConfirm.value = false;
  await onTrimSave(true);
}

const unsavedActions = computed<ModalAction[]>(() => [
  { label: t('editSound.saveAndExit'), event: 'save', variant: 'accent' },
  { label: t('editSound.exitAnyway'), event: 'confirm', variant: 'danger' },
]);

function onUnsavedAction(event: string) {
  if (event === 'save') onSaveAndLeave();
  if (event === 'confirm') onConfirmLeave();
  if (event === 'cancel') showUnsavedConfirm.value = false;
}

onBeforeRouteLeave(() => {
  if (skipGuard.value || !hasUnsavedChanges.value) return true;
  showUnsavedConfirm.value = true;
  return false;
});

</script>

<template>
  <div class="page">
    <div v-if="item && fileUrl" class="edit-page">
      <div class="edit-page-header">
        <IconButton icon="arrow-back" :size="18" compact @click="goBackSafe" />
        <div class="edit-page-title">
          <input
            v-if="editingName"
            ref="nameInputRef"
            v-model="pendingName"
            class="edit-page-name-input"
            @blur="onNameBlur"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
          <span v-else class="edit-page-name" @click="editingName = true">
            {{ pendingName }}
            <AppIcon name="edit" :size="12" class="edit-name-icon" />
          </span>
          <span class="edit-page-subtitle">{{ t('editSound.subtitle') }}</span>
        </div>
        <IconButton
          icon="star"
          :size="16"
          :active="pendingFavorite"
          v-tooltip="pendingFavorite ? t('groups.unfavorite') : t('groups.favorite')"
          class="favorite-btn"
          :class="{ 'is-favorite': pendingFavorite }"
          @click="pendingFavorite = !pendingFavorite"
        />
        <div class="edit-header-actions">
          <button class="edit-action-btn trim" :disabled="saving" @click="onTrimSave(false)">
            <LoadingBars v-if="saving" :size="16" color="var(--text-on-accent)" />
            {{ saving ? t('editSound.saving') : t('editSound.save') }}
          </button>
        </div>
      </div>

      <div class="edit-page-layout">
        <div class="edit-page-sections">
          <ImageSection
            :image="pendingImage"
            :image-url="pendingImageUrl"
            @set-image="onSetImage"
            @remove-image="onRemoveImage"
            @select-image="onSelectImage"
          />

          <VolumeSection
            :volume="pendingVolume"
            @update:volume="(v) => onPendingUpdate({ volume: v })"
          />

          <TrimSection
            ref="trimRef"
            :file-url="fileUrl"
            :backup-enabled="pendingBackupEnabled"
            @update:backup-enabled="(v) => onPendingUpdate({ backupEnabled: v })"
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
            :hotkey="pendingHotkey"
            :used-hotkeys="usedHotkeys"
            @update:hotkey="(v) => onPendingUpdate({ hotkey: v })"
          />

          <GroupsSection
            :item-id="item.id"
            :groups="libraryStore.groups"
            @add-to-group="(groupId) => libraryStore.addToGroup(groupId, item.id)"
            @remove-from-group="(groupId) => libraryStore.removeFromGroup(groupId, item.id)"
          />
        </div>

        <div class="edit-page-sidebar">
          <span class="edit-sidebar-title">{{ t('editSound.preview') }}</span>
          <button class="edit-action-btn test" :class="{ active: testing }" @click="onTest">
            <AppIcon :name="testing ? 'stop' : 'headphones'" :size="14" />
            {{ testing ? t('editSound.stopTest') : t('editSound.test') }}
          </button>
          <button
            v-if="item.sourceUrl"
            class="edit-action-btn redownload"
            :disabled="redownloading"
            @click="showRedownloadConfirm = true"
          >
            <LoadingBars v-if="redownloading" :size="14" />
            <AppIcon v-else name="download" :size="14" />
            {{ t('editSound.redownload') }}
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

    <ToastNotification :message="toastMessage" :type="toastType" />

    <ConfirmModal
      :visible="showRedownloadConfirm"
      :title="t('confirm.redownload.title')"
      :message="t('confirm.redownload.message')"
      @confirm="showRedownloadConfirm = false; onRedownload()"
      @cancel="showRedownloadConfirm = false"
    />

    <ConfirmModal
      :visible="showUnsavedConfirm"
      :title="t('confirm.unsavedChanges.title')"
      :message="t('confirm.unsavedChanges.message')"
      :actions="unsavedActions"
      @action="onUnsavedAction"
      @cancel="showUnsavedConfirm = false"
    />
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
  margin: -40px -48px 0;
  padding: 40px 48px 20px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-primary);
}

.edit-page-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.edit-header-actions {
  flex-shrink: 0;
}

.edit-header-actions .edit-action-btn {
  padding: 8px 24px;
}

.edit-page-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-inverse);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.edit-name-icon {
  color: var(--text-tertiary);
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.edit-page-name:hover .edit-name-icon {
  opacity: 1;
}

.edit-page-name-input {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-inverse);
  background: var(--bg-card);
  border: 1px solid var(--accent);
  border-radius: var(--small-radius);
  padding: 2px 8px;
  outline: none;
  width: 100%;
}

.edit-page-subtitle {
  font-size: 0.75rem;
  color: var(--text-tertiary);
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
  overflow: hidden;
}

.edit-page-sidebar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 160px;
  min-width: 120px;
  position: sticky;
  top: 100px;
}

.edit-sidebar-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-inverse);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  background: var(--bg-card);
  color: var(--text-inverse);
  border: 1px solid var(--border-default);
}

.edit-action-btn.test:hover {
  background: var(--bg-card-hover);
}

.edit-action-btn.test.active {
  background: var(--color-error-subtle);
  color: var(--color-error);
  border-color: transparent;
}

.edit-action-btn.trim {
  background: var(--accent);
  color: var(--text-on-accent);
}

.edit-action-btn.trim:hover:not(:disabled) {
  opacity: 0.85;
}

.edit-action-btn.redownload {
  background: var(--bg-surface-hover);
  color: var(--text-tertiary);
  border: 1px solid var(--border-default);
}

.edit-action-btn.redownload:hover:not(:disabled) {
  background: var(--bg-surface-active);
  color: var(--text-inverse);
}

.favorite-btn.is-favorite {
  color: var(--color-warning);
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
  color: var(--text-tertiary);
  gap: 16px;
}

.edit-page-back-btn {
  border: none;
  background: var(--accent);
  color: var(--text-on-accent);
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
