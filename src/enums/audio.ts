export const DeviceKind = {
  OUTPUT: 'audiooutput',
  INPUT: 'audioinput',
} as const;

export type DeviceKindValue = (typeof DeviceKind)[keyof typeof DeviceKind];
export const deviceKinds = Object.values(DeviceKind);

export const AudioContextState = {
  CLOSED: 'closed',
  SUSPENDED: 'suspended',
  RUNNING: 'running',
} as const;

export type AudioContextStateValue = (typeof AudioContextState)[keyof typeof AudioContextState];
export const audioContextStates = Object.values(AudioContextState);
