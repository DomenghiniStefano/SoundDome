import { describe, it, expect } from 'vitest';
import { IconName } from '../../src/enums/icons';

describe('IconName', () => {
  const allValues = Object.values(IconName);
  const allKeys = Object.keys(IconName);

  it('has no duplicate values', () => {
    expect(new Set(allValues).size).toBe(allValues.length);
  });

  it('all values are non-empty strings', () => {
    for (const value of allValues) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('all values are lowercase kebab-case', () => {
    for (const value of allValues) {
      expect(value).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('has essential UI icons', () => {
    expect(IconName.PLAY).toBe('play');
    expect(IconName.STOP).toBe('stop');
    expect(IconName.CLOSE).toBe('close');
    expect(IconName.PLUS).toBe('plus');
    expect(IconName.CHECK).toBe('check');
    expect(IconName.SEARCH).toBe('search');
    expect(IconName.TRASH).toBe('trash');
    expect(IconName.EDIT).toBe('edit');
    expect(IconName.SETTINGS).toBe('settings');
  });

  it('has audio-related icons', () => {
    expect(IconName.VOLUME).toBe('volume');
    expect(IconName.VOLUME_OFF).toBe('volume-off');
    expect(IconName.VOLUME_HIGH).toBe('volume-high');
    expect(IconName.HEADPHONES).toBe('headphones');
    expect(IconName.MICROPHONE).toBe('microphone');
    expect(IconName.MUSIC).toBe('music');
  });

  it('has window control icons', () => {
    expect(IconName.WINDOW_MINIMIZE).toBe('window-minimize');
    expect(IconName.WINDOW_MAXIMIZE).toBe('window-maximize');
    expect(IconName.WINDOW_RESTORE).toBe('window-restore');
  });

  it('has view mode icons', () => {
    expect(IconName.VIEW_LIST).toBe('view-list');
    expect(IconName.VIEW_SMALL).toBe('view-small');
    expect(IconName.VIEW_MEDIUM).toBe('view-medium');
    expect(IconName.VIEW_LARGE).toBe('view-large');
  });

  it('has navigation icons', () => {
    expect(IconName.CHEVRON_LEFT).toBe('chevron-left');
    expect(IconName.CHEVRON_RIGHT).toBe('chevron-right');
    expect(IconName.ARROW_BACK).toBe('arrow-back');
  });
});
