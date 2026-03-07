<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
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
import { openExternal, getAutoLaunch, setAutoLaunch } from '../services/api';
import { ToastType } from '../enums/ui';
import type { ToastTypeValue } from '../enums/ui';
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

const { enumerateOutputDevices, enumerateInputDevices } = useDevices();
const { usedHotkeys } = useUsedHotkeys();

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

async function onImport() {
  try {
    const result = await libraryStore.doImport();
    if (result.canceled) return;
    if (result.success) {
      showToast(t('toast.imported', { added: result.added, total: result.total }), ToastType.SUCCESS);
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

    <SettingSection :title="t('settings.virtualMic.title')" :tooltip="t('settings.virtualMic.tooltip')">
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
    </SettingSection>

    <SettingSection :title="t('settings.speakers.title')" :tooltip="t('settings.speakers.tooltip')">
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

    <SettingSection :title="t('settings.microphone.title')" :tooltip="t('settings.microphone.tooltip')">
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

    <SettingSection :title="t('settings.testAudio.title')" :tooltip="t('settings.testAudio.tooltip')">
      <div class="play-section">
        <PlayButton :playing="isTestPlaying" @click="onPlayTest" />
      </div>
    </SettingSection>

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

    <SettingSection :title="t('settings.language.title')">
      <DeviceSelect
        v-model="config.locale"
        :label="t('settings.language.label')"
        :options="[{ value: 'en', label: 'English' }, { value: 'it', label: 'Italiano' }]"
        hide-default
      />
    </SettingSection>

    <SettingSection :title="t('settings.startup.title')" :tooltip="t('settings.startup.tooltip')">
      <SettingRow :label="t('settings.startup.label')" :hint="t('settings.startup.hint')">
        <SwitchToggle :modelValue="autoLaunch" @update:modelValue="onToggleAutoLaunch" />
      </SettingRow>
    </SettingSection>

    <SettingSection :title="t('settings.library.title')" :tooltip="t('settings.library.tooltip')">
      <SettingActionRow
        :label="t('settings.library.exportLabel')"
        :hint="t('settings.library.exportHint')"
        :action-label="t('settings.library.exportAction')"
        @action="onExport"
      />
      <SettingActionRow
        :label="t('settings.library.importLabel')"
        :hint="t('settings.library.importHint')"
        :action-label="t('settings.library.importAction')"
        @action="onImport"
      />
      <SettingActionRow
        :label="t('settings.library.clearLabel')"
        :hint="t('settings.library.clearHint')"
        :action-label="t('settings.library.clearAction')"
        danger
        @action="onClearLibrary"
      />
    </SettingSection>

    <SettingSection :title="t('settings.reset.title')">
      <SettingActionRow
        :label="t('settings.reset.label')"
        :hint="t('settings.reset.hint')"
        :action-label="t('settings.reset.action')"
        danger
        @action="onResetSettings"
      />
    </SettingSection>

    <ToastNotification :message="toastMessage" :type="toastType" />
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
</style>
