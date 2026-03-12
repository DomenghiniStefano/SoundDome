export const DeviceKind = {
  OUTPUT: 'audiooutput',
  INPUT: 'audioinput',
} as const;

export type DeviceKindValue = (typeof DeviceKind)[keyof typeof DeviceKind];
export const deviceKinds = Object.values(DeviceKind);

export const COMMUNICATIONS_DEVICE_ID = 'communications';
export const DEFAULT_DEVICE_ID = 'default';

export const AudioContextState = {
  CLOSED: 'closed',
  SUSPENDED: 'suspended',
  RUNNING: 'running',
} as const;

export type AudioContextStateValue = (typeof AudioContextState)[keyof typeof AudioContextState];
export const audioContextStates = Object.values(AudioContextState);

export const LatencyHint = {
  INTERACTIVE: 'interactive',
  BALANCED: 'balanced',
  PLAYBACK: 'playback',
} as const;

export type LatencyHintValue = (typeof LatencyHint)[keyof typeof LatencyHint];
export const latencyHints = Object.values(LatencyHint);

export const CompressorPreset = {
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
} as const;

export type CompressorPresetValue = (typeof CompressorPreset)[keyof typeof CompressorPreset];
export const compressorPresets = Object.values(CompressorPreset);
