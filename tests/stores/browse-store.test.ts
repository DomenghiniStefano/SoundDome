import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import axios from 'axios';
import { MYINSTANTS_API_URL, MYINSTANTS_BASE_URL } from '../../src/enums/api';

vi.mock('axios');

import { useBrowseStore } from '../../src/stores/browse';

describe('Browse Store', () => {
  let store: ReturnType<typeof useBrowseStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useBrowseStore();
    vi.clearAllMocks();
  });

  describe('search()', () => {
    it('builds correct API URL with encoded query', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { next: null, results: [] },
      });

      await store.search('hello world');
      expect(axios.get).toHaveBeenCalledWith(
        `${MYINSTANTS_API_URL}?format=json&name=hello%20world`
      );
    });

    it('encodes special characters in query', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { next: null, results: [] },
      });

      await store.search('rock & roll');
      expect(axios.get).toHaveBeenCalledWith(
        `${MYINSTANTS_API_URL}?format=json&name=rock%20%26%20roll`
      );
    });

    it('clears previous results before searching', async () => {
      store.results = [{ name: 'old', sound: 'http://old.mp3', slug: 'old' }] as BrowseResult[];
      store.nextUrl = 'http://old-next';

      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { next: null, results: [{ name: 'new', sound: 'http://new.mp3', slug: 'new' }] },
      });

      await store.search('new');
      expect(store.results).toHaveLength(1);
      expect(store.results[0].name).toBe('new');
      expect(store.nextUrl).toBeNull();
    });

    it('sets loading to true during search', async () => {
      let capturedLoading = false;
      (axios.get as ReturnType<typeof vi.fn>).mockImplementation(() => {
        capturedLoading = store.loading;
        return Promise.resolve({ data: { next: null, results: [] } });
      });

      await store.search('test');
      // loading should have been true when axios was called
      expect(capturedLoading).toBe(true);
      // loading should be false after search completes
      expect(store.loading).toBe(false);
    });
  });

  describe('fetchPage — URL normalization', () => {
    it('passes absolute URLs through unchanged', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          next: null,
          results: [
            { name: 'Sound', sound: 'https://myinstants.com/media/sound.mp3', slug: 'sound' },
          ],
        },
      });

      await store.search('test');
      expect(store.results[0].sound).toBe('https://myinstants.com/media/sound.mp3');
    });

    it('prepends base URL to relative sound paths', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          next: null,
          results: [
            { name: 'Sound', sound: '/media/sound.mp3', slug: 'sound' },
          ],
        },
      });

      await store.search('test');
      expect(store.results[0].sound).toBe(`${MYINSTANTS_BASE_URL}/media/sound.mp3`);
    });

    it('maps name, sound, and slug from API response', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          next: null,
          results: [
            { name: 'Bruh', sound: 'https://example.com/bruh.mp3', slug: 'bruh-sound', extra_field: 'ignored' },
          ],
        },
      });

      await store.search('bruh');
      expect(store.results[0]).toEqual({
        name: 'Bruh',
        sound: 'https://example.com/bruh.mp3',
        slug: 'bruh-sound',
      });
    });
  });

  describe('pagination', () => {
    it('stores next URL from API response', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          next: 'https://myinstants.com/api/v1/instants/?page=2',
          results: [{ name: 'A', sound: 'https://a.mp3', slug: 'a' }],
        },
      });

      await store.search('test');
      expect(store.nextUrl).toBe('https://myinstants.com/api/v1/instants/?page=2');
    });

    it('sets nextUrl to null when no more pages', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { next: null, results: [] },
      });

      await store.search('test');
      expect(store.nextUrl).toBeNull();
    });

    it('loadMore appends results to existing list', async () => {
      // Initial search
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: {
          next: 'https://page2',
          results: [{ name: 'A', sound: 'https://a.mp3', slug: 'a' }],
        },
      });
      await store.search('test');

      // Load more
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: {
          next: null,
          results: [{ name: 'B', sound: 'https://b.mp3', slug: 'b' }],
        },
      });
      await store.loadMore();

      expect(store.results).toHaveLength(2);
      expect(store.results[0].name).toBe('A');
      expect(store.results[1].name).toBe('B');
    });

    it('loadMore does nothing when no nextUrl', async () => {
      store.nextUrl = null;
      await store.loadMore();
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('loadMore does nothing when already loading', async () => {
      store.nextUrl = 'https://page2';
      store.loading = true;
      await store.loadMore();
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('sets loading to false even on API error', async () => {
      (axios.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await store.search('test');
      expect(store.loading).toBe(false);
      expect(store.results).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  describe('clear()', () => {
    it('resets all state to initial values', async () => {
      // Fill store with data
      (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          next: 'https://page2',
          results: [{ name: 'A', sound: 'https://a.mp3', slug: 'a' }],
        },
      });
      await store.search('test');

      // Clear
      store.clear();
      expect(store.results).toHaveLength(0);
      expect(store.query).toBe('');
      expect(store.nextUrl).toBeNull();
      expect(store.loading).toBe(false);
      expect(store.autoLoading).toBe(false);
    });
  });
});
