<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import TitleBar from './components/layout/TitleBar.vue';
import AppSidebar from './components/layout/AppSidebar.vue';
import NowPlaying from './components/layout/NowPlaying.vue';
import { useConfigStore } from './stores/config';
import { useLibraryStore } from './stores/library';
import { useAudio } from './composables/useAudio';
import { useMicMixer } from './composables/useMicMixer';
import { onHotkeyPlay, removeHotkeyPlayListener, onHotkeyStop, removeHotkeyStopListener } from './services/api';

const config = useConfigStore();
const libraryStore = useLibraryStore();
const { playRouted, stopBrowse, stopAll } = useAudio();
const { startMic } = useMicMixer();
const { locale } = useI18n();

onMounted(async () => {
  await config.load();
  locale.value = config.locale;
  if (config.enableMicPassthrough) {
    await startMic();
  }

  onHotkeyStop(() => {
    stopBrowse();
    stopAll();
  });

  onHotkeyPlay(async (id: string) => {
    const item = libraryStore.items.find(i => i.id === id);
    if (!item) return;
    const filePath = await libraryStore.getFilePath(item.filename);
    const fileUrl = `file://${filePath}`;
    await playRouted(fileUrl, item.id, item.name, { volume: item.volume, useDefault: item.useDefault });
  });
});

onUnmounted(() => {
  removeHotkeyPlayListener();
  removeHotkeyStopListener();
});

watch(() => config.locale, (val) => {
  locale.value = val;
});
</script>

<template>
  <TitleBar />
  <div class="app-body">
    <AppSidebar />
    <div class="main-content">
      <router-view />
    </div>
  </div>
  <NowPlaying />
</template>

<style scoped>
.app-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg);
}
</style>
