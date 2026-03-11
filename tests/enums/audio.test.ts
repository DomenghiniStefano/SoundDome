import { describe, it, expect } from 'vitest';
import { DeviceKind, deviceKinds, AudioContextState, audioContextStates } from '../../src/enums/audio';

describe('DeviceKind', () => {
  it('OUTPUT matches Web Audio API string', () => {
    expect(DeviceKind.OUTPUT).toBe('audiooutput');
  });

  it('INPUT matches Web Audio API string', () => {
    expect(DeviceKind.INPUT).toBe('audioinput');
  });
});

describe('deviceKinds array', () => {
  it('contains all DeviceKind values', () => {
    expect(deviceKinds).toContain(DeviceKind.OUTPUT);
    expect(deviceKinds).toContain(DeviceKind.INPUT);
  });

  it('has exactly 2 entries', () => {
    expect(deviceKinds).toHaveLength(2);
  });
});

describe('AudioContextState', () => {
  it('CLOSED matches Web Audio API state', () => {
    expect(AudioContextState.CLOSED).toBe('closed');
  });

  it('SUSPENDED matches Web Audio API state', () => {
    expect(AudioContextState.SUSPENDED).toBe('suspended');
  });

  it('RUNNING matches Web Audio API state', () => {
    expect(AudioContextState.RUNNING).toBe('running');
  });
});

describe('audioContextStates array', () => {
  it('contains all AudioContextState values', () => {
    expect(audioContextStates).toContain(AudioContextState.CLOSED);
    expect(audioContextStates).toContain(AudioContextState.SUSPENDED);
    expect(audioContextStates).toContain(AudioContextState.RUNNING);
  });

  it('has exactly 3 entries', () => {
    expect(audioContextStates).toHaveLength(3);
  });
});
