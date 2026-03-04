<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
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
import { useConfigStore } from '../stores/config';
import { useLibraryStore } from '../stores/library';
import { useAudio } from '../composables/useAudio';
import { useMicMixer } from '../composables/useMicMixer';
import { openExternal } from '../services/api';

const { t } = useI18n();
const config = useConfigStore();
const libraryStore = useLibraryStore();
const { playTest, isTestPlaying, stopAll } = useAudio();

const { isMicActive, micError } = useMicMixer();

const devices = ref<{ value: string; label: string }[]>([]);
const inputDevices = ref<{ value: string; label: string }[]>([]);
const vbcableMissing = ref(false);
const toastMessage = ref('');
const toastType = ref<'' | 'success' | 'error'>('');

const autoLaunch = ref(false);

const { enumerateDevices, enumerateInputDevices } = useAudio();

onMounted(async () => {
  autoLaunch.value = await window.api.getAutoLaunch();
  const audioDevices = await enumerateDevices();
  devices.value = audioDevices.map(d => ({ value: d.deviceId, label: d.label }));

  const cableDevice = audioDevices.find(d => d.label.toLowerCase().includes('cable input'));
  if (cableDevice) {
    if (!config.virtualMicDeviceId) {
      config.virtualMicDeviceId = cableDevice.deviceId;
    }
    vbcableMissing.value = false;
  } else {
    vbcableMissing.value = true;
  }

  const micDevices = await enumerateInputDevices();
  inputDevices.value = micDevices.map(d => ({ value: d.deviceId, label: d.label }));

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
    loc: config.locale
  }),
  () => {
    config.save();
  },
  { deep: true }
);

function showToast(message: string, type: '' | 'success' | 'error' = '') {
  toastMessage.value = '';
  setTimeout(() => {
    toastMessage.value = message;
    toastType.value = type;
  }, 10);
}

async function onPlayTest() {
  if (isTestPlaying.value) {
    stopAll();
    return;
  }
  const result = await playTest();
  showToast(result.message, result.success ? 'success' : 'error');
}

function onVbcableLink() {
  openExternal('https://vb-audio.com/Cable/');
}

async function onExport() {
  try {
    const result = await libraryStore.doExport();
    if (result.canceled) return;
    if (result.success) {
      showToast(t('toast.exported', { count: result.count }), 'success');
    } else {
      showToast(result.error || t('toast.exportFailed'), 'error');
    }
  } catch (err) {
    showToast(t('toast.exportFailed') + ': ' + (err as Error).message, 'error');
  }
}

const confirmModal = ref<{ visible: boolean; title: string; message: string }>({
  visible: false, title: '', message: ''
});
let pendingAction: (() => Promise<void>) | null = null;

function showConfirm(title: string, message: string, action: () => Promise<void>) {
  confirmModal.value = { visible: true, title, message };
  pendingAction = action;
}

async function onConfirm() {
  confirmModal.value.visible = false;
  if (pendingAction) await pendingAction();
  pendingAction = null;
}

function onCancelConfirm() {
  confirmModal.value.visible = false;
  pendingAction = null;
}

function onClearLibrary() {
  showConfirm(t('confirm.clearLibrary.title'), t('confirm.clearLibrary.message'), async () => {
    try {
      const count = libraryStore.items.length;
      await libraryStore.clearAll();
      await libraryStore.load();
      showToast(t('toast.deleted', { count }), 'success');
    } catch (err) {
      showToast(t('toast.clearFailed') + ': ' + (err as Error).message, 'error');
    }
  });
}

function onResetSettings() {
  showConfirm(t('confirm.resetSettings.title'), t('confirm.resetSettings.message'), async () => {
    await config.resetDefaults();

    const audioDevices = await enumerateDevices();
    devices.value = audioDevices.map(d => ({ value: d.deviceId, label: d.label }));
    const cableDevice = audioDevices.find(d => d.label.toLowerCase().includes('cable input'));
    if (cableDevice && !config.virtualMicDeviceId) {
      config.virtualMicDeviceId = cableDevice.deviceId;
      await config.save();
    }

    const micDevices = await enumerateInputDevices();
    inputDevices.value = micDevices.map(d => ({ value: d.deviceId, label: d.label }));

    showToast(t('toast.resetDone'), 'success');
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
      showToast(t('toast.imported', { added: result.added, total: result.total }), 'success');
    } else {
      showToast(result.error || t('toast.importFailed'), 'error');
    }
  } catch (err) {
    showToast(t('toast.importFailed') + ': ' + (err as Error).message, 'error');
  }
}
</script>

<template>
  <div class="page">
    <PageHeader :title="t('settings.title')" :subtitle="t('settings.subtitle')" />

    <div v-if="vbcableMissing" class="vbcable-banner">
      <strong>{{ t('settings.vbcableMissing.title') }}</strong><br>
      {{ t('settings.vbcableMissing.description') }}<br>
      <a href="#" @click.prevent="onVbcableLink">https://vb-audio.com/Cable/</a><br>
      <small>{{ t('settings.vbcableMissing.restart') }}</small>
    </div>

    <SettingSection :title="t('settings.virtualMic.title')" :tooltip="t('settings.virtualMic.tooltip')">
      <VolumeSlider v-model="config.outputVolume" :label="t('common.volume')">
        <template #icon>
          <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
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
      <VolumeSlider v-model="config.monitorVolume" :label="t('common.volume')">
        <template #icon>
          <svg viewBox="0 0 24 24"><path d="M12 1C7.03 1 3 5.03 3 10v6c0 1.66 1.34 3 3 3h1v-7H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-2v7h1c1.66 0 3-1.34 3-3v-6c0-4.97-4.03-9-9-9zM7 14v4H6c-.55 0-1-.45-1-1v-3h2zm12 3c0 .55-.45 1-1 1h-1v-4h2v3z"/></svg>
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
      <VolumeSlider v-model="config.micVolume" :label="t('common.volume')">
        <template #icon>
          <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
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
