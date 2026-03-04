<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import ToggleSwitch from '../components/ToggleSwitch.vue';
import VolumeSlider from '../components/VolumeSlider.vue';
import DeviceSelect from '../components/DeviceSelect.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
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
const status = ref('');
const statusType = ref<'' | 'success' | 'error'>('');
const libraryStatus = ref('');
const libraryStatusType = ref<'' | 'success' | 'error'>('');

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

  status.value = `${audioDevices.length} audio output devices found`;
  statusType.value = 'success';
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

async function onPlayTest() {
  const result = await playTest();
  status.value = result.message;
  statusType.value = result.success ? 'success' : 'error';
  if (result.success) {
    // Status will reset after audio ends (handled in useAudio)
  }
}

function onVbcableLink() {
  openExternal('https://vb-audio.com/Cable/');
}

async function onExport() {
  libraryStatus.value = 'Exporting...';
  libraryStatusType.value = '';
  try {
    const result = await libraryStore.doExport();
    if (result.canceled) {
      libraryStatus.value = '';
    } else if (result.success) {
      libraryStatus.value = `Exported ${result.count} sounds`;
      libraryStatusType.value = 'success';
    } else {
      libraryStatus.value = result.error || 'Export failed';
      libraryStatusType.value = 'error';
    }
  } catch (err) {
    libraryStatus.value = 'Export failed: ' + (err as Error).message;
    libraryStatusType.value = 'error';
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
    libraryStatus.value = 'Clearing...';
    libraryStatusType.value = '';
    try {
      const count = libraryStore.items.length;
      await libraryStore.clearAll();
      await libraryStore.load();
      libraryStatus.value = `Deleted ${count} sounds`;
      libraryStatusType.value = 'success';
    } catch (err) {
      libraryStatus.value = 'Clear failed: ' + (err as Error).message;
      libraryStatusType.value = 'error';
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

    status.value = 'Settings reset to defaults';
    statusType.value = 'success';
  });
}

async function onImport() {
  libraryStatus.value = 'Importing...';
  libraryStatusType.value = '';
  try {
    const result = await libraryStore.doImport();
    if (result.canceled) {
      libraryStatus.value = '';
    } else if (result.success) {
      libraryStatus.value = `Imported ${result.added} new sounds (${result.total} total)`;
      libraryStatusType.value = 'success';
    } else {
      libraryStatus.value = result.error || 'Import failed';
      libraryStatusType.value = 'error';
    }
  } catch (err) {
    libraryStatus.value = 'Import failed: ' + (err as Error).message;
    libraryStatusType.value = 'error';
  }
}
</script>

<template>
  <div class="page">
    <h2 class="page-title">Settings</h2>
    <p class="page-subtitle">Audio routing and device configuration</p>

    <div v-if="vbcableMissing" class="vbcable-banner">
      <strong>VB-CABLE non rilevato!</strong><br>
      Per usare il Virtual Mic, installa VB-CABLE:<br>
      <a href="#" @click.prevent="onVbcableLink">https://vb-audio.com/Cable/</a><br>
      <small>Dopo l'installazione, riavvia l'app.</small>
    </div>

    <!-- Output -->
    <div class="section">
      <div class="section-title">Output</div>
      <ToggleSwitch
        v-model="config.sendToSpeakers"
        label="Speakers"
        hint="Send audio to speaker output"
      />
      <ToggleSwitch
        v-model="config.sendToVirtualMic"
        label="Virtual Mic (VB-CABLE)"
        hint="Route audio to virtual microphone"
      />
    </div>

    <!-- Volume -->
    <div class="section">
      <div class="section-title">Volume</div>
      <VolumeSlider v-model="config.outputVolume" label="Output">
        <template #icon>
          <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </template>
      </VolumeSlider>
      <VolumeSlider v-model="config.monitorVolume" label="Monitor">
        <template #icon>
          <svg viewBox="0 0 24 24"><path d="M12 1C7.03 1 3 5.03 3 10v6c0 1.66 1.34 3 3 3h1v-7H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-2v7h1c1.66 0 3-1.34 3-3v-6c0-4.97-4.03-9-9-9zM7 14v4H6c-.55 0-1-.45-1-1v-3h2zm12 3c0 .55-.45 1-1 1h-1v-4h2v3z"/></svg>
        </template>
      </VolumeSlider>
    </div>

    <!-- Devices -->
    <div class="section">
      <div class="section-title">Devices</div>
      <DeviceSelect
        v-model="config.speakerDeviceId"
        label="Speaker Device"
        :options="devices"
      />
      <DeviceSelect
        v-model="config.virtualMicDeviceId"
        label="Virtual Mic Device"
        :options="devices"
      />
    </div>

    <!-- Microphone -->
    <div class="section">
      <div class="section-title">Microphone</div>
      <ToggleSwitch
        v-model="config.enableMicPassthrough"
        label="Mic Passthrough"
        hint="Mix your microphone with soundboard audio on VB-CABLE"
      />
      <DeviceSelect
        v-model="config.micDeviceId"
        label="Microphone Device"
        :options="inputDevices"
      />
      <VolumeSlider v-model="config.micVolume" label="Mic Volume">
        <template #icon>
          <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </template>
      </VolumeSlider>
      <div v-if="isMicActive" class="mic-status active">Microphone active</div>
      <div v-if="micError" class="mic-status error">{{ micError }}</div>
    </div>

    <!-- Test -->
    <div class="section">
      <div class="section-title">Test</div>
      <div class="play-section">
        <button class="play-btn" :class="{ playing: isTestPlaying }" @click="onPlayTest">
          <div class="play-icon"></div>
        </button>
        <div class="status" :class="statusType">{{ status }}</div>
      </div>
    </div>

    <!-- Library -->
    <div class="section">
      <div class="section-title">Library</div>
      <div class="setting-row">
        <div>
          <label>Export Library</label>
          <div class="hint">Save all sounds to a .sounddome file</div>
        </div>
        <button class="action-btn" @click="onExport">Export</button>
      </div>
      <div class="setting-row">
        <div>
          <label>Import Library</label>
          <div class="hint">Load sounds from a .sounddome file</div>
        </div>
        <button class="action-btn" @click="onImport">Import</button>
      </div>
      <div class="setting-row">
        <div>
          <label>Clear Library</label>
          <div class="hint">Delete all sounds from the library</div>
        </div>
        <button class="action-btn danger" @click="onClearLibrary">Clear</button>
      </div>
      <div class="library-status" :class="libraryStatusType">{{ libraryStatus }}</div>
    </div>

    <!-- Reset -->
    <div class="section">
      <div class="section-title">Reset</div>
      <div class="setting-row">
        <div>
          <label>Reset Settings</label>
          <div class="hint">Restore all settings to defaults (library is kept)</div>
        </div>
        <button class="action-btn danger" @click="onResetSettings">Reset</button>
      </div>
    </div>
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

.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--color-text-white);
}

.page-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  margin-bottom: 32px;
}

.section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--color-text-dim);
  margin-bottom: 12px;
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

.play-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: none;
  background: var(--color-accent);
  color: #000;
  font-size: 1.8rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(29, 185, 84, 0.3);
}

.play-btn:hover {
  transform: scale(1.06);
  background: var(--color-accent-hover);
  box-shadow: 0 6px 28px rgba(29, 185, 84, 0.45);
}

.play-btn:active {
  transform: scale(0.96);
}

.play-btn.playing {
  background: var(--color-accent-hover);
  animation: glow 1s ease-in-out infinite alternate;
}

@keyframes glow {
  from { box-shadow: 0 4px 20px rgba(29, 185, 84, 0.3); }
  to { box-shadow: 0 4px 32px rgba(29, 185, 84, 0.6); }
}

.play-icon {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 12px 0 12px 22px;
  border-color: transparent transparent transparent #000;
  margin-left: 4px;
}

.status {
  margin-top: 14px;
  font-size: 0.8rem;
  color: var(--color-text-dim);
  min-height: 20px;
}

.status.error {
  color: var(--color-error);
}

.status.success {
  color: var(--color-accent);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-bg-card);
  padding: 14px 18px;
  border-radius: var(--input-radius);
  margin-bottom: 6px;
}

.setting-row label {
  font-size: 0.9rem;
  font-weight: 500;
}

.hint {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin-top: 2px;
}

.action-btn {
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

.action-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.action-btn:active {
  transform: scale(0.97);
}

.action-btn.danger {
  border-color: var(--color-error);
  color: var(--color-error);
}

.action-btn.danger:hover {
  background: var(--color-error);
  color: #fff;
}

.library-status {
  font-size: 0.8rem;
  color: var(--color-text-dim);
  min-height: 18px;
  margin-top: 8px;
}

.library-status.success { color: var(--color-accent); }
.library-status.error { color: var(--color-error); }

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
