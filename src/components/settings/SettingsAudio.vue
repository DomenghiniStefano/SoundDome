<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import SettingSection from './SettingSection.vue';
import SettingRow from './SettingRow.vue';
import SwitchToggle from '../ui/SwitchToggle.vue';
import VolumeSlider from './VolumeSlider.vue';
import DeviceSelect from './DeviceSelect.vue';
import PlayButton from '../ui/PlayButton.vue';
import AppIcon from '../ui/AppIcon.vue';
import { useConfigStore } from '../../stores/config';
import { useAudio } from '../../composables/useAudio';
import { useDevices, isVirtualAudioDevice, resolveDeviceId } from '../../composables/useDevices';
import { useMicMixer } from '../../composables/useMicMixer';
import { useConfirmDialog } from '../../composables/useConfirmDialog';
import ConfirmModal from '../ui/ConfirmModal.vue';
import ToastNotification from '../ui/ToastNotification.vue';
import { ToastType } from '../../enums/ui';
import type { ToastTypeValue } from '../../enums/ui';
import { TOAST_RESET_DELAY } from '../../enums/constants';
import { LatencyHint } from '../../enums/audio';

const { t } = useI18n();
const config = useConfigStore();
const { playTest, isTestPlaying, stopTest } = useAudio();
const { isMicActive, micError, getAudioContext } = useMicMixer();
const { enumerateOutputDevices, enumerateInputDevices } = useDevices();
const confirmDialog = useConfirmDialog();

const devices = ref<{ value: string; label: string }[]>([]);
const inputDevices = ref<{ value: string; label: string }[]>([]);
const virtualMicMissing = ref(false);
const toastMessage = ref('');
const toastType = ref<ToastTypeValue>(ToastType.INFO);

const latencyMs = computed(() => {
  const ctx = getAudioContext();
  if (!ctx) return null;
  return Math.round(ctx.baseLatency * 1000);
});

function toDeviceOptions(list: { deviceId: string; label: string }[]) {
  return _.map(list, d => ({ value: d.deviceId, label: d.label }));
}

async function loadDevicesAndDetectVirtualMic() {
  const audioDevices = await enumerateOutputDevices();
  devices.value = toDeviceOptions(audioDevices);

  // Resolve stale speaker device ID by label, or reset to Default
  if (config.speakerDeviceId) {
    const resolved = resolveDeviceId(audioDevices, config.speakerDeviceId, config.speakerDeviceLabel);
    if (resolved) {
      if (resolved.deviceId !== config.speakerDeviceId) config.speakerDeviceId = resolved.deviceId;
      if (resolved.label !== config.speakerDeviceLabel) config.speakerDeviceLabel = resolved.label;
    } else {
      config.speakerDeviceId = '';
      config.speakerDeviceLabel = '';
    }
  }

  // Resolve stale virtual mic device ID by label, or reset to Default
  if (config.virtualMicDeviceId) {
    const resolved = resolveDeviceId(audioDevices, config.virtualMicDeviceId, config.virtualMicDeviceLabel);
    if (resolved) {
      if (resolved.deviceId !== config.virtualMicDeviceId) config.virtualMicDeviceId = resolved.deviceId;
      if (resolved.label !== config.virtualMicDeviceLabel) config.virtualMicDeviceLabel = resolved.label;
    } else {
      config.virtualMicDeviceId = '';
      config.virtualMicDeviceLabel = '';
    }
  }

  const virtualMicDevice = _.find(audioDevices, d => isVirtualAudioDevice(d.label));
  if (virtualMicDevice) {
    if (!config.virtualMicDeviceId) {
      config.virtualMicDeviceId = virtualMicDevice.deviceId;
      config.virtualMicDeviceLabel = virtualMicDevice.label;
    }
    virtualMicMissing.value = false;
  } else {
    virtualMicMissing.value = true;
  }

  const micDevices = await enumerateInputDevices();
  inputDevices.value = toDeviceOptions(micDevices);

  // Resolve stale mic device ID by label, or reset to Default
  if (config.micDeviceId) {
    const resolved = resolveDeviceId(micDevices, config.micDeviceId, config.micDeviceLabel);
    if (resolved) {
      if (resolved.deviceId !== config.micDeviceId) config.micDeviceId = resolved.deviceId;
      if (resolved.label !== config.micDeviceLabel) config.micDeviceLabel = resolved.label;
    } else {
      config.micDeviceId = '';
      config.micDeviceLabel = '';
    }
  }
}

function syncDeviceLabel(
  deviceId: string,
  deviceList: { value: string; label: string }[],
  setLabel: (label: string) => void
) {
  if (!deviceId) {
    setLabel('');
    return;
  }
  const device = _.find(deviceList, { value: deviceId });
  if (device) setLabel(device.label);
}

watch(() => config.speakerDeviceId, (id) => {
  syncDeviceLabel(id, devices.value, l => { config.speakerDeviceLabel = l; });
});

watch(() => config.virtualMicDeviceId, (id) => {
  syncDeviceLabel(id, devices.value, l => { config.virtualMicDeviceLabel = l; });
});

watch(() => config.micDeviceId, (id) => {
  syncDeviceLabel(id, inputDevices.value, l => { config.micDeviceLabel = l; });
});

function showToast(message: string, type: ToastTypeValue = ToastType.INFO) {
  toastMessage.value = '';
  setTimeout(() => {
    toastMessage.value = message;
    toastType.value = type;
  }, TOAST_RESET_DELAY);
}

function onToggleMicPassthrough(value: boolean) {
  if (!value) {
    confirmDialog.show(t('confirm.disableMic.title'), t('confirm.disableMic.message'), () => {
      config.enableMicPassthrough = false;
    });
  } else {
    config.enableMicPassthrough = true;
  }
}

async function onPlayTest() {
  if (isTestPlaying.value) {
    stopTest();
    return;
  }
  const result = await playTest();
  showToast(result.message, result.success ? ToastType.SUCCESS : ToastType.ERROR);
}

defineExpose({ loadDevicesAndDetectVirtualMic });

onMounted(async () => {
  await loadDevicesAndDetectVirtualMic();
});
</script>

<template>
  <div v-if="virtualMicMissing" class="virtual-mic-banner">
    <strong>{{ t('settings.virtualMicMissing.title') }}</strong><br>
    {{ t('settings.virtualMicMissing.description') }}
  </div>

  <!-- Output -->
  <SettingSection :title="t('settings.output.title')" :tooltip="t('settings.output.tooltip')">
    <div class="subsection-label">{{ t('settings.virtualMic.title') }}</div>
    <VolumeSlider v-model="config.soundboardVolume" :label="t('common.volume')" :disabled="!config.sendToVirtualMic">
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
        <SwitchToggle :modelValue="config.enableMicPassthrough" @update:modelValue="onToggleMicPassthrough" small />
      </template>
    </VolumeSlider>
    <DeviceSelect
      v-model="config.micDeviceId"
      :label="t('common.device')"
      :options="inputDevices"
      :disabled="!config.enableMicPassthrough"

    />
    <SettingRow :label="t('settings.input.micMonitor')" :hint="t('settings.input.micMonitorDesc')">
      <SwitchToggle v-model="config.enableMicMonitor" :disabled="!config.enableMicPassthrough" />
    </SettingRow>
    <div v-if="micError" class="mic-status error">{{ micError }}</div>
  </SettingSection>

  <!-- Test -->
  <SettingSection :title="t('settings.testAudio.title')" :tooltip="t('settings.testAudio.tooltip')">
    <div class="play-section">
      <PlayButton :playing="isTestPlaying" @click="onPlayTest" />
    </div>
  </SettingSection>

  <!-- Audio Processing -->
  <SettingSection :title="t('settings.compressor.title')" :tooltip="t('settings.compressor.tooltip')">
    <SettingRow :label="t('settings.compressor.label')" :hint="t('settings.compressor.hint')">
      <SwitchToggle v-model="config.enableCompressor" />
    </SettingRow>
    <SettingRow :label="t('settings.latency.label')" :hint="latencyMs !== null ? t('settings.latency.value', { ms: latencyMs }) : ''">
      <div class="latency-hint-group" :title="t('settings.latency.tooltip')">
        <button
          class="latency-btn"
          :class="{ active: config.latencyHint === LatencyHint.INTERACTIVE }"
          @click="config.latencyHint = LatencyHint.INTERACTIVE"
        >{{ t('settings.latency.hint') }}</button>
        <button
          class="latency-btn"
          :class="{ active: config.latencyHint === LatencyHint.BALANCED }"
          @click="config.latencyHint = LatencyHint.BALANCED"
        >{{ t('settings.latency.hintBalanced') }}</button>
        <button
          class="latency-btn"
          :class="{ active: config.latencyHint === LatencyHint.PLAYBACK }"
          @click="config.latencyHint = LatencyHint.PLAYBACK"
        >{{ t('settings.latency.hintPlayback') }}</button>
      </div>
    </SettingRow>
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
</template>

<style scoped>
.virtual-mic-banner {
  background: var(--color-warning-subtle);
  border: 1px solid var(--color-warning);
  border-radius: var(--input-radius);
  padding: 14px 18px;
  margin-bottom: 20px;
  font-size: 0.85rem;
  line-height: 1.6;
}

.virtual-mic-banner strong {
  color: var(--color-warning);
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
  color: var(--text-tertiary);
}

.mic-status.error {
  color: var(--color-error);
}

.subsection-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.subsection-label.mt {
  margin-top: 16px;
}

.latency-hint-group {
  display: flex;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  overflow: hidden;
}

.latency-btn {
  padding: 5px 12px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: var(--font-family);
  border: none;
  background: var(--bg-input);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-transform: capitalize;
}

.latency-btn:not(:last-child) {
  border-right: 1px solid var(--border-default);
}

.latency-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.latency-btn.active {
  background: var(--accent-subtle);
  color: var(--accent);
}
</style>
