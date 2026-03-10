import { describe, it, expect } from 'vitest';
import { PlaybackType, playbackTypes } from '../../src/enums/playback';
import { StoreName } from '../../src/enums/stores';

describe('PlaybackType', () => {
  it('ROUTED is routed', () => {
    expect(PlaybackType.ROUTED).toBe('routed');
  });

  it('PREVIEW is preview', () => {
    expect(PlaybackType.PREVIEW).toBe('preview');
  });
});

describe('playbackTypes array', () => {
  it('contains all PlaybackType values', () => {
    expect(playbackTypes).toContain('routed');
    expect(playbackTypes).toContain('preview');
  });

  it('has exactly 2 entries', () => {
    expect(playbackTypes).toHaveLength(2);
  });
});

describe('StoreName', () => {
  it('has all 4 stores', () => {
    expect(Object.keys(StoreName)).toHaveLength(4);
  });

  it('has expected store names', () => {
    expect(StoreName.BROWSE).toBe('browse');
    expect(StoreName.CONFIG).toBe('config');
    expect(StoreName.LIBRARY).toBe('library');
    expect(StoreName.STREAMDECK).toBe('streamdeck');
  });

  it('all values are unique', () => {
    const values = Object.values(StoreName);
    expect(new Set(values).size).toBe(values.length);
  });

  it('all values are lowercase', () => {
    for (const value of Object.values(StoreName)) {
      expect(value).toBe(value.toLowerCase());
    }
  });
});
