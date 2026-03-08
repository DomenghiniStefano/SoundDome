<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import WidgetTitleBar from '../components/widget/WidgetTitleBar.vue';
import WidgetGrid from '../components/widget/WidgetGrid.vue';
import { useLibraryStore } from '../stores/library';
import { useConfigStore } from '../stores/config';
import { useHotkeyListener } from '../composables/useHotkeyListener';
import { useAudio } from '../composables/useAudio';

const config = useConfigStore();
const libraryStore = useLibraryStore();
const { startPlaybackSync, stopPlaybackSync } = useAudio();

useHotkeyListener();

onMounted(async () => {
  await config.load();
  await libraryStore.load();
  libraryStore.startListening();
  config.startListening();
  startPlaybackSync();
});

onUnmounted(() => {
  libraryStore.stopListening();
  config.stopListening();
  stopPlaybackSync();
});
</script>

<template>
  <div class="widget">
    <WidgetTitleBar />
    <WidgetGrid />
  </div>
</template>

<style scoped>
.widget {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg);
  overflow: hidden;
}
</style>
