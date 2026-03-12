import { describe, it, expect } from 'vitest';
import { CONFIG_DEFAULTS } from '../../src/enums/config-defaults';
import {
  VOLUME_SOUNDBOARD_DEFAULT,
  VOLUME_MONITOR_DEFAULT,
  VOLUME_MIC_DEFAULT,
} from '../../src/enums/constants';

describe('CONFIG_DEFAULTS', () => {
  describe('audio routing', () => {
    it('sendToSpeakers defaults to true', () => {
      expect(CONFIG_DEFAULTS.sendToSpeakers).toBe(true);
    });

    it('sendToVirtualMic defaults to false', () => {
      expect(CONFIG_DEFAULTS.sendToVirtualMic).toBe(false);
    });
  });

  describe('volume defaults', () => {
    it('soundboardVolume uses VOLUME_SOUNDBOARD_DEFAULT', () => {
      expect(CONFIG_DEFAULTS.soundboardVolume).toBe(VOLUME_SOUNDBOARD_DEFAULT);
    });

    it('monitorVolume uses VOLUME_MONITOR_DEFAULT', () => {
      expect(CONFIG_DEFAULTS.monitorVolume).toBe(VOLUME_MONITOR_DEFAULT);
    });

    it('micVolume uses VOLUME_MIC_DEFAULT', () => {
      expect(CONFIG_DEFAULTS.micVolume).toBe(VOLUME_MIC_DEFAULT);
    });

    it('all volume defaults are in 0-100 range', () => {
      expect(CONFIG_DEFAULTS.soundboardVolume).toBeGreaterThanOrEqual(0);
      expect(CONFIG_DEFAULTS.soundboardVolume).toBeLessThanOrEqual(100);
      expect(CONFIG_DEFAULTS.monitorVolume).toBeGreaterThanOrEqual(0);
      expect(CONFIG_DEFAULTS.monitorVolume).toBeLessThanOrEqual(100);
      expect(CONFIG_DEFAULTS.micVolume).toBeGreaterThanOrEqual(0);
      expect(CONFIG_DEFAULTS.micVolume).toBeLessThanOrEqual(100);
    });
  });

  describe('device IDs', () => {
    it('speakerDeviceId defaults to empty string', () => {
      expect(CONFIG_DEFAULTS.speakerDeviceId).toBe('');
    });

    it('virtualMicDeviceId defaults to empty string', () => {
      expect(CONFIG_DEFAULTS.virtualMicDeviceId).toBe('');
    });

    it('micDeviceId defaults to empty string', () => {
      expect(CONFIG_DEFAULTS.micDeviceId).toBe('');
    });

    it('speakerDeviceLabel defaults to empty string', () => {
      expect(CONFIG_DEFAULTS.speakerDeviceLabel).toBe('');
    });

    it('virtualMicDeviceLabel defaults to empty string', () => {
      expect(CONFIG_DEFAULTS.virtualMicDeviceLabel).toBe('');
    });

    it('micDeviceLabel defaults to empty string', () => {
      expect(CONFIG_DEFAULTS.micDeviceLabel).toBe('');
    });
  });

  describe('feature toggles', () => {
    it('enableMicPassthrough defaults to false', () => {
      expect(CONFIG_DEFAULTS.enableMicPassthrough).toBe(false);
    });

    it('enableCompressor defaults to true', () => {
      expect(CONFIG_DEFAULTS.enableCompressor).toBe(true);
    });

    it('latencyHint defaults to interactive', () => {
      expect(CONFIG_DEFAULTS.latencyHint).toBe('interactive');
    });
  });

  describe('locale', () => {
    it('defaults to en', () => {
      expect(CONFIG_DEFAULTS.locale).toBe('en');
    });
  });

  describe('hotkey', () => {
    it('stopHotkey defaults to null', () => {
      expect(CONFIG_DEFAULTS.stopHotkey).toBeNull();
    });
  });

  describe('view modes', () => {
    it('libraryHideNames defaults to false', () => {
      expect(CONFIG_DEFAULTS.libraryHideNames).toBe(false);
    });

    it('widgetHideNames defaults to false', () => {
      expect(CONFIG_DEFAULTS.widgetHideNames).toBe(false);
    });

    it('libraryViewMode is a string', () => {
      expect(typeof CONFIG_DEFAULTS.libraryViewMode).toBe('string');
    });

    it('widgetViewMode is a string', () => {
      expect(typeof CONFIG_DEFAULTS.widgetViewMode).toBe('string');
    });
  });

  describe('completeness check', () => {
    it('has all expected keys', () => {
      const expectedKeys = [
        'sendToSpeakers', 'sendToVirtualMic',
        'soundboardVolume', 'monitorVolume', 'micVolume',
        'speakerDeviceId', 'virtualMicDeviceId', 'micDeviceId',
        'enableMicPassthrough', 'enableCompressor', 'latencyHint',
        'locale', 'stopHotkey',
        'libraryViewMode', 'libraryHideNames',
        'widgetViewMode', 'widgetHideNames',
      ];
      for (const key of expectedKeys) {
        expect(CONFIG_DEFAULTS).toHaveProperty(key);
      }
    });
  });
});
