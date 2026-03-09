import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';
import _ from 'lodash';
import { loadConfig, saveConfig, onConfigChanged, removeConfigChangedListener } from '../services/api';
import { CONFIG_DEFAULTS, type ConfigKey } from '../enums/config-defaults';
import { StoreName } from '../enums/stores';

export const useConfigStore = defineStore(StoreName.CONFIG, () => {
  const sendToSpeakers = ref(CONFIG_DEFAULTS.sendToSpeakers);
  const sendToVirtualMic = ref(CONFIG_DEFAULTS.sendToVirtualMic);
  const soundboardVolume = ref(CONFIG_DEFAULTS.soundboardVolume);
  const monitorVolume = ref(CONFIG_DEFAULTS.monitorVolume);
  const speakerDeviceId = ref<string>(CONFIG_DEFAULTS.speakerDeviceId);
  const virtualMicDeviceId = ref<string>(CONFIG_DEFAULTS.virtualMicDeviceId);
  const micDeviceId = ref<string>(CONFIG_DEFAULTS.micDeviceId);
  const micVolume = ref(CONFIG_DEFAULTS.micVolume);
  const enableMicPassthrough = ref(CONFIG_DEFAULTS.enableMicPassthrough);
  const locale = ref<string>(CONFIG_DEFAULTS.locale);
  const stopHotkey = ref<string | null>(CONFIG_DEFAULTS.stopHotkey);
  const libraryViewMode = ref<string>(CONFIG_DEFAULTS.libraryViewMode);
  const libraryHideNames = ref(CONFIG_DEFAULTS.libraryHideNames);
  const widgetViewMode = ref<string>(CONFIG_DEFAULTS.widgetViewMode);
  const widgetHideNames = ref(CONFIG_DEFAULTS.widgetHideNames);
  const enableCompressor = ref(CONFIG_DEFAULTS.enableCompressor);

  const refs: Record<ConfigKey, Ref> = {
    sendToSpeakers, sendToVirtualMic, soundboardVolume, monitorVolume,
    speakerDeviceId, virtualMicDeviceId, micDeviceId, micVolume,
    enableMicPassthrough, locale, stopHotkey,
    libraryViewMode, libraryHideNames, widgetViewMode, widgetHideNames,
    enableCompressor,
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

  function startListening() {
    onConfigChanged(() => load());
  }

  function stopListening() {
    removeConfigChangedListener();
  }

  return {
    sendToSpeakers,
    sendToVirtualMic,
    soundboardVolume,
    monitorVolume,
    speakerDeviceId,
    virtualMicDeviceId,
    micDeviceId,
    micVolume,
    enableMicPassthrough,
    locale,
    stopHotkey,
    libraryViewMode,
    libraryHideNames,
    widgetViewMode,
    widgetHideNames,
    enableCompressor,
    load,
    save,
    resetDefaults,
    startListening,
    stopListening
  };
});
