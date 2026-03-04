<script setup lang="ts">
import { onMounted } from 'vue';
import SoundCard from '../components/SoundCard.vue';
import { useLibraryStore } from '../stores/library';
import { useAudio } from '../composables/useAudio';

const libraryStore = useLibraryStore();
const { playRouted, playingCardId } = useAudio();

onMounted(() => {
  libraryStore.load();
});

async function onPlay(item: LibraryItem) {
  const filePath = await libraryStore.getFilePath(item.filename);
  const fileUrl = `file://${filePath}`;
  await playRouted(fileUrl, item.id);
}

async function onDelete(id: string) {
  await libraryStore.remove(id);
}
</script>

<template>
  <div class="page">
    <h2 class="page-title">My Library</h2>
    <p class="page-subtitle">Your saved sounds</p>

    <div v-if="libraryStore.items.length > 0" class="library-grid">
      <SoundCard
        v-for="item in libraryStore.items"
        :key="item.id"
        :name="item.name"
        mode="library"
        :active="playingCardId === item.id"
        @play="onPlay(item)"
        @delete="onDelete(item.id)"
      />
    </div>

    <div v-else class="placeholder">
      <div class="placeholder-icon">&#9835;</div>
      <p>Your library is empty</p>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--page-padding);
}

.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--color-text-white);
}

.page-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  margin-bottom: 32px;
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: var(--color-text-faint);
}

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.placeholder p {
  font-size: 0.9rem;
}
</style>
