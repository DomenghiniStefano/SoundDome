import {
  VOLUME_OUTPUT_DEFAULT,
  VOLUME_MONITOR_DEFAULT,
  VOLUME_MIC_DEFAULT,
} from './constants';

export const CONFIG_DEFAULTS = {
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

export type ConfigKey = keyof typeof CONFIG_DEFAULTS;
