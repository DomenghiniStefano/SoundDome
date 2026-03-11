import { describe, it, expect } from 'vitest';
import { getPageButtons, getFolderPageButtons } from '../../electron/streamdeck/mappings';
import type { StreamDeckMappings, StreamDeckButtonMapping } from '../../electron/streamdeck/mappings';

function makeMappings(overrides?: Partial<StreamDeckMappings>): StreamDeckMappings {
  return {
    pages: [
      { name: 'Page 1', buttons: { '0': { type: 'sound', itemId: 'abc' }, '3': { type: 'mediaPlayPause' } } },
      { name: 'Page 2', buttons: { '5': { type: 'shortcut', shortcut: 'Ctrl+A' } } },
    ],
    folders: [
      {
        name: 'Folder 1',
        pages: [
          { name: 'F1 Page 1', buttons: { '1': { type: 'sound', itemId: 'def' } } },
          { name: 'F1 Page 2', buttons: {} },
        ],
        closeButtonKey: 14,
      },
    ],
    brightness: 80,
    ...overrides,
  };
}

describe('getPageButtons', () => {
  it('returns buttons for valid page index', () => {
    const mappings = makeMappings();
    const buttons = getPageButtons(mappings, 0);
    expect(buttons['0']).toEqual({ type: 'sound', itemId: 'abc' });
    expect(buttons['3']).toEqual({ type: 'mediaPlayPause' });
  });

  it('returns buttons for second page', () => {
    const mappings = makeMappings();
    const buttons = getPageButtons(mappings, 1);
    expect(buttons['5']).toEqual({ type: 'shortcut', shortcut: 'Ctrl+A' });
  });

  it('returns empty object for out-of-range index', () => {
    const mappings = makeMappings();
    expect(getPageButtons(mappings, 99)).toEqual({});
  });

  it('returns empty object for negative index', () => {
    const mappings = makeMappings();
    expect(getPageButtons(mappings, -1)).toEqual({});
  });
});

describe('getFolderPageButtons', () => {
  it('returns buttons for valid folder and page', () => {
    const mappings = makeMappings();
    const buttons = getFolderPageButtons(mappings, 0, 0);
    expect(buttons['1']).toEqual({ type: 'sound', itemId: 'def' });
  });

  it('injects go-back button at closeButtonKey if slot is empty', () => {
    const mappings = makeMappings();
    const buttons = getFolderPageButtons(mappings, 0, 0);
    // closeButtonKey is 14, and slot 14 is empty, so goBack should be injected
    expect(buttons['14']).toEqual({ type: 'goBack' });
  });

  it('does not override existing button at closeButtonKey', () => {
    const mappings = makeMappings();
    // Put a button at key 14
    mappings.folders[0].pages[0].buttons['14'] = { type: 'sound', itemId: 'xyz' };
    const buttons = getFolderPageButtons(mappings, 0, 0);
    expect(buttons['14'].type).toBe('sound');
  });

  it('does not inject go-back if closeButtonKey is null', () => {
    const mappings = makeMappings();
    mappings.folders[0].closeButtonKey = null;
    const buttons = getFolderPageButtons(mappings, 0, 0);
    expect(buttons['14']).toBeUndefined();
  });

  it('does not inject go-back if closeButtonKey is undefined', () => {
    const mappings = makeMappings();
    delete (mappings.folders[0] as any).closeButtonKey;
    const buttons = getFolderPageButtons(mappings, 0, 0);
    expect(buttons['14']).toBeUndefined();
  });

  it('returns empty object for invalid folder index', () => {
    const mappings = makeMappings();
    expect(getFolderPageButtons(mappings, 99, 0)).toEqual({});
  });

  it('returns empty object for invalid page index', () => {
    const mappings = makeMappings();
    expect(getFolderPageButtons(mappings, 0, 99)).toEqual({});
  });

  it('returns empty object for negative indices', () => {
    const mappings = makeMappings();
    expect(getFolderPageButtons(mappings, -1, 0)).toEqual({});
    expect(getFolderPageButtons(mappings, 0, -1)).toEqual({});
  });
});
