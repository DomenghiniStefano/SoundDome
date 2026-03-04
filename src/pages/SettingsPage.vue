<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import PageHeader from '../components/PageHeader.vue';
import SettingSection from '../components/SettingSection.vue';
import SettingActionRow from '../components/SettingActionRow.vue';
import SwitchToggle from '../components/SwitchToggle.vue';
import VolumeSlider from '../components/VolumeSlider.vue';
import DeviceSelect from '../components/DeviceSelect.vue';
import PlayButton from '../components/PlayButton.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import ToastNotification from '../components/ToastNotification.vue';
import { useConfigStore } from '../stores/config';
import { useLibraryStore } from '../stores/library';
import { useAudio } from '../composables/useAudio';
import { useMicMixer } from '../composables/useMicMixer';
import { openExternal } from '../services/api';

const config = useConfigStore();
const libraryStore = useLibraryStore();
const { playTest, isTestPlaying } = useAudio();

const { isMicActive, micError } = useMicMixer();

const devices = ref<{ value: string; label: string }[]>([]);
const inputDevices = ref<{ value: string; label: string }[]>([]);
const vbcableMissing = ref(false);
const toastMessage = ref('');
const toastType = ref<'' | 'success' | 'error'>('');

const { enumerateDevices, enumerateInputDevices } = useAudio();

onMounted(async () => {
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
    emp: config.enableMicPassthrough
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
      showToast(`Exported ${result.count} sounds`, 'success');
    } else {
      showToast(result.error || 'Export failed', 'error');
    }
  } catch (err) {
    showToast('Export failed: ' + (err as Error).message, 'error');
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
  showConfirm('Clear Library', 'All sounds will be permanently deleted. Continue?', async () => {
    try {
      const count = libraryStore.items.length;
      await libraryStore.clearAll();
      await libraryStore.load();
      showToast(`Deleted ${count} sounds`, 'success');
    } catch (err) {
      showToast('Clear failed: ' + (err as Error).message, 'error');
    }
  });
}

function onResetSettings() {
  showConfirm('Reset Settings', 'Restore all settings to defaults? The library will not be affected.', async () => {
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

    showToast('Settings reset to defaults', 'success');
  });
}

async function onImport() {
  try {
    const result = await libraryStore.doImport();
    if (result.canceled) return;
    if (result.success) {
      showToast(`Imported ${result.added} new sounds (${result.total} total)`, 'success');
    } else {
      showToast(result.error || 'Import failed', 'error');
    }
  } catch (err) {
    showToast('Import failed: ' + (err as Error).message, 'error');
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="Settings" subtitle="Audio routing and device configuration" />

    <div v-if="vbcableMissing" class="vbcable-banner">
      <strong>VB-CABLE non rilevato!</strong><br>
      Per usare il Virtual Mic, installa VB-CABLE:<br>
      <a href="#" @click.prevent="onVbcableLink">https://vb-audio.com/Cable/</a><br>
      <small>Dopo l'installazione, riavvia l'app.</small>
    </div>

    <SettingSection title="Virtual Mic (VB-CABLE)" tooltip="Audio sent to VB-CABLE, which Discord/Zoom picks up as your microphone input">
      <VolumeSlider v-model="config.outputVolume" label="Volume">
        <template #icon>
          <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </template>
        <template #prefix>
          <SwitchToggle v-model="config.sendToVirtualMic" small />
        </template>
      </VolumeSlider>
      <DeviceSelect
        v-model="config.virtualMicDeviceId"
        label="Device"
        :options="devices"
      />
    </SettingSection>

    <SettingSection title="Speakers" tooltip="Audio you hear locally through your speakers or headphones">
      <VolumeSlider v-model="config.monitorVolume" label="Volume">
        <template #icon>
          <svg viewBox="0 0 24 24"><path d="M12 1C7.03 1 3 5.03 3 10v6c0 1.66 1.34 3 3 3h1v-7H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-2v7h1c1.66 0 3-1.34 3-3v-6c0-4.97-4.03-9-9-9zM7 14v4H6c-.55 0-1-.45-1-1v-3h2zm12 3c0 .55-.45 1-1 1h-1v-4h2v3z"/></svg>
        </template>
        <template #prefix>
          <SwitchToggle v-model="config.sendToSpeakers" small />
        </template>
      </VolumeSlider>
      <DeviceSelect
        v-model="config.speakerDeviceId"
        label="Device"
        :options="devices"
      />
    </SettingSection>

    <SettingSection title="Microphone" tooltip="Your real microphone mixed with soundboard audio on VB-CABLE, so others hear your voice + sounds">
      <VolumeSlider v-model="config.micVolume" label="Volume">
        <template #icon>
          <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </template>
        <template #prefix>
          <SwitchToggle v-model="config.enableMicPassthrough" small />
        </template>
      </VolumeSlider>
      <DeviceSelect
        v-model="config.micDeviceId"
        label="Device"
        :options="inputDevices"
      />
      <div v-if="micError" class="mic-status error">{{ micError }}</div>
    </SettingSection>

    <SettingSection title="Test Audio" tooltip="Play a test sound to verify your output configuration">
      <div class="play-section">
        <PlayButton :playing="isTestPlaying" @click="onPlayTest" />
      </div>
    </SettingSection>

    <SettingSection title="Library" tooltip="Export, import or clear your saved sound collection">
      <SettingActionRow
        label="Export Library"
        hint="Save all sounds to a .sounddome file"
        action-label="Export"
        @action="onExport"
      />
      <SettingActionRow
        label="Import Library"
        hint="Load sounds from a .sounddome file"
        action-label="Import"
        @action="onImport"
      />
      <SettingActionRow
        label="Clear Library"
        hint="Delete all sounds from the library"
        action-label="Clear"
        danger
        @action="onClearLibrary"
      />
    </SettingSection>

    <SettingSection title="Reset">
      <SettingActionRow
        label="Reset Settings"
        hint="Restore all settings to defaults (library is kept)"
        action-label="Reset"
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
</style>
