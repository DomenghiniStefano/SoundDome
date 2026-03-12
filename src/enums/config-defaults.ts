import {
  VOLUME_SOUNDBOARD_DEFAULT,
  VOLUME_MONITOR_DEFAULT,
  VOLUME_MIC_DEFAULT,
} from './constants';
import { CompressorPreset, LatencyHint } from './audio';
import { LibraryViewMode } from './library';
import { Theme } from './settings';

export const CONFIG_DEFAULTS = {
  sendToSpeakers: true,
  sendToVirtualMic: false,
  soundboardVolume: VOLUME_SOUNDBOARD_DEFAULT,
  monitorVolume: VOLUME_MONITOR_DEFAULT,
  speakerDeviceId: '',
  virtualMicDeviceId: '',
  micDeviceId: '',
  micVolume: VOLUME_MIC_DEFAULT,
  enableMicPassthrough: false,
  enableMicMonitor: false,
  locale: 'en',
  stopHotkey: null as string | null,
  libraryViewMode: LibraryViewMode.MEDIUM as string,
  libraryHideNames: false,
  widgetViewMode: LibraryViewMode.MEDIUM as string,
  widgetHideNames: false,
  enableCompressor: false,
  compressorPreset: CompressorPreset.MEDIUM as string,
  enableNoiseSuppression: false,
  latencyHint: LatencyHint.INTERACTIVE as string,
  theme: Theme.DARK as string,
  customThemes: [] as CustomThemeData[],
  speakerDeviceLabel: '',
  virtualMicDeviceLabel: '',
  micDeviceLabel: '',
} as const;

export type ConfigKey = keyof typeof CONFIG_DEFAULTS;
