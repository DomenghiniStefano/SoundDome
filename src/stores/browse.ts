import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface BrowseResult {
  name: string;
  sound: string;
  slug: string;
}

export const useBrowseStore = defineStore('browse', () => {
  const results = ref<BrowseResult[]>([]);
  const query = ref('');
  const nextUrl = ref<string | null>(null);
  const loading = ref(false);

  async function search(q: string) {
    query.value = q;
    loading.value = true;
    results.value = [];
    nextUrl.value = null;

    const url = `https://www.myinstants.com/api/v1/instants/?format=json&name=${encodeURIComponent(q)}`;
    await fetchPage(url, false);
  }

  async function loadMore() {
    if (!nextUrl.value || loading.value) return;
    loading.value = true;
    await fetchPage(nextUrl.value, true);
  }

  async function fetchPage(url: string, append: boolean) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      nextUrl.value = data.next;

      const items: BrowseResult[] = data.results.map((item: { name: string; sound: string; slug: string }) => ({
        name: item.name,
        sound: item.sound.startsWith('http')
          ? item.sound
          : `https://www.myinstants.com${item.sound}`,
        slug: item.slug
      }));

      if (append) {
        results.value = [...results.value, ...items];
      } else {
        results.value = items;
      }
    } catch (err) {
      console.error('Browse fetch error:', err);
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    results.value = [];
    query.value = '';
    nextUrl.value = null;
    loading.value = false;
  }

  return {
    results,
    query,
    nextUrl,
    loading,
    search,
    loadMore,
    clear
  };
});
