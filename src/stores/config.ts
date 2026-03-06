import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';
import _ from 'lodash';
import { loadConfig, saveConfig } from '../services/api';
import { CONFIG_DEFAULTS, type ConfigKey } from '../enums/config-defaults';
import { StoreName } from '../enums/stores';

export const useConfigStore = defineStore(StoreName.CONFIG, () => {
  const sendToSpeakers = ref(CONFIG_DEFAULTS.sendToSpeakers);
  const sendToVirtualMic = ref(CONFIG_DEFAULTS.sendToVirtualMic);
  const outputVolume = ref(CONFIG_DEFAULTS.outputVolume);
  const monitorVolume = ref(CONFIG_DEFAULTS.monitorVolume);
  const speakerDeviceId = ref<string>(CONFIG_DEFAULTS.speakerDeviceId);
  const virtualMicDeviceId = ref<string>(CONFIG_DEFAULTS.virtualMicDeviceId);
  const micDeviceId = ref<string>(CONFIG_DEFAULTS.micDeviceId);
  const micVolume = ref(CONFIG_DEFAULTS.micVolume);
  const enableMicPassthrough = ref(CONFIG_DEFAULTS.enableMicPassthrough);
  const locale = ref<string>(CONFIG_DEFAULTS.locale);
  const stopHotkey = ref<string | null>(CONFIG_DEFAULTS.stopHotkey);

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
      r.value = CONFIG_DEFAULTS[key as ConfigKey];
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
