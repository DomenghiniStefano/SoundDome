<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import PageHeader from '../components/layout/PageHeader.vue';
import SettingSection from '../components/settings/SettingSection.vue';
import SettingActionRow from '../components/settings/SettingActionRow.vue';
import SwitchToggle from '../components/ui/SwitchToggle.vue';
import VolumeSlider from '../components/settings/VolumeSlider.vue';
import DeviceSelect from '../components/settings/DeviceSelect.vue';
import PlayButton from '../components/ui/PlayButton.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import ToastNotification from '../components/ui/ToastNotification.vue';
import HotkeyModal from '../components/cards/HotkeyModal.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import IconButton from '../components/ui/IconButton.vue';
import SettingRow from '../components/settings/SettingRow.vue';
import { useConfigStore } from '../stores/config';
import { useLibraryStore } from '../stores/library';
import { useUsedHotkeys } from '../composables/useUsedHotkeys';
import { useAudio } from '../composables/useAudio';
import { useDevices } from '../composables/useDevices';
import { useMicMixer } from '../composables/useMicMixer';
import { useConfirmDialog } from '../composables/useConfirmDialog';
import {
  openExternal, getAutoLaunch, setAutoLaunch, configExport, importInspect, importExecute,
  onUpdateAvailable, onUpdateNotAvailable, onUpdateDownloaded, onUpdateError, onUpdateProgress,
  removeUpdateListeners, updateCheck, updateInstall
} from '../services/api';
import { ToastType, UpdateStatus } from '../enums/ui';
import type { ToastTypeValue, UpdateStatusValue } from '../enums/ui';
import { VBCABLE_LABEL_KEYWORD, VBCABLE_DOWNLOAD_URL, TOAST_RESET_DELAY } from '../enums/constants';

const { t } = useI18n();
const config = useConfigStore();
const libraryStore = useLibraryStore();
const { playTest, isTestPlaying, stopTest } = useAudio();

const { isMicActive, micError } = useMicMixer();

const devices = ref<{ value: string; label: string }[]>([]);
const inputDevices = ref<{ value: string; label: string }[]>([]);
const vbcableMissing = ref(false);
const toastMessage = ref('');
const toastType = ref<ToastTypeValue>(ToastType.INFO);

const autoLaunch = ref(false);
const showStopHotkeyModal = ref(false);
const confirmDialog = useConfirmDialog();

const updateStatus = ref<UpdateStatusValue>(UpdateStatus.IDLE);
const updateVersion = ref('');
const updatePercent = ref(0);

const { enumerateOutputDevices, enumerateInputDevices } = useDevices();
const { usedHotkeys } = useUsedHotkeys();

const updateHint = computed(() => {
  switch (updateStatus.value) {
    case UpdateStatus.CHECKING:
      return t('update.checking');
    case UpdateStatus.AVAILABLE:
      return t('update.available', { version: updateVersion.value });
    case UpdateStatus.DOWNLOADING:
      return t('update.downloading', { percent: updatePercent.value });
    case UpdateStatus.READY:
      return t('update.ready', { version: updateVersion.value });
    case UpdateStatus.UP_TO_DATE:
      return t('update.upToDate');
    case UpdateStatus.ERROR:
      return t('update.error');
    default:
      return t('update.checkHint', { version: APP_VERSION });
  }
});

const updateActionLabel = computed(() => {
  if (updateStatus.value === UpdateStatus.READY) return t('update.install');
  return t('update.checkAction');
});

const isUpdateBusy = computed(() =>
  updateStatus.value === UpdateStatus.CHECKING || updateStatus.value === UpdateStatus.DOWNLOADING
);

async function onUpdateAction() {
  if (updateStatus.value === UpdateStatus.READY) {
    updateInstall();
    return;
  }
  updateStatus.value = UpdateStatus.CHECKING;
  await updateCheck();
}

function toDeviceOptions(list: { deviceId: string; label: string }[]) {
  return _.map(list, d => ({ value: d.deviceId, label: d.label }));
}

async function loadDevicesAndDetectCable() {
  const audioDevices = await enumerateOutputDevices();
  devices.value = toDeviceOptions(audioDevices);

  const cableDevice = _.find(audioDevices, d => d.label.toLowerCase().includes(VBCABLE_LABEL_KEYWORD));
  if (cableDevice) {
    if (!config.virtualMicDeviceId) {
      config.virtualMicDeviceId = cableDevice.deviceId;
    }
    vbcableMissing.value = false;
  } else {
    vbcableMissing.value = true;
  }

  const micDevices = await enumerateInputDevices();
  inputDevices.value = toDeviceOptions(micDevices);
}

onMounted(async () => {
  autoLaunch.value = await getAutoLaunch();
  await loadDevicesAndDetectCable();
  await config.load();

  onUpdateAvailable((data) => {
    updateVersion.value = data.version;
    updateStatus.value = UpdateStatus.AVAILABLE;
  });
  onUpdateNotAvailable(() => {
    updateStatus.value = UpdateStatus.UP_TO_DATE;
  });
  onUpdateProgress((data) => {
    updatePercent.value = data.percent;
    updateStatus.value = UpdateStatus.DOWNLOADING;
  });
  onUpdateDownloaded((data) => {
    updateVersion.value = data.version;
    updateStatus.value = UpdateStatus.READY;
  });
  onUpdateError(() => {
    updateStatus.value = UpdateStatus.ERROR;
  });
});

onUnmounted(() => {
  removeUpdateListeners();
});

// Auto-save config on changes
watch(
  () => [
    config.sendToSpeakers,
    config.sendToVirtualMic,
    config.speakerDeviceId,
    config.virtualMicDeviceId,
    config.outputVolume,
    config.monitorVolume,
    config.micDeviceId,
    config.micVolume,
    config.enableMicPassthrough,
    config.locale,
    config.stopHotkey
  ],
  () => {
    config.save();
  }
);

function showToast(message: string, type: ToastTypeValue = ToastType.INFO) {
  toastMessage.value = '';
  setTimeout(() => {
    toastMessage.value = message;
    toastType.value = type;
  }, TOAST_RESET_DELAY);
}

async function onPlayTest() {
  if (isTestPlaying.value) {
    stopTest();
    return;
  }
  const result = await playTest();
  showToast(result.message, result.success ? ToastType.SUCCESS : ToastType.ERROR);
}

function onVbcableLink() {
  openExternal(VBCABLE_DOWNLOAD_URL);
}

async function runExport(includeBackups: boolean) {
  try {
    const result = await libraryStore.doExport(includeBackups);
    if (result.canceled) return;
    if (result.success) {
      showToast(t('toast.exported', { count: result.count }), ToastType.SUCCESS);
    } else {
      showToast(result.error || t('toast.exportFailed'), ToastType.ERROR);
    }
  } catch (err) {
    showToast(t('toast.exportFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

async function onExport() {
  try {
    const hasBackups = await libraryStore.hasBackups();
    if (hasBackups) {
      confirmDialog.showCustom(
        t('confirm.includeBackups.title'),
        t('confirm.includeBackups.message'),
        [
          { label: t('common.cancel'), event: 'cancel' },
          { label: t('confirm.includeBackups.exclude'), event: 'exclude' },
          { label: t('confirm.includeBackups.include'), event: 'include', variant: 'accent' },
        ],
        {
          include: () => runExport(true),
          exclude: () => runExport(false),
        }
      );
      return;
    }
    await runExport(false);
  } catch (err) {
    showToast(t('toast.exportFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

function onClearLibrary() {
  confirmDialog.show(t('confirm.clearLibrary.title'), t('confirm.clearLibrary.message'), async () => {
    try {
      const count = libraryStore.items.length;
      await libraryStore.clearAll();
      await libraryStore.load();
      showToast(t('toast.deleted', { count }), ToastType.SUCCESS);
    } catch (err) {
      showToast(t('toast.clearFailed') + ': ' + (err as Error).message, ToastType.ERROR);
    }
  });
}

function onResetSettings() {
  confirmDialog.show(t('confirm.resetSettings.title'), t('confirm.resetSettings.message'), async () => {
    await config.resetDefaults();
    await loadDevicesAndDetectCable();
    showToast(t('toast.resetDone'), ToastType.SUCCESS);
  });
}

async function onToggleAutoLaunch(value: boolean) {
  await setAutoLaunch(value);
  autoLaunch.value = value;
}

async function onExportSettings() {
  try {
    const result = await configExport();
    if (result.canceled) return;
    if (result.success) {
      showToast(t('toast.settingsExported'), ToastType.SUCCESS);
    } else {
      showToast(result.error || t('toast.settingsExportFailed'), ToastType.ERROR);
    }
  } catch (err) {
    showToast(t('toast.settingsExportFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

const pendingImport = ref<ImportPreview | null>(null);

const importConfirmMessage = computed(() => {
  if (!pendingImport.value) return '';
  if (pendingImport.value.type === 'library' && pendingImport.value.library) {
    const { totalSounds, newSounds, groups } = pendingImport.value.library;
    if (newSounds === 0) return t('settings.import.noNewSounds', { totalSounds });
    return t('settings.import.confirmLibrary', { totalSounds, newSounds, groups });
  }
  if (pendingImport.value.type === 'settings' && pendingImport.value.settings) {
    return t('settings.import.confirmSettings', { count: pendingImport.value.settings.count });
  }
  return '';
});

async function onUnifiedImport() {
  try {
    const preview = await importInspect();
    if (!preview) return;
    if (preview.type === 'library' && preview.library && preview.library.newSounds === 0) {
      showToast(t('settings.import.noNewSounds', { totalSounds: preview.library.totalSounds }), ToastType.INFO);
      return;
    }
    pendingImport.value = preview;
  } catch (err) {
    showToast(t('toast.importFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

async function onConfirmImport() {
  if (!pendingImport.value) return;
  const filePath = pendingImport.value.filePath;
  const importType = pendingImport.value.type;
  pendingImport.value = null;

  try {
    const result = await importExecute(filePath);
    if (result.success) {
      if (importType === 'library') {
        await libraryStore.load();
        showToast(t('toast.imported', { added: result.added, total: result.total }), ToastType.SUCCESS);
      } else {
        await config.load();
        await loadDevicesAndDetectCable();
        showToast(t('toast.settingsImported'), ToastType.SUCCESS);
      }
    } else {
      showToast(result.error || t('toast.importFailed'), ToastType.ERROR);
    }
  } catch (err) {
    showToast(t('toast.importFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}
</script>

<template>
  <div class="page">
    <PageHeader :title="t('settings.title')" :subtitle="t('settings.subtitle')" />

    <div v-if="vbcableMissing" class="vbcable-banner">
      <strong>{{ t('settings.vbcableMissing.title') }}</strong><br>
      {{ t('settings.vbcableMissing.description') }}<br>
      <a href="#" @click.prevent="onVbcableLink">{{ VBCABLE_DOWNLOAD_URL }}</a><br>
      <small>{{ t('settings.vbcableMissing.restart') }}</small>
    </div>

    <!-- Output -->
    <SettingSection :title="t('settings.output.title')" :tooltip="t('settings.output.tooltip')">
      <div class="subsection-label">{{ t('settings.virtualMic.title') }}</div>
      <VolumeSlider v-model="config.outputVolume" :label="t('common.volume')" :disabled="!config.sendToVirtualMic">
        <template #icon>
          <AppIcon name="microphone" />
        </template>
        <template #prefix>
          <SwitchToggle v-model="config.sendToVirtualMic" small />
        </template>
      </VolumeSlider>
      <DeviceSelect
        v-model="config.virtualMicDeviceId"
        :label="t('common.device')"
        :options="devices"
      />

      <div class="subsection-label mt">{{ t('settings.speakers.title') }}</div>
      <VolumeSlider v-model="config.monitorVolume" :label="t('common.volume')" :disabled="!config.sendToSpeakers">
        <template #icon>
          <AppIcon name="headphones" />
        </template>
        <template #prefix>
          <SwitchToggle v-model="config.sendToSpeakers" small />
        </template>
      </VolumeSlider>
      <DeviceSelect
        v-model="config.speakerDeviceId"
        :label="t('common.device')"
        :options="devices"
      />
    </SettingSection>

    <!-- Input -->
    <SettingSection :title="t('settings.input.title')" :tooltip="t('settings.input.tooltip')">
      <VolumeSlider v-model="config.micVolume" :label="t('common.volume')" :disabled="!config.enableMicPassthrough">
        <template #icon>
          <AppIcon name="microphone" />
        </template>
        <template #prefix>
          <SwitchToggle v-model="config.enableMicPassthrough" small />
        </template>
      </VolumeSlider>
      <DeviceSelect
        v-model="config.micDeviceId"
        :label="t('common.device')"
        :options="inputDevices"
      />
      <div v-if="micError" class="mic-status error">{{ micError }}</div>
    </SettingSection>

    <!-- Test -->
    <SettingSection :title="t('settings.testAudio.title')" :tooltip="t('settings.testAudio.tooltip')">
      <div class="play-section">
        <PlayButton :playing="isTestPlaying" @click="onPlayTest" />
      </div>
    </SettingSection>

    <!-- Hotkeys -->
    <SettingSection :title="t('settingsHotkeys.title')" :tooltip="t('settingsHotkeys.tooltip')">
      <SettingRow :label="t('settingsHotkeys.stopLabel')" :hint="t('settingsHotkeys.stopHint')">
        <IconButton
          icon="keyboard"
          :label="config.stopHotkey ?? t('settingsHotkeys.none')"
          :size="12"
          :active="!!config.stopHotkey"
          class="hotkey-set-btn"
          @click="showStopHotkeyModal = true"
        />
      </SettingRow>
      <HotkeyModal
        :visible="showStopHotkeyModal"
        :name="t('settingsHotkeys.stopLabel')"
        :hotkey="config.stopHotkey"
        :used-hotkeys="usedHotkeys"
        @close="showStopHotkeyModal = false"
        @update:hotkey="(v: string | null) => { config.stopHotkey = v; showStopHotkeyModal = false; }"
      />
    </SettingSection>

    <!-- Language -->
    <SettingSection :title="t('settings.language.title')">
      <DeviceSelect
        v-model="config.locale"
        :label="t('settings.language.label')"
        :options="[{ value: 'en', label: 'English' }, { value: 'it', label: 'Italiano' }]"
        hide-default
      />
    </SettingSection>

    <!-- Startup -->
    <SettingSection :title="t('settings.startup.title')" :tooltip="t('settings.startup.tooltip')">
      <SettingRow :label="t('settings.startup.label')" :hint="t('settings.startup.hint')">
        <SwitchToggle :modelValue="autoLaunch" @update:modelValue="onToggleAutoLaunch" />
      </SettingRow>
    </SettingSection>

    <!-- Updates -->
    <SettingSection :title="t('update.title')" :tooltip="t('update.tooltip')">
      <SettingActionRow
        :label="t('update.checkLabel')"
        :hint="updateHint"
        :action-label="updateActionLabel"
        :action-icon="updateStatus === 'ready' ? 'download' : 'cloud'"
        @action="onUpdateAction"
      />
      <div v-if="updateStatus === 'downloading'" class="update-progress">
        <div class="update-progress-bar" :style="{ width: updatePercent + '%' }" />
      </div>
    </SettingSection>

    <!-- Backup & Restore -->
    <SettingSection :title="t('settings.backup.title')" :tooltip="t('settings.backup.tooltip')">
      <SettingActionRow
        :label="t('settings.backup.exportLibraryLabel')"
        :hint="t('settings.backup.exportLibraryHint')"
        :action-label="t('settings.backup.exportAction')"
        action-icon="download"
        @action="onExport"
      />
      <SettingActionRow
        :label="t('settings.backup.exportSettingsLabel')"
        :hint="t('settings.backup.exportSettingsHint')"
        :action-label="t('settings.backup.exportAction')"
        action-icon="download"
        @action="onExportSettings"
      />
      <SettingActionRow
        :label="t('settings.backup.importLabel')"
        :hint="t('settings.backup.importHint')"
        :action-label="t('settings.backup.importAction')"
        action-icon="upload"
        @action="onUnifiedImport"
      />
    </SettingSection>

    <!-- Danger Zone -->
    <SettingSection :title="t('settings.dangerZone.title')" :tooltip="t('settings.dangerZone.tooltip')">
      <SettingActionRow
        :label="t('settings.dangerZone.clearLabel')"
        :hint="t('settings.dangerZone.clearHint')"
        :action-label="t('settings.dangerZone.clearAction')"
        action-icon="trash"
        danger
        @action="onClearLibrary"
      />
      <SettingActionRow
        :label="t('settings.dangerZone.resetLabel')"
        :hint="t('settings.dangerZone.resetHint')"
        :action-label="t('settings.dangerZone.resetAction')"
        action-icon="history"
        danger
        @action="onResetSettings"
      />
    </SettingSection>

    <ToastNotification :message="toastMessage" :type="toastType" />
    <ConfirmModal
      :visible="!!pendingImport"
      :title="t('settings.import.title')"
      :message="importConfirmMessage"
      @confirm="onConfirmImport"
      @cancel="pendingImport = null"
    />

    <ConfirmModal
      :visible="confirmDialog.visible.value"
      :title="confirmDialog.title.value"
      :message="confirmDialog.message.value"
      :actions="confirmDialog.actions.value"
      @confirm="confirmDialog.confirm"
      @cancel="confirmDialog.cancel"
      @action="confirmDialog.onAction"
    />
  </div>
</template>

<style scoped>
.page {
  padding: var(--page-padding);
}

.vbcable-banner {
  background: #1a1a00;
  border: 1px solid var(--color-warning);
  border-radius: var(--input-radius);
  padding: 14px 18px;
  margin-bottom: 20px;
  font-size: 0.85rem;
  line-height: 1.6;
}

.vbcable-banner strong {
  color: var(--color-warning);
}

.vbcable-banner a {
  color: var(--color-accent);
  text-decoration: underline;
  cursor: pointer;
}

.play-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0 16px;
}

.mic-status {
  font-size: 0.8rem;
  margin-top: 8px;
  color: var(--color-text-dim);
}

.mic-status.active {
  color: var(--color-accent);
}

.mic-status.error {
  color: var(--color-error);
}

.hotkey-set-btn {
  font-family: monospace;
}

.subsection-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 8px;
}

.subsection-label.mt {
  margin-top: 16px;
}

.update-progress {
  height: 4px;
  background: var(--color-bg-input);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.update-progress-bar {
  height: 100%;
  background: var(--color-accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}
</style>
