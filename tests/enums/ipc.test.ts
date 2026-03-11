import { describe, it, expect } from 'vitest';
import { IpcChannel } from '../../src/enums/ipc';

describe('IpcChannel', () => {
  const allValues = Object.values(IpcChannel);
  const allKeys = Object.keys(IpcChannel);

  it('has no duplicate channel names', () => {
    const unique = new Set(allValues);
    expect(unique.size).toBe(allValues.length);
  });

  it('all values are non-empty strings', () => {
    for (const value of allValues) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('all values use kebab-case', () => {
    for (const value of allValues) {
      expect(value).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('all keys use SCREAMING_SNAKE_CASE', () => {
    for (const key of allKeys) {
      expect(key).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });

  describe('expected channels exist', () => {
    it('has config channels', () => {
      expect(IpcChannel.LOAD_CONFIG).toBe('load-config');
      expect(IpcChannel.SAVE_CONFIG).toBe('save-config');
      expect(IpcChannel.CONFIG_CHANGED).toBe('config-changed');
    });

    it('has library channels', () => {
      expect(IpcChannel.LIBRARY_SAVE).toBe('library-save');
      expect(IpcChannel.LIBRARY_LIST).toBe('library-list');
      expect(IpcChannel.LIBRARY_DELETE).toBe('library-delete');
      expect(IpcChannel.LIBRARY_CHANGED).toBe('library-changed');
    });

    it('has hotkey channels', () => {
      expect(IpcChannel.HOTKEY_PLAY).toBe('hotkey-play');
      expect(IpcChannel.HOTKEY_STOP).toBe('hotkey-stop');
      expect(IpcChannel.HOTKEY_SUSPEND).toBe('hotkey-suspend');
    });

    it('has window channels', () => {
      expect(IpcChannel.WINDOW_MINIMIZE).toBe('window-minimize');
      expect(IpcChannel.WINDOW_MAXIMIZE).toBe('window-maximize');
      expect(IpcChannel.WINDOW_CLOSE).toBe('window-close');
    });

    it('has stream deck channels', () => {
      expect(IpcChannel.STREAMDECK_STATUS).toBe('streamdeck-status');
      expect(IpcChannel.STREAMDECK_BUTTON_PRESS).toBe('streamdeck-button-press');
      expect(IpcChannel.STREAMDECK_CONNECT).toBe('streamdeck-connect');
    });

    it('has update channels', () => {
      expect(IpcChannel.UPDATE_CHECK).toBe('update-check');
      expect(IpcChannel.UPDATE_AVAILABLE).toBe('update-available');
      expect(IpcChannel.UPDATE_DOWNLOADED).toBe('update-downloaded');
    });

    it('has playback sync channels', () => {
      expect(IpcChannel.PLAYBACK_STARTED).toBe('playback-started');
      expect(IpcChannel.PLAYBACK_STOPPED).toBe('playback-stopped');
    });
  });
});
