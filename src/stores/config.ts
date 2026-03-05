import { defineStore } from 'pinia';
import { ref } from 'vue';
import { loadConfig, saveConfig } from '../services/api';

export const useConfigStore = defineStore('config', () => {
  const sendToSpeakers = ref(true);
  const sendToVirtualMic = ref(false);
  const outputVolume = ref(80);
  const monitorVolume = ref(50);
  const speakerDeviceId = ref('');
  const virtualMicDeviceId = ref('');
  const micDeviceId = ref('');
  const micVolume = ref(80);
  const enableMicPassthrough = ref(true);
  const locale = ref('en');
  const stopHotkey = ref<string | null>(null);

  async function load() {
    const c = await loadConfig();
    if (c.sendToSpeakers !== undefined) sendToSpeakers.value = c.sendToSpeakers;
    if (c.sendToVirtualMic !== undefined) sendToVirtualMic.value = c.sendToVirtualMic;
    if (c.outputVolume !== undefined) outputVolume.value = c.outputVolume;
    if (c.monitorVolume !== undefined) monitorVolume.value = c.monitorVolume;
    if (c.speakerDeviceId !== undefined) speakerDeviceId.value = c.speakerDeviceId;
    if (c.virtualMicDeviceId !== undefined) virtualMicDeviceId.value = c.virtualMicDeviceId;
    if (c.micDeviceId !== undefined) micDeviceId.value = c.micDeviceId;
    if (c.micVolume !== undefined) micVolume.value = c.micVolume;
    if (c.enableMicPassthrough !== undefined) enableMicPassthrough.value = c.enableMicPassthrough;
    if (c.locale !== undefined) locale.value = c.locale;
    if (c.stopHotkey !== undefined) stopHotkey.value = c.stopHotkey;
  }

  async function save() {
    await saveConfig({
      sendToSpeakers: sendToSpeakers.value,
      sendToVirtualMic: sendToVirtualMic.value,
      speakerDeviceId: speakerDeviceId.value,
      virtualMicDeviceId: virtualMicDeviceId.value,
      outputVolume: outputVolume.value,
      monitorVolume: monitorVolume.value,
      micDeviceId: micDeviceId.value,
      micVolume: micVolume.value,
      enableMicPassthrough: enableMicPassthrough.value,
      locale: locale.value,
      stopHotkey: stopHotkey.value
    });
  }

  async function resetDefaults() {
    sendToSpeakers.value = true;
    sendToVirtualMic.value = false;
    outputVolume.value = 80;
    monitorVolume.value = 50;
    speakerDeviceId.value = '';
    virtualMicDeviceId.value = '';
    micDeviceId.value = '';
    micVolume.value = 80;
    enableMicPassthrough.value = true;
    locale.value = 'en';
    stopHotkey.value = null;
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
