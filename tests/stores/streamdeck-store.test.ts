import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const { mockSaveMappings } = vi.hoisted(() => ({
  mockSaveMappings: vi.fn(),
}));

vi.mock('../../src/services/api', () => ({
  streamdeckStatus: vi.fn(),
  streamdeckLoadMappings: vi.fn(),
  streamdeckSaveMappings: mockSaveMappings,
  streamdeckSetBrightness: vi.fn(),
  streamdeckRefreshImages: vi.fn(),
}));

import { useStreamDeckStore } from '../../src/stores/streamdeck';

function makeMapping(overrides: Partial<StreamDeckMappings> = {}): StreamDeckMappings {
  return {
    pages: [
      { name: 'Main', buttons: {} },
    ],
    folders: [],
    brightness: 80,
    ...overrides,
  };
}

describe('StreamDeck Store — page CRUD', () => {
  let store: ReturnType<typeof useStreamDeckStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useStreamDeckStore();
    store.mappings = makeMapping({
      pages: [
        { name: 'Page 1', buttons: { '0': { type: 'sound', label: 'A' } as StreamDeckButtonMapping } },
        { name: 'Page 2', buttons: {} },
        { name: 'Page 3', buttons: {} },
      ],
    });
    store.currentPage = 0;
  });

  it('addPage appends a new page', () => {
    store.addPage('Page 4');
    expect(store.mappings.pages).toHaveLength(4);
    expect(store.mappings.pages[3].name).toBe('Page 4');
    expect(store.mappings.pages[3].buttons).toEqual({});
  });

  it('removePage removes the specified page', () => {
    store.removePage(1);
    expect(store.mappings.pages).toHaveLength(2);
    expect(store.mappings.pages[0].name).toBe('Page 1');
    expect(store.mappings.pages[1].name).toBe('Page 3');
  });

  it('removePage does NOT remove last remaining page', () => {
    store.mappings = makeMapping({ pages: [{ name: 'Only', buttons: {} }] });
    store.removePage(0);
    expect(store.mappings.pages).toHaveLength(1);
  });

  it('removePage adjusts currentPage when it would be out of bounds', () => {
    store.currentPage = 2; // pointing at Page 3
    store.removePage(2);
    expect(store.currentPage).toBe(1); // adjusted to last valid page
  });

  it('removePage does NOT adjust currentPage when still valid', () => {
    store.currentPage = 0;
    store.removePage(2);
    expect(store.currentPage).toBe(0);
  });

  it('removePage ignores invalid index (negative)', () => {
    store.removePage(-1);
    expect(store.mappings.pages).toHaveLength(3);
  });

  it('removePage ignores invalid index (out of range)', () => {
    store.removePage(10);
    expect(store.mappings.pages).toHaveLength(3);
  });

  it('renamePage updates the page name', () => {
    store.renamePage(1, 'Renamed');
    expect(store.mappings.pages[1].name).toBe('Renamed');
  });

  it('renamePage ignores invalid index', () => {
    store.renamePage(99, 'Invalid');
    // no error, no change
    expect(store.mappings.pages[0].name).toBe('Page 1');
  });
});

describe('StreamDeck Store — button mapping', () => {
  let store: ReturnType<typeof useStreamDeckStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useStreamDeckStore();
    store.mappings = makeMapping();
  });

  it('setButtonMapping sets a button on the specified page', () => {
    const mapping = { type: 'sound', label: 'Test', itemId: 'abc' } as StreamDeckButtonMapping;
    store.setButtonMapping(0, 5, mapping);
    expect(store.mappings.pages[0].buttons['5']).toEqual(mapping);
  });

  it('setButtonMapping with null removes the button', () => {
    store.mappings.pages[0].buttons['3'] = { type: 'sound', label: 'X' } as StreamDeckButtonMapping;
    store.setButtonMapping(0, 3, null);
    expect(store.mappings.pages[0].buttons['3']).toBeUndefined();
  });

  it('setButtonMapping ignores invalid page index', () => {
    const mapping = { type: 'sound', label: 'Test' } as StreamDeckButtonMapping;
    store.setButtonMapping(99, 0, mapping);
    // no error
  });

  it('setButtonMapping ignores negative page index', () => {
    const mapping = { type: 'sound', label: 'Test' } as StreamDeckButtonMapping;
    store.setButtonMapping(-1, 0, mapping);
    // no error
  });
});

describe('StreamDeck Store — folder CRUD', () => {
  let store: ReturnType<typeof useStreamDeckStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useStreamDeckStore();
    store.mappings = makeMapping({
      pages: [
        {
          name: 'Main', buttons: {
            '0': { type: 'folder', folderIndex: 0, label: 'F1' } as unknown as StreamDeckButtonMapping,
            '1': { type: 'folder', folderIndex: 1, label: 'F2' } as unknown as StreamDeckButtonMapping,
            '2': { type: 'folder', folderIndex: 2, label: 'F3' } as unknown as StreamDeckButtonMapping,
            '3': { type: 'sound', label: 'Sound' } as StreamDeckButtonMapping,
          },
        },
      ],
      folders: [
        { name: 'Folder A', pages: [{ name: 'P1', buttons: {} }] },
        { name: 'Folder B', pages: [{ name: 'P1', buttons: {} }] },
        { name: 'Folder C', pages: [{ name: 'P1', buttons: {} }] },
      ],
    });
  });

  it('addFolder appends a folder with one default page', () => {
    store.addFolder('New Folder');
    expect(store.mappings.folders).toHaveLength(4);
    expect(store.mappings.folders[3].name).toBe('New Folder');
    expect(store.mappings.folders[3].pages).toHaveLength(1);
    expect(store.mappings.folders[3].pages[0].name).toBe('Page 1');
  });

  it('removeFolder removes the folder', () => {
    store.removeFolder(1); // Remove 'Folder B'
    expect(store.mappings.folders).toHaveLength(2);
    expect(store.mappings.folders[0].name).toBe('Folder A');
    expect(store.mappings.folders[1].name).toBe('Folder C');
  });

  it('removeFolder cleans up buttons pointing to removed folder', () => {
    store.removeFolder(1); // Remove 'Folder B' (index 1)
    const btn1 = store.mappings.pages[0].buttons['1'] as unknown as { type: string; folderIndex?: number };
    // Button 1 pointed to folder index 1 — should be cleaned up
    expect(btn1.type).not.toBe('folder');
    expect(btn1.folderIndex).toBeUndefined();
  });

  it('removeFolder decrements folderIndex for buttons pointing to higher folders', () => {
    store.removeFolder(0); // Remove 'Folder A' (index 0)
    const btn1 = store.mappings.pages[0].buttons['1'] as unknown as { type: string; folderIndex: number };
    const btn2 = store.mappings.pages[0].buttons['2'] as unknown as { type: string; folderIndex: number };
    // Folder B was index 1, now should be 0
    expect(btn1.folderIndex).toBe(0);
    // Folder C was index 2, now should be 1
    expect(btn2.folderIndex).toBe(1);
  });

  it('removeFolder does NOT affect buttons pointing to lower folders', () => {
    store.removeFolder(2); // Remove 'Folder C' (index 2)
    const btn0 = store.mappings.pages[0].buttons['0'] as unknown as { type: string; folderIndex: number };
    const btn1 = store.mappings.pages[0].buttons['1'] as unknown as { type: string; folderIndex: number };
    expect(btn0.folderIndex).toBe(0); // unchanged
    expect(btn1.folderIndex).toBe(1); // unchanged
  });

  it('removeFolder does NOT affect non-folder buttons', () => {
    store.removeFolder(1);
    const btn3 = store.mappings.pages[0].buttons['3'] as unknown as { type: string };
    expect(btn3.type).toBe('sound');
  });

  it('removeFolder ignores invalid index', () => {
    store.removeFolder(-1);
    expect(store.mappings.folders).toHaveLength(3);
    store.removeFolder(99);
    expect(store.mappings.folders).toHaveLength(3);
  });

  it('renameFolder updates the name', () => {
    store.renameFolder(0, 'Renamed');
    expect(store.mappings.folders[0].name).toBe('Renamed');
  });

  it('renameFolder ignores invalid index', () => {
    store.renameFolder(99, 'X');
    // no error
  });

  it('setFolderIcon sets icon', () => {
    store.setFolderIcon(0, 'icon:music');
    expect(store.mappings.folders[0].icon).toBe('icon:music');
  });

  it('setFolderIcon removes icon when empty string', () => {
    store.mappings.folders[0].icon = 'icon:old';
    store.setFolderIcon(0, '');
    expect(store.mappings.folders[0].icon).toBeUndefined();
  });
});

describe('StreamDeck Store — folder page CRUD', () => {
  let store: ReturnType<typeof useStreamDeckStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useStreamDeckStore();
    store.mappings = makeMapping({
      folders: [
        {
          name: 'Folder A',
          pages: [
            { name: 'FP1', buttons: {} },
            { name: 'FP2', buttons: {} },
          ],
        },
      ],
    });
  });

  it('addFolderPage appends a page to the folder', () => {
    store.addFolderPage(0, 'FP3');
    expect(store.mappings.folders[0].pages).toHaveLength(3);
    expect(store.mappings.folders[0].pages[2].name).toBe('FP3');
  });

  it('addFolderPage ignores invalid folder index', () => {
    store.addFolderPage(99, 'X');
    // no error, folders unchanged
  });

  it('removeFolderPage removes page from folder', () => {
    store.removeFolderPage(0, 1);
    expect(store.mappings.folders[0].pages).toHaveLength(1);
    expect(store.mappings.folders[0].pages[0].name).toBe('FP1');
  });

  it('removeFolderPage does NOT remove last remaining page', () => {
    store.removeFolderPage(0, 0); // remove FP1, FP2 remains
    expect(store.mappings.folders[0].pages).toHaveLength(1);
    store.removeFolderPage(0, 0); // try to remove last page
    expect(store.mappings.folders[0].pages).toHaveLength(1); // still 1
  });

  it('renameFolderPage updates the name', () => {
    store.renameFolderPage(0, 0, 'Renamed');
    expect(store.mappings.folders[0].pages[0].name).toBe('Renamed');
  });

  it('renameFolderPage ignores invalid indices', () => {
    store.renameFolderPage(99, 0, 'X');
    store.renameFolderPage(0, 99, 'X');
    // no errors
  });
});

describe('StreamDeck Store — folder button mapping', () => {
  let store: ReturnType<typeof useStreamDeckStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useStreamDeckStore();
    store.mappings = makeMapping({
      folders: [
        { name: 'F1', pages: [{ name: 'P1', buttons: {} }] },
      ],
    });
  });

  it('setFolderButtonMapping sets a button inside a folder page', () => {
    const mapping = { type: 'sound', label: 'In Folder' } as StreamDeckButtonMapping;
    store.setFolderButtonMapping(0, 0, 7, mapping);
    expect(store.mappings.folders[0].pages[0].buttons['7']).toEqual(mapping);
  });

  it('setFolderButtonMapping with null removes the button', () => {
    store.mappings.folders[0].pages[0].buttons['5'] = { type: 'sound', label: 'X' } as StreamDeckButtonMapping;
    store.setFolderButtonMapping(0, 0, 5, null);
    expect(store.mappings.folders[0].pages[0].buttons['5']).toBeUndefined();
  });

  it('setFolderButtonMapping ignores invalid folder index', () => {
    const mapping = { type: 'sound', label: 'Test' } as StreamDeckButtonMapping;
    store.setFolderButtonMapping(99, 0, 0, mapping);
    // no error
  });

  it('setFolderButtonMapping ignores invalid page index', () => {
    const mapping = { type: 'sound', label: 'Test' } as StreamDeckButtonMapping;
    store.setFolderButtonMapping(0, 99, 0, mapping);
    // no error
  });
});

describe('StreamDeck Store — computed properties', () => {
  let store: ReturnType<typeof useStreamDeckStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useStreamDeckStore();
    store.mappings = makeMapping({
      pages: [
        { name: 'Page A', buttons: { '0': { type: 'sound' } as StreamDeckButtonMapping } },
        { name: 'Page B', buttons: {} },
      ],
      folders: [{ name: 'Folder X', pages: [{ name: 'FP', buttons: {} }] }],
    });
  });

  it('pages computed returns the pages array', () => {
    expect(store.pages).toHaveLength(2);
    expect(store.pages[0].name).toBe('Page A');
  });

  it('folders computed returns the folders array', () => {
    expect(store.folders).toHaveLength(1);
    expect(store.folders[0].name).toBe('Folder X');
  });

  it('currentPageData returns the page at currentPage index', () => {
    store.currentPage = 1;
    expect(store.currentPageData.name).toBe('Page B');
  });

  it('currentPageData returns fallback for out-of-bounds currentPage', () => {
    store.currentPage = 99;
    expect(store.currentPageData.name).toBe('');
  });
});

describe('StreamDeck Store — setConnected / setCurrentPage', () => {
  let store: ReturnType<typeof useStreamDeckStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useStreamDeckStore();
    store.mappings = makeMapping({
      pages: [
        { name: 'Page 1', buttons: {} },
        { name: 'Page 2', buttons: {} },
      ],
    });
  });

  it('setConnected sets isConnected to true', () => {
    store.setConnected(true);
    expect(store.isConnected).toBe(true);
  });

  it('setConnected sets isConnected to false', () => {
    store.isConnected = true;
    store.setConnected(false);
    expect(store.isConnected).toBe(false);
  });

  it('setCurrentPage updates currentPage for valid index', () => {
    store.setCurrentPage(1);
    expect(store.currentPage).toBe(1);
  });

  it('setCurrentPage ignores negative index', () => {
    store.setCurrentPage(-1);
    expect(store.currentPage).toBe(0);
  });

  it('setCurrentPage ignores out-of-bounds index', () => {
    store.setCurrentPage(99);
    expect(store.currentPage).toBe(0);
  });
});

describe('StreamDeck Store — validation', () => {
  let store: ReturnType<typeof useStreamDeckStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useStreamDeckStore();
    store.mappings = makeMapping({
      pages: [{ name: 'Page 1', buttons: {} }],
      folders: [{ name: 'Folder A', pages: [{ name: 'FP1', buttons: {} }] }],
    });
  });

  it('addPage rejects empty name', () => {
    store.addPage('');
    expect(store.mappings.pages).toHaveLength(1);
  });

  it('addPage rejects whitespace-only name', () => {
    store.addPage('   ');
    expect(store.mappings.pages).toHaveLength(1);
  });

  it('addPage trims name', () => {
    store.addPage('  New Page  ');
    expect(store.mappings.pages[1].name).toBe('New Page');
  });

  it('renamePage rejects empty name', () => {
    store.renamePage(0, '');
    expect(store.mappings.pages[0].name).toBe('Page 1');
  });

  it('renamePage trims name', () => {
    store.renamePage(0, '  Trimmed  ');
    expect(store.mappings.pages[0].name).toBe('Trimmed');
  });

  it('addFolder rejects empty name', () => {
    store.addFolder('');
    expect(store.mappings.folders).toHaveLength(1);
  });

  it('addFolder trims name', () => {
    store.addFolder('  New Folder  ');
    expect(store.mappings.folders[1].name).toBe('New Folder');
  });

  it('renameFolder rejects empty name', () => {
    store.renameFolder(0, '');
    expect(store.mappings.folders[0].name).toBe('Folder A');
  });

  it('renameFolder trims name', () => {
    store.renameFolder(0, '  Renamed  ');
    expect(store.mappings.folders[0].name).toBe('Renamed');
  });

  it('addFolderPage rejects empty name', () => {
    store.addFolderPage(0, '');
    expect(store.mappings.folders[0].pages).toHaveLength(1);
  });

  it('addFolderPage trims name', () => {
    store.addFolderPage(0, '  FP2  ');
    expect(store.mappings.folders[0].pages[1].name).toBe('FP2');
  });

  it('renameFolderPage rejects empty name', () => {
    store.renameFolderPage(0, 0, '');
    expect(store.mappings.folders[0].pages[0].name).toBe('FP1');
  });

  it('renameFolderPage trims name', () => {
    store.renameFolderPage(0, 0, '  Trimmed  ');
    expect(store.mappings.folders[0].pages[0].name).toBe('Trimmed');
  });
});

describe('StreamDeck Store — auto-save', () => {
  let store: ReturnType<typeof useStreamDeckStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    store = useStreamDeckStore();
    store.mappings = makeMapping({
      pages: [
        { name: 'Page 1', buttons: {} },
        { name: 'Page 2', buttons: {} },
      ],
      folders: [{ name: 'Folder A', pages: [{ name: 'FP1', buttons: {} }, { name: 'FP2', buttons: {} }] }],
    });
    mockSaveMappings.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('setButtonMapping triggers debounced save', async () => {
    store.setButtonMapping(0, 0, { type: 'sound', label: 'A' } as StreamDeckButtonMapping);
    expect(mockSaveMappings).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(600);
    expect(mockSaveMappings).toHaveBeenCalledTimes(1);
  });

  it('addPage triggers debounced save', async () => {
    store.addPage('New');
    await vi.advanceTimersByTimeAsync(600);
    expect(mockSaveMappings).toHaveBeenCalledTimes(1);
  });

  it('removePage triggers debounced save', async () => {
    store.removePage(1);
    await vi.advanceTimersByTimeAsync(600);
    expect(mockSaveMappings).toHaveBeenCalledTimes(1);
  });

  it('renamePage triggers debounced save', async () => {
    store.renamePage(0, 'Renamed');
    await vi.advanceTimersByTimeAsync(600);
    expect(mockSaveMappings).toHaveBeenCalledTimes(1);
  });

  it('addFolder triggers debounced save', async () => {
    store.addFolder('New Folder');
    await vi.advanceTimersByTimeAsync(600);
    expect(mockSaveMappings).toHaveBeenCalledTimes(1);
  });

  it('removeFolder triggers debounced save', async () => {
    store.removeFolder(0);
    await vi.advanceTimersByTimeAsync(600);
    expect(mockSaveMappings).toHaveBeenCalledTimes(1);
  });

  it('multiple rapid mutations only trigger one save (debounce)', async () => {
    store.addPage('A');
    store.addPage('B');
    store.addPage('C');
    await vi.advanceTimersByTimeAsync(600);
    expect(mockSaveMappings).toHaveBeenCalledTimes(1);
  });
});
