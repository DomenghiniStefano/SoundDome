import { describe, it, expect } from 'vitest';
import { isVirtualAudioDevice, resolveDeviceId } from '../../src/composables/useDevices';

describe('isVirtualAudioDevice', () => {
  describe('VB-CABLE detection', () => {
    it('detects "CABLE Input (VB-Audio Virtual Cable)"', () => {
      expect(isVirtualAudioDevice('CABLE Input (VB-Audio Virtual Cable)')).toBe(true);
    });

    it('detects lowercase "cable input"', () => {
      expect(isVirtualAudioDevice('cable input')).toBe(true);
    });

    it('detects mixed case "Cable Input"', () => {
      expect(isVirtualAudioDevice('Cable Input')).toBe(true);
    });
  });

  describe('Virtual Audio Driver detection', () => {
    it('detects "Virtual Audio Driver by MTT"', () => {
      expect(isVirtualAudioDevice('Virtual Audio Driver by MTT')).toBe(true);
    });

    it('detects lowercase variant', () => {
      expect(isVirtualAudioDevice('virtual audio driver by mtt')).toBe(true);
    });

    it('detects when embedded in a longer label', () => {
      expect(isVirtualAudioDevice('Speakers (Virtual Audio Driver by MTT)')).toBe(true);
    });
  });

  describe('non-virtual devices', () => {
    it('rejects regular speakers', () => {
      expect(isVirtualAudioDevice('Speakers (Realtek High Definition Audio)')).toBe(false);
    });

    it('rejects regular headphones', () => {
      expect(isVirtualAudioDevice('Headphones (USB Audio Device)')).toBe(false);
    });

    it('rejects Bluetooth devices', () => {
      expect(isVirtualAudioDevice('WH-1000XM4 (Bluetooth)')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isVirtualAudioDevice('')).toBe(false);
    });

    it('rejects partial keyword "cable" without "input"', () => {
      expect(isVirtualAudioDevice('USB Cable Adapter')).toBe(false);
    });

    it('rejects "virtual" without the full driver name', () => {
      expect(isVirtualAudioDevice('Virtual Surround Sound')).toBe(false);
    });
  });
});

describe('resolveDeviceId', () => {
  const devices = [
    { deviceId: 'abc123', label: 'Speakers (Realtek)' },
    { deviceId: 'def456', label: 'Logi Zone Vibe 125' },
    { deviceId: 'ghi789', label: 'Headphones (USB)' },
  ];

  it('returns device when ID matches', () => {
    const result = resolveDeviceId(devices, 'def456', 'Logi Zone Vibe 125');
    expect(result).toEqual({ deviceId: 'def456', label: 'Logi Zone Vibe 125' });
  });

  it('returns device by label when ID is stale', () => {
    const result = resolveDeviceId(devices, 'old-stale-id', 'Logi Zone Vibe 125');
    expect(result).toEqual({ deviceId: 'def456', label: 'Logi Zone Vibe 125' });
  });

  it('returns null when neither ID nor label matches', () => {
    const result = resolveDeviceId(devices, 'old-stale-id', 'Unknown Device');
    expect(result).toBeNull();
  });

  it('returns null when both savedId and savedLabel are empty', () => {
    const result = resolveDeviceId(devices, '', '');
    expect(result).toBeNull();
  });

  it('prefers ID match over label match', () => {
    const result = resolveDeviceId(devices, 'abc123', 'Logi Zone Vibe 125');
    expect(result).toEqual({ deviceId: 'abc123', label: 'Speakers (Realtek)' });
  });

  it('returns device by label when ID is empty but label is set', () => {
    const result = resolveDeviceId(devices, '', 'Headphones (USB)');
    expect(result).toEqual({ deviceId: 'ghi789', label: 'Headphones (USB)' });
  });

  it('returns null when device list is empty', () => {
    const result = resolveDeviceId([], 'abc123', 'Some Device');
    expect(result).toBeNull();
  });

  it('returns null when savedLabel is empty and ID does not match', () => {
    const result = resolveDeviceId(devices, 'old-stale-id', '');
    expect(result).toBeNull();
  });
});
