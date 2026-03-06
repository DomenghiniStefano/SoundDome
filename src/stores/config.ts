import {defineStore} from 'pinia';
import {ref, type Ref} from 'vue';
import _ from 'lodash';
import {loadConfig, saveConfig} from '../services/api';
import {VOLUME_MIC_DEFAULT, VOLUME_MONITOR_DEFAULT, VOLUME_OUTPUT_DEFAULT} from '../enums/constants';
import {StoreName} from '../enums/stores';

const DEFAULTS = {
  sendToSpeakers: true,
  sendToVirtualMic: false,
  outputVolume: VOLUME_OUTPUT_DEFAULT,
  monitorVolume: VOLUME_MONITOR_DEFAULT,
  speakerDeviceId: '',
  virtualMicDeviceId: '',
  micDeviceId: '',
  micVolume: VOLUME_MIC_DEFAULT,
  enableMicPassthrough: true,
  locale: 'en',
  stopHotkey: null as string | null,
} as const;

type ConfigKey = keyof typeof DEFAULTS;

export const useConfigStore = defineStore(StoreName.CONFIG, () => {
  const sendToSpeakers = ref(DEFAULTS.sendToSpeakers);
  const sendToVirtualMic = ref(DEFAULTS.sendToVirtualMic);
  const outputVolume = ref(DEFAULTS.outputVolume);
  const monitorVolume = ref(DEFAULTS.monitorVolume);
  const speakerDeviceId = ref<string>(DEFAULTS.speakerDeviceId);
  const virtualMicDeviceId = ref<string>(DEFAULTS.virtualMicDeviceId);
  const micDeviceId = ref<string>(DEFAULTS.micDeviceId);
  const micVolume = ref(DEFAULTS.micVolume);
  const enableMicPassthrough = ref(DEFAULTS.enableMicPassthrough);
  const locale = ref<string>(DEFAULTS.locale);
  const stopHotkey = ref<string | null>(DEFAULTS.stopHotkey);

  const refs: Record<ConfigKey, Ref> = {
    sendToSpeakers, sendToVirtualMic, outputVolume, monitorVolume,
    speakerDeviceId, virtualMicDeviceId, micDeviceId, micVolume,
    enableMicPassthrough, locale, stopHotkey,
  };

  async function load() {
    const c = await loadConfig();
    _.forOwn(refs, (r, key) => {
      const k = key as keyof ConfigData;
      if (c[k] !== undefined) r.value = c[k];
    });
  }

  async function save() {
    await saveConfig(_.mapValues(refs, r => r.value));
  }

  async function resetDefaults() {
    _.forOwn(refs, (r, key) => {
      r.value = DEFAULTS[key as ConfigKey];
    });
    await save();
  }

  return {
    sendToSpeakers,
    sendToVirtualMic,
    outputVolume,
    monitorVolume,
    speakerDeviceId,
    virtualMicDeviceId,
    micDeviceId,
    micVolume,
    enableMicPassthrough,
    locale,
    stopHotkey,
    load,
    save,
    resetDefaults
  };
});
