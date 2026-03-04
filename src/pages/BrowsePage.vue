<script setup lang="ts">
import { ref, watch } from 'vue';
import PageHeader from '../components/PageHeader.vue';
import SoundCard from '../components/SoundCard.vue';
import LoadMoreButton from '../components/LoadMoreButton.vue';
import { useBrowseStore } from '../stores/browse';
import { useLibraryStore } from '../stores/library';
import { useAudio } from '../composables/useAudio';
import { useDebounce } from '../composables/useDebounce';

const browseStore = useBrowseStore();
const libraryStore = useLibraryStore();
const { playRouted, preview, playingCardId } = useAudio();

const searchInput = ref('');
const debouncedSearch = useDebounce(searchInput, 400);
const savedSlugs = ref(new Set<string>());

watch(debouncedSearch, (q) => {
  const trimmed = q.trim();
  if (trimmed) {
    browseStore.search(trimmed);
  } else {
    browseStore.clear();
  }
});

async function onPlay(soundUrl: string, slug: string) {
  await playRouted(soundUrl, slug);
}

function onPreview(soundUrl: string) {
  preview(soundUrl);
}

async function onSave(name: string, url: string, slug: string) {
  savedSlugs.value.add(slug);
  try {
    await libraryStore.save(name, url);
  } catch {
    savedSlugs.value.delete(slug);
  }
}

async function onLoadMore() {
  await browseStore.loadMore();
}
</script>

<template>
  <div class="page">
    <PageHeader title="Browse" subtitle="Search sounds from MyInstants" />

    <div class="search-bar">
      <input
        v-model="searchInput"
        type="text"
        placeholder="Search sounds..."
        autocomplete="off"
      >
    </div>

    <div class="sound-grid">
      <SoundCard
        v-for="item in browseStore.results"
        :key="item.slug"
        :name="item.name"
        mode="browse"
        :active="playingCardId === item.slug"
        :saved="savedSlugs.has(item.slug)"
        @play="onPlay(item.sound, item.slug)"
        @preview="onPreview(item.sound)"
        @save="onSave(item.name, item.sound, item.slug)"
      />
    </div>

    <div v-if="browseStore.loading" class="browse-status">Searching...</div>
    <div
      v-else-if="browseStore.results.length === 0 && browseStore.query"
      class="browse-status"
    >
      No sounds found
    </div>
    <div
      v-else-if="!browseStore.query"
      class="browse-status"
    >
      Type something to search
    </div>

    <LoadMoreButton
      v-if="browseStore.nextUrl"
      :disabled="browseStore.loading"
      @click="onLoadMore"
    />
  </div>
</template>

<style scoped>
.page {
  padding: var(--page-padding);
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
}

.search-bar input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius);
  background: var(--color-bg-card);
  color: var(--color-text);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-bar input:focus {
  border-color: var(--color-accent);
}

.search-bar input::placeholder {
  color: var(--color-text-dimmer);
}

.sound-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.browse-status {
  text-align: center;
  padding: 32px 0;
  color: var(--color-text-dimmer);
  font-size: 0.85rem;
}
</style>
