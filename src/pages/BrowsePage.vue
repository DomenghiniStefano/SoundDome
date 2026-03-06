<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '../components/layout/PageHeader.vue';
import SoundCard from '../components/cards/SoundCard.vue';
import LoadMoreButton from '../components/ui/LoadMoreButton.vue';
import { useBrowseStore } from '../stores/browse';
import { useLibraryStore } from '../stores/library';
import { useAudio } from '../composables/useAudio';
import { useDebounce } from '../composables/useDebounce';

const { t } = useI18n();
const browseStore = useBrowseStore();
const libraryStore = useLibraryStore();
const { playRouted, preview, stopPreview, playingCardId, previewingCardId } = useAudio();

const searchInput = ref('');
const debouncedSearch = useDebounce(searchInput);
const savedSlugs = ref(new Set<string>());

watch(debouncedSearch, (q) => {
  const trimmed = q.trim();
  if (trimmed) {
    browseStore.search(trimmed);
  } else {
    browseStore.clear();
  }
});

async function onPlay(soundUrl: string, slug: string, name: string) {
  await playRouted(soundUrl, slug, name);
}

function onPreview(soundUrl: string, slug: string, name: string) {
  preview(soundUrl, slug, name);
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
    <PageHeader :title="t('browse.title')" :subtitle="t('browse.subtitle')" />

    <div class="search-bar">
      <input
        v-model="searchInput"
        type="text"
        :placeholder="t('browse.searchPlaceholder')"
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
        :previewing="previewingCardId === item.slug"
        :saved="savedSlugs.has(item.slug)"
        @play="onPlay(item.sound, item.slug, item.name)"
        @preview="onPreview(item.sound, item.slug, item.name)"
        @stop-preview="stopPreview"
        @save="onSave(item.name, item.sound, item.slug)"
      />
    </div>

    <div v-if="browseStore.loading" class="browse-status">{{ t('browse.searching') }}</div>
    <div
      v-else-if="browseStore.results.length === 0 && browseStore.query"
      class="browse-status"
    >
      {{ t('browse.noResults') }}
    </div>
    <div
      v-else-if="!browseStore.query"
      class="browse-status"
    >
      {{ t('browse.typeToSearch') }}
    </div>

    <LoadMoreButton
      v-if="browseStore.nextUrl"
      :disabled="browseStore.loading"
      @click="onLoadMore"
    >
      {{ t('browse.loadMore') }}
    </LoadMoreButton>
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
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.browse-status {
  text-align: center;
  padding: 32px 0;
  color: var(--color-text-dimmer);
  font-size: 0.85rem;
}
</style>
