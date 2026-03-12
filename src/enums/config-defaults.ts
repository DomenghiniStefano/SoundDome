import {
  VOLUME_SOUNDBOARD_DEFAULT,
  VOLUME_MONITOR_DEFAULT,
  VOLUME_MIC_DEFAULT,
} from './constants';
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
  enableMicPassthrough: true,
  enableMicMonitor: false,
  locale: 'en',
  stopHotkey: null as string | null,
  libraryViewMode: LibraryViewMode.MEDIUM as string,
  libraryHideNames: false,
  widgetViewMode: LibraryViewMode.MEDIUM as string,
  widgetHideNames: false,
  enableCompressor: true,
  theme: Theme.DARK as string,
  customThemes: [] as CustomThemeData[],
} as const;

export type ConfigKey = keyof typeof CONFIG_DEFAULTS;
