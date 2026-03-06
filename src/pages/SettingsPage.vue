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
import { useConfigStore } from '../stores/config';
import { useLibraryStore } from '../stores/library';
import { useAudio } from '../composables/useAudio';
import { useMicMixer } from '../composables/useMicMixer';
import { openExternal } from '../services/api';
import { ToastType } from '../enums/ui';
import type { ToastTypeValue } from '../enums/ui';
import { VBCABLE_LABEL_KEYWORD, VBCABLE_DOWNLOAD_URL, TOAST_RESET_DELAY } from '../enums/constants';

const { t } = useI18n();
const config = useConfigStore();
const libraryStore = useLibraryStore();
const { playTest, isTestPlaying, stopAll } = useAudio();

const { isMicActive, micError } = useMicMixer();

const devices = ref<{ value: string; label: string }[]>([]);
const inputDevices = ref<{ value: string; label: string }[]>([]);
const vbcableMissing = ref(false);
const toastMessage = ref('');
const toastType = ref<ToastTypeValue>(ToastType.INFO);

const autoLaunch = ref(false);
const showStopHotkeyModal = ref(false);

const { enumerateDevices, enumerateInputDevices } = useAudio();

function toDeviceOptions(list: { deviceId: string; label: string }[]) {
  return _.map(list, d => ({ value: d.deviceId, label: d.label }));
}

onMounted(async () => {
  autoLaunch.value = await window.api.getAutoLaunch();
  const audioDevices = await enumerateDevices();
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

  await config.load();

});

// Auto-save config on changes
watch(
  () => ({
    s: config.sendToSpeakers,
    v: config.sendToVirtualMic,
    sd: config.speakerDeviceId,
    vd: config.virtualMicDeviceId,
    ov: config.outputVolume,
    mv: config.monitorVolume,
    md: config.micDeviceId,
    mcv: config.micVolume,
    emp: config.enableMicPassthrough,
    loc: config.locale,
    sh: config.stopHotkey
  }),
  () => {
    config.save();
  },
  { deep: true }
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
    stopAll();
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
      showConfirm(
        t('confirm.includeBackups.title'),
        t('confirm.includeBackups.message'),
        () => runExport(true),
        () => runExport(false)
      );
      return;
    }
    await runExport(false);
  } catch (err) {
    showToast(t('toast.exportFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

const confirmModal = ref<{ visible: boolean; title: string; message: string }>({
  visible: false, title: '', message: ''
});
let pendingAction: (() => Promise<void>) | null = null;
let pendingCancelAction: (() => Promise<void>) | null = null;

function showConfirm(title: string, message: string, action: () => Promise<void>, cancelAction?: () => Promise<void>) {
  confirmModal.value = { visible: true, title, message };
  pendingAction = action;
  pendingCancelAction = cancelAction ?? null;
}

async function onConfirm() {
  confirmModal.value.visible = false;
  pendingCancelAction = null;
  if (pendingAction) await pendingAction();
  pendingAction = null;
}

async function onCancelConfirm() {
  confirmModal.value.visible = false;
  pendingAction = null;
  if (pendingCancelAction) {
    const action = pendingCancelAction;
    pendingCancelAction = null;
    await action();
  }
}

function onClearLibrary() {
  showConfirm(t('confirm.clearLibrary.title'), t('confirm.clearLibrary.message'), async () => {
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
  showConfirm(t('confirm.resetSettings.title'), t('confirm.resetSettings.message'), async () => {
    await config.resetDefaults();

    const audioDevices = await enumerateDevices();
    devices.value = toDeviceOptions(audioDevices);
    const cableDevice = _.find(audioDevices, d => d.label.toLowerCase().includes(VBCABLE_LABEL_KEYWORD));
    if (cableDevice && !config.virtualMicDeviceId) {
      config.virtualMicDeviceId = cableDevice.deviceId;
      await config.save();
    }

    const micDevices = await enumerateInputDevices();
    inputDevices.value = toDeviceOptions(micDevices);

    showToast(t('toast.resetDone'), ToastType.SUCCESS);
  });
}

async function onToggleAutoLaunch(value: boolean) {
  await window.api.setAutoLaunch(value);
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
      <div class="hotkey-row">
        <div class="hotkey-label">
          <span>{{ t('settingsHotkeys.stopLabel') }}</span>
          <small>{{ t('settingsHotkeys.stopHint') }}</small>
        </div>
        <button class="hotkey-set-btn" :class="{ active: config.stopHotkey }" @click="showStopHotkeyModal = true">
          <AppIcon name="keyboard" :size="12" />
          {{ config.stopHotkey ?? t('settingsHotkeys.none') }}
        </button>
      </div>
      <HotkeyModal
        :visible="showStopHotkeyModal"
        :name="t('settingsHotkeys.stopLabel')"
        :hotkey="config.stopHotkey"
        :used-hotkeys="new Map()"
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
      <div class="startup-row">
        <div class="startup-label">
          <span>{{ t('settings.startup.label') }}</span>
          <small>{{ t('settings.startup.hint') }}</small>
        </div>
        <SwitchToggle :modelValue="autoLaunch" @update:modelValue="onToggleAutoLaunch" />
      </div>
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
      :visible="confirmModal.visible"
      :title="confirmModal.title"
      :message="confirmModal.message"
      @confirm="onConfirm"
      @cancel="onCancelConfirm"
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

.hotkey-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.hotkey-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hotkey-label small {
  color: var(--color-text-dim);
  font-size: 0.78rem;
}

.hotkey-set-btn {
  border: 1px solid #333;
  background: #1a1a1a;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-family: monospace;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: border-color 0.15s, color 0.15s;
}

.hotkey-set-btn:hover {
  border-color: var(--color-text-dimmer);
  color: var(--color-text-white);
}

.hotkey-set-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.startup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.startup-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.startup-label small {
  color: var(--color-text-dim);
  font-size: 0.78rem;
}
</style>
