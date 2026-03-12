import { defineStore } from 'pinia';
import { ref } from 'vue';
import _ from 'lodash';
import axios from 'axios';
import { MYINSTANTS_API_URL, MYINSTANTS_BASE_URL } from '../enums/api';
import { StoreName } from '../enums/stores';
import { log } from '../utils/logger';

export const useBrowseStore = defineStore(StoreName.BROWSE, () => {
  const results = ref<BrowseResult[]>([]);
  const query = ref('');
  const nextUrl = ref<string | null>(null);
  const loading = ref(false);
  const autoLoading = ref(false);
  const error = ref<string | null>(null);

  async function search(q: string) {
    query.value = q;
    loading.value = true;
    error.value = null;
    results.value = [];
    nextUrl.value = null;

    const url = `${MYINSTANTS_API_URL}?format=json&name=${encodeURIComponent(q)}`;
    await fetchPage(url, false);
  }

  async function loadMore() {
    if (!nextUrl.value || loading.value) return;
    loading.value = true;
    await fetchPage(nextUrl.value, true);
  }

  async function loadUntilFilled(targetCount: number) {
    if (autoLoading.value) return;
    autoLoading.value = true;
    while (results.value.length < targetCount && nextUrl.value && !loading.value) {
      loading.value = true;
      await fetchPage(nextUrl.value, true);
    }
    autoLoading.value = false;
  }

  async function fetchPage(url: string, append: boolean) {
    try {
      const { data } = await axios.get(url);

      nextUrl.value = data.next;

      const items: BrowseResult[] = data.results.map((item: { name: string; sound: string; slug: string }) => ({
        name: item.name,
        sound: item.sound.startsWith('http')
          ? item.sound
          : `${MYINSTANTS_BASE_URL}${item.sound}`,
        slug: item.slug
      }));

      if (append) {
        results.value = _.concat(results.value, items);
      } else {
        results.value = items;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      log.error('Browse fetch error:', err);
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    results.value = [];
    query.value = '';
    nextUrl.value = null;
    loading.value = false;
    autoLoading.value = false;
    error.value = null;
  }

  return {
    results,
    query,
    nextUrl,
    loading,
    autoLoading,
    error,
    search,
    loadMore,
    loadUntilFilled,
    clear
  };
});
