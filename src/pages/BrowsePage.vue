<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '../components/layout/PageHeader.vue';
import SoundCard from '../components/cards/SoundCard.vue';
import LoadMoreButton from '../components/ui/LoadMoreButton.vue';
import LoadingBars from '../components/ui/LoadingBars.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import { useBrowseStore } from '../stores/browse';
import { useLibraryStore } from '../stores/library';
import { useAudio } from '../composables/useAudio';
import { useDebounce } from '../composables/useDebounce';
import { BROWSE_MIN_CARD_WIDTH, BROWSE_ESTIMATED_CARD_HEIGHT, BROWSE_MIN_PAGE_SIZE } from '../enums/constants';

const { t } = useI18n();
const browseStore = useBrowseStore();
const libraryStore = useLibraryStore();
const { playRouted, preview, stopPreview, playingCardId, previewingCardId } = useAudio();

const searchInput = ref('');
const debouncedSearch = useDebounce(searchInput);
const savedSlugs = ref(new Set<string>());
const gridRef = ref<HTMLElement | null>(null);
const showResetConfirm = ref(false);
const resetPendingSlug = ref('');
let resizeObserver: ResizeObserver | null = null;

function calculateTargetCount(): number {
  const el = gridRef.value;
  if (!el) return BROWSE_MIN_PAGE_SIZE;

  const width = el.clientWidth;
  const columns = Math.max(1, Math.floor(width / BROWSE_MIN_CARD_WIDTH));
  const availableHeight = window.innerHeight - el.getBoundingClientRect().top;
  const rows = Math.max(1, Math.ceil(availableHeight / BROWSE_ESTIMATED_CARD_HEIGHT));
  return Math.max(BROWSE_MIN_PAGE_SIZE, columns * rows);
}

watch(debouncedSearch, async (q) => {
  const trimmed = q.trim();
  if (trimmed) {
    await browseStore.search(trimmed);
    await nextTick();
    const target = calculateTargetCount();
    browseStore.loadUntilFilled(target);
  } else {
    browseStore.clear();
  }
});

function onResize() {
  if (browseStore.results.length > 0 && browseStore.nextUrl && !browseStore.loading) {
    const target = calculateTargetCount();
    if (browseStore.results.length < target) {
      browseStore.loadUntilFilled(target);
    }
  }
}

onMounted(() => {
  if (gridRef.value) {
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(gridRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

async function onPlay(soundUrl: string, slug: string, name: string) {
  await playRouted(soundUrl, slug, name);
}

function onPreview(soundUrl: string, slug: string, name: string) {
  preview(soundUrl, slug, name);
}

function isInLibrary(slug: string): boolean {
  return libraryStore.slugSet.has(slug);
}

async function onSave(name: string, url: string, slug: string) {
  savedSlugs.value.add(slug);
  try {
    await libraryStore.save(name, url, slug);
  } catch {
    savedSlugs.value.delete(slug);
  }
}

function onResetRequest(slug: string) {
  resetPendingSlug.value = slug;
  showResetConfirm.value = true;
}

async function onResetConfirm() {
  showResetConfirm.value = false;
  const id = libraryStore.getIdBySlug(resetPendingSlug.value);
  if (id) {
    await libraryStore.reset(id);
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
      <div class="search-input-wrapper">
        <AppIcon name="search" :size="16" class="search-icon" />
        <input
          v-model="searchInput"
          type="text"
          :placeholder="t('browse.searchPlaceholder')"
          autocomplete="off"
        >
      </div>
    </div>

    <div ref="gridRef" class="sound-grid">
      <SoundCard
        v-for="item in browseStore.results"
        :key="item.slug"
        :name="item.name"
        mode="browse"
        :active="playingCardId === item.slug"
        :previewing="previewingCardId === item.slug"
        :saved="savedSlugs.has(item.slug)"
        :in-library="isInLibrary(item.slug)"
        @play="onPlay(item.sound, item.slug, item.name)"
        @preview="onPreview(item.sound, item.slug, item.name)"
        @stop-preview="stopPreview"
        @save="onSave(item.name, item.sound, item.slug)"
        @reset="onResetRequest(item.slug)"
      />
    </div>

    <div v-if="browseStore.error" class="browse-error">
      <AppIcon name="alert-triangle" :size="16" />
      {{ t('browse.error') }}
    </div>

    <div v-if="browseStore.loading" class="browse-status">
      <LoadingBars :size="24" />
      {{ t('browse.searching') }}
    </div>
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

    <ConfirmModal
      :visible="showResetConfirm"
      :title="t('confirm.redownload.title')"
      :message="t('confirm.redownload.message')"
      @confirm="onResetConfirm"
      @cancel="showResetConfirm = false"
    />

    <LoadMoreButton
      v-if="browseStore.nextUrl && !browseStore.autoLoading"
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

.search-input-wrapper {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-input-wrapper input {
  width: 100%;
  padding: 10px 14px 10px 36px;
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input-wrapper input:focus {
  border-color: var(--accent);
}

.search-input-wrapper input::placeholder {
  color: var(--text-tertiary);
}

.sound-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.browse-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: var(--input-radius);
  background: var(--bg-danger);
  color: var(--text-danger);
  font-size: 0.85rem;
}

.browse-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 0;
  color: var(--text-tertiary);
  font-size: 0.85rem;
}
</style>
