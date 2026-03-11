import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const mockLoadConfig = vi.fn();
const mockSaveConfig = vi.fn();
const mockOnConfigChanged = vi.fn();
const mockRemoveConfigChangedListener = vi.fn();

vi.mock('../../src/services/api', () => ({
  loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
  saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
  onConfigChanged: (...args: unknown[]) => mockOnConfigChanged(...args),
  removeConfigChangedListener: (...args: unknown[]) => mockRemoveConfigChangedListener(...args),
}));

import { useConfigStore } from '../../src/stores/config';
import { CONFIG_DEFAULTS } from '../../src/enums/config-defaults';

describe('Config Store', () => {
  let store: ReturnType<typeof useConfigStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useConfigStore();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has default values matching CONFIG_DEFAULTS', () => {
      expect(store.sendToSpeakers).toBe(CONFIG_DEFAULTS.sendToSpeakers);
      expect(store.sendToVirtualMic).toBe(CONFIG_DEFAULTS.sendToVirtualMic);
      expect(store.soundboardVolume).toBe(CONFIG_DEFAULTS.soundboardVolume);
      expect(store.monitorVolume).toBe(CONFIG_DEFAULTS.monitorVolume);
      expect(store.speakerDeviceId).toBe(CONFIG_DEFAULTS.speakerDeviceId);
      expect(store.virtualMicDeviceId).toBe(CONFIG_DEFAULTS.virtualMicDeviceId);
      expect(store.micDeviceId).toBe(CONFIG_DEFAULTS.micDeviceId);
      expect(store.micVolume).toBe(CONFIG_DEFAULTS.micVolume);
      expect(store.enableMicPassthrough).toBe(CONFIG_DEFAULTS.enableMicPassthrough);
      expect(store.locale).toBe(CONFIG_DEFAULTS.locale);
      expect(store.stopHotkey).toBe(CONFIG_DEFAULTS.stopHotkey);
      expect(store.libraryViewMode).toBe(CONFIG_DEFAULTS.libraryViewMode);
      expect(store.libraryHideNames).toBe(CONFIG_DEFAULTS.libraryHideNames);
      expect(store.widgetViewMode).toBe(CONFIG_DEFAULTS.widgetViewMode);
      expect(store.widgetHideNames).toBe(CONFIG_DEFAULTS.widgetHideNames);
      expect(store.enableCompressor).toBe(CONFIG_DEFAULTS.enableCompressor);
    });
  });

  describe('load()', () => {
    it('merges loaded config into store state', async () => {
      mockLoadConfig.mockResolvedValue({
        soundboardVolume: 42,
        locale: 'it',
        sendToSpeakers: false,
      });

      await store.load();

      expect(store.soundboardVolume).toBe(42);
      expect(store.locale).toBe('it');
      expect(store.sendToSpeakers).toBe(false);
    });

    it('preserves defaults for keys not in loaded config', async () => {
      mockLoadConfig.mockResolvedValue({
        locale: 'it',
      });

      await store.load();

      // locale changed
      expect(store.locale).toBe('it');
      // everything else stays default
      expect(store.soundboardVolume).toBe(CONFIG_DEFAULTS.soundboardVolume);
      expect(store.sendToSpeakers).toBe(CONFIG_DEFAULTS.sendToSpeakers);
      expect(store.enableCompressor).toBe(CONFIG_DEFAULTS.enableCompressor);
    });

    it('ignores undefined values in loaded config', async () => {
      mockLoadConfig.mockResolvedValue({
        soundboardVolume: undefined,
        locale: 'it',
      });

      await store.load();

      // soundboardVolume should stay default because loaded value was undefined
      expect(store.soundboardVolume).toBe(CONFIG_DEFAULTS.soundboardVolume);
      expect(store.locale).toBe('it');
    });

    it('handles empty config object', async () => {
      mockLoadConfig.mockResolvedValue({});

      await store.load();

      // All values should remain at defaults
      expect(store.soundboardVolume).toBe(CONFIG_DEFAULTS.soundboardVolume);
      expect(store.locale).toBe(CONFIG_DEFAULTS.locale);
    });
  });

  describe('save()', () => {
    it('calls saveConfig with all current values', async () => {
      mockSaveConfig.mockResolvedValue(undefined);

      store.soundboardVolume = 75;
      store.locale = 'it';

      await store.save();

      expect(mockSaveConfig).toHaveBeenCalledTimes(1);
      const saved = mockSaveConfig.mock.calls[0][0];
      expect(saved.soundboardVolume).toBe(75);
      expect(saved.locale).toBe('it');
      // Defaults for unchanged values
      expect(saved.sendToSpeakers).toBe(CONFIG_DEFAULTS.sendToSpeakers);
    });

    it('includes all config keys in saved object', async () => {
      mockSaveConfig.mockResolvedValue(undefined);

      await store.save();

      const saved = mockSaveConfig.mock.calls[0][0];
      const expectedKeys = Object.keys(CONFIG_DEFAULTS);
      expect(Object.keys(saved).sort()).toEqual(expectedKeys.sort());
    });
  });

  describe('resetDefaults()', () => {
    it('resets all values to CONFIG_DEFAULTS', async () => {
      mockSaveConfig.mockResolvedValue(undefined);

      // Modify several values
      store.soundboardVolume = 10;
      store.locale = 'it';
      store.sendToSpeakers = false;
      store.enableCompressor = false;

      await store.resetDefaults();

      expect(store.soundboardVolume).toBe(CONFIG_DEFAULTS.soundboardVolume);
      expect(store.locale).toBe(CONFIG_DEFAULTS.locale);
      expect(store.sendToSpeakers).toBe(CONFIG_DEFAULTS.sendToSpeakers);
      expect(store.enableCompressor).toBe(CONFIG_DEFAULTS.enableCompressor);
    });

    it('calls save after resetting', async () => {
      mockSaveConfig.mockResolvedValue(undefined);

      await store.resetDefaults();

      expect(mockSaveConfig).toHaveBeenCalledTimes(1);
      // Saved values should match defaults
      const saved = mockSaveConfig.mock.calls[0][0];
      expect(saved.soundboardVolume).toBe(CONFIG_DEFAULTS.soundboardVolume);
      expect(saved.locale).toBe(CONFIG_DEFAULTS.locale);
    });
  });

  describe('startListening / stopListening', () => {
    it('startListening registers a config changed callback', () => {
      store.startListening();
      expect(mockOnConfigChanged).toHaveBeenCalledTimes(1);
      expect(mockOnConfigChanged).toHaveBeenCalledWith(expect.any(Function));
    });

    it('stopListening removes the listener', () => {
      store.stopListening();
      expect(mockRemoveConfigChangedListener).toHaveBeenCalledTimes(1);
    });

    it('config changed callback triggers load()', async () => {
      mockLoadConfig.mockResolvedValue({ locale: 'it' });

      store.startListening();

      // Get the callback that was registered
      const callback = mockOnConfigChanged.mock.calls[0][0];
      await callback();

      expect(mockLoadConfig).toHaveBeenCalledTimes(1);
      expect(store.locale).toBe('it');
    });
  });
});
