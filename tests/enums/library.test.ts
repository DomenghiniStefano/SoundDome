import { describe, it, expect } from 'vitest';
import {
  LibraryStatus, libraryStatuses,
  BuiltInGroup,
  LibraryViewMode,
  SoundCardMode, soundCardModes,
} from '../../src/enums/library';

describe('LibraryStatus', () => {
  it('IDLE is idle', () => {
    expect(LibraryStatus.IDLE).toBe('idle');
  });

  it('LOADING is loading', () => {
    expect(LibraryStatus.LOADING).toBe('loading');
  });

  it('ERROR is error', () => {
    expect(LibraryStatus.ERROR).toBe('error');
  });
});

describe('libraryStatuses array', () => {
  it('contains all 3 statuses', () => {
    expect(libraryStatuses).toHaveLength(3);
    expect(libraryStatuses).toContain('idle');
    expect(libraryStatuses).toContain('loading');
    expect(libraryStatuses).toContain('error');
  });
});

describe('BuiltInGroup', () => {
  it('ALL is all', () => {
    expect(BuiltInGroup.ALL).toBe('all');
  });

  it('FAVORITES is favorites', () => {
    expect(BuiltInGroup.FAVORITES).toBe('favorites');
  });
});

describe('LibraryViewMode', () => {
  it('has 4 view modes', () => {
    const modes = Object.values(LibraryViewMode);
    expect(modes).toHaveLength(4);
  });

  it('has expected values', () => {
    expect(LibraryViewMode.LIST).toBe('list');
    expect(LibraryViewMode.SMALL).toBe('small');
    expect(LibraryViewMode.MEDIUM).toBe('medium');
    expect(LibraryViewMode.LARGE).toBe('large');
  });
});

describe('SoundCardMode', () => {
  it('BROWSE is browse', () => {
    expect(SoundCardMode.BROWSE).toBe('browse');
  });

  it('LIBRARY is library', () => {
    expect(SoundCardMode.LIBRARY).toBe('library');
  });
});

describe('soundCardModes array', () => {
  it('contains all modes', () => {
    expect(soundCardModes).toHaveLength(2);
    expect(soundCardModes).toContain('browse');
    expect(soundCardModes).toContain('library');
  });
});
