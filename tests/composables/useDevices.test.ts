import { describe, it, expect } from 'vitest';
import { isVirtualAudioDevice } from '../../src/composables/useDevices';

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
