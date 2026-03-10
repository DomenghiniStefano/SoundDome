import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Mock all API calls — we're testing store logic, not IPC
vi.mock('../../src/services/api', () => ({
  libraryList: vi.fn(),
  librarySave: vi.fn(),
  libraryReset: vi.fn(),
  libraryUpload: vi.fn(),
  libraryDelete: vi.fn(),
  libraryGetPath: vi.fn(),
  libraryExport: vi.fn(),
  libraryImport: vi.fn(),
  libraryUpdate: vi.fn(),
  libraryReorder: vi.fn(),
  librarySetImage: vi.fn(),
  libraryRemoveImage: vi.fn(),
  libraryTrim: vi.fn(),
  libraryHasBackups: vi.fn(),
  libraryListBackups: vi.fn(),
  libraryRestoreBackup: vi.fn(),
  libraryDeleteBackup: vi.fn(),
  libraryDeleteAllBackups: vi.fn(),
  groupCreate: vi.fn(),
  groupUpdate: vi.fn(),
  groupDelete: vi.fn(),
  groupReorder: vi.fn(),
  onLibraryChanged: vi.fn(),
  removeLibraryChangedListener: vi.fn(),
}));

import { useLibraryStore } from '../../src/stores/library';
import { BuiltInGroup } from '../../src/enums/library';

function makeItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: 'item-1',
    name: 'Test Sound',
    filename: 'item-1.mp3',
    volume: 100,
    hotkey: null,
    backupEnabled: true,
    image: null,
    favorite: false,
    slug: null,
    sourceUrl: null,
    ...overrides,
  };
}

describe('Library Store — filteredItems', () => {
  let store: ReturnType<typeof useLibraryStore>;

  const items: LibraryItem[] = [
    makeItem({ id: 'a', name: 'Airhorn' }),
    makeItem({ id: 'b', name: 'Bruh', favorite: true }),
    makeItem({ id: 'c', name: 'Cricket', favorite: true }),
    makeItem({ id: 'd', name: 'Drumroll' }),
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useLibraryStore();
    store.items = items;
    store.groups = [
      { id: 'g1', name: 'My Group', itemIds: ['c', 'a'] },
      { id: 'g2', name: 'Empty Group', itemIds: [] },
    ];
    store.activeGroup = BuiltInGroup.ALL;
    store.searchQuery = '';
  });

  describe('group filtering', () => {
    it('ALL group returns all items', () => {
      store.activeGroup = BuiltInGroup.ALL;
      expect(store.filteredItems).toHaveLength(4);
    });

    it('FAVORITES group returns only favorited items', () => {
      store.activeGroup = BuiltInGroup.FAVORITES;
      const result = store.filteredItems;
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('b');
      expect(result[1].id).toBe('c');
    });

    it('custom group returns items in group order', () => {
      store.activeGroup = 'g1';
      const result = store.filteredItems;
      expect(result).toHaveLength(2);
      // Group itemIds are ['c', 'a'] — order preserved
      expect(result[0].id).toBe('c');
      expect(result[1].id).toBe('a');
    });

    it('empty custom group returns empty array', () => {
      store.activeGroup = 'g2';
      expect(store.filteredItems).toHaveLength(0);
    });

    it('non-existent group falls back to all items', () => {
      store.activeGroup = 'nonexistent';
      expect(store.filteredItems).toHaveLength(4);
    });

    it('group with deleted item IDs compacts them out', () => {
      store.groups = [{ id: 'g3', name: 'Stale', itemIds: ['a', 'deleted-id', 'c'] }];
      store.activeGroup = 'g3';
      const result = store.filteredItems;
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('a');
      expect(result[1].id).toBe('c');
    });
  });

  describe('search filtering', () => {
    it('empty search returns all items', () => {
      store.searchQuery = '';
      expect(store.filteredItems).toHaveLength(4);
    });

    it('whitespace-only search returns all items', () => {
      store.searchQuery = '   ';
      expect(store.filteredItems).toHaveLength(4);
    });

    it('search is case-insensitive', () => {
      store.searchQuery = 'AIRHORN';
      expect(store.filteredItems).toHaveLength(1);
      expect(store.filteredItems[0].id).toBe('a');
    });

    it('search is substring match', () => {
      store.searchQuery = 'rum';
      expect(store.filteredItems).toHaveLength(1);
      expect(store.filteredItems[0].id).toBe('d');
    });

    it('search with no matches returns empty', () => {
      store.searchQuery = 'zzzzz';
      expect(store.filteredItems).toHaveLength(0);
    });
  });

  describe('group + search combined', () => {
    it('filters within group by search query', () => {
      store.activeGroup = BuiltInGroup.FAVORITES;
      store.searchQuery = 'bru';
      const result = store.filteredItems;
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('b');
    });

    it('custom group + search respects both filters', () => {
      store.activeGroup = 'g1'; // contains ['c', 'a']
      store.searchQuery = 'air';
      const result = store.filteredItems;
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a');
    });

    it('favorites + no-match search returns empty', () => {
      store.activeGroup = BuiltInGroup.FAVORITES;
      store.searchQuery = 'airhorn'; // Airhorn is not a favorite
      expect(store.filteredItems).toHaveLength(0);
    });
  });
});

describe('Library Store — slugSet & getIdBySlug', () => {
  let store: ReturnType<typeof useLibraryStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useLibraryStore();
    store.items = [
      makeItem({ id: 'a', name: 'Airhorn', slug: 'airhorn-sound' }),
      makeItem({ id: 'b', name: 'Bruh', slug: 'bruh' }),
      makeItem({ id: 'c', name: 'No Slug', slug: null }),
    ];
  });

  it('slugSet contains items with slugs', () => {
    expect(store.slugSet.size).toBe(2);
    expect(store.slugSet.get('airhorn-sound')).toBe('a');
    expect(store.slugSet.get('bruh')).toBe('b');
  });

  it('slugSet excludes items without slugs', () => {
    expect(store.slugSet.has('No Slug')).toBe(false);
  });

  it('getIdBySlug returns ID for existing slug', () => {
    expect(store.getIdBySlug('bruh')).toBe('b');
  });

  it('getIdBySlug returns undefined for missing slug', () => {
    expect(store.getIdBySlug('nonexistent')).toBeUndefined();
  });
});

describe('Library Store — reorder', () => {
  let store: ReturnType<typeof useLibraryStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useLibraryStore();
    store.items = [
      makeItem({ id: 'a', name: 'Airhorn' }),
      makeItem({ id: 'b', name: 'Bruh' }),
      makeItem({ id: 'c', name: 'Cricket' }),
    ];
  });

  it('reorders items according to provided IDs', async () => {
    await store.reorder(['c', 'a', 'b']);
    expect(store.items[0].id).toBe('c');
    expect(store.items[1].id).toBe('a');
    expect(store.items[2].id).toBe('b');
  });

  it('drops items not in reorder list', async () => {
    await store.reorder(['b', 'a']);
    expect(store.items).toHaveLength(2);
    expect(store.items[0].id).toBe('b');
    expect(store.items[1].id).toBe('a');
  });

  it('ignores invalid IDs in reorder list', async () => {
    await store.reorder(['a', 'nonexistent', 'c']);
    expect(store.items).toHaveLength(2);
    expect(store.items[0].id).toBe('a');
    expect(store.items[1].id).toBe('c');
  });
});

describe('Library Store — group management', () => {
  let store: ReturnType<typeof useLibraryStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useLibraryStore();
    store.groups = [
      { id: 'g1', name: 'Group 1', itemIds: ['a', 'b'] },
      { id: 'g2', name: 'Group 2', itemIds: ['c'] },
    ];
    store.activeGroup = 'g1';
  });

  it('removeGroup removes group from list', async () => {
    const { groupDelete } = await import('../../src/services/api');
    (groupDelete as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await store.removeGroup('g1');
    expect(store.groups).toHaveLength(1);
    expect(store.groups[0].id).toBe('g2');
  });

  it('removeGroup resets activeGroup to ALL when active group is removed', async () => {
    const { groupDelete } = await import('../../src/services/api');
    (groupDelete as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await store.removeGroup('g1');
    expect(store.activeGroup).toBe(BuiltInGroup.ALL);
  });

  it('removeGroup does NOT reset activeGroup when a different group is removed', async () => {
    const { groupDelete } = await import('../../src/services/api');
    (groupDelete as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await store.removeGroup('g2');
    expect(store.activeGroup).toBe('g1');
  });

  it('reorderGroups reorders groups according to provided IDs', async () => {
    const { groupReorder } = await import('../../src/services/api');
    (groupReorder as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await store.reorderGroups(['g2', 'g1']);
    expect(store.groups[0].id).toBe('g2');
    expect(store.groups[1].id).toBe('g1');
  });
});

describe('Library Store — toggleFavorite', () => {
  let store: ReturnType<typeof useLibraryStore>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    store = useLibraryStore();
    store.items = [
      makeItem({ id: 'a', name: 'Airhorn', favorite: false }),
    ];

    const { libraryUpdate } = await import('../../src/services/api');
    (libraryUpdate as ReturnType<typeof vi.fn>).mockImplementation((_id: string, data: Record<string, unknown>) => {
      return Promise.resolve(data);
    });
  });

  it('toggles false to true', async () => {
    await store.toggleFavorite('a');
    // The update call should have been made with favorite: true
    const { libraryUpdate } = await import('../../src/services/api');
    expect(libraryUpdate).toHaveBeenCalledWith('a', { favorite: true });
  });

  it('does nothing for nonexistent item', async () => {
    const { libraryUpdate } = await import('../../src/services/api');
    (libraryUpdate as ReturnType<typeof vi.fn>).mockClear();
    await store.toggleFavorite('nonexistent');
    expect(libraryUpdate).not.toHaveBeenCalled();
  });
});
