<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import TitleBar from './components/layout/TitleBar.vue';
import AppSidebar from './components/layout/AppSidebar.vue';
import NowPlaying from './components/layout/NowPlaying.vue';
import { useConfigStore } from './stores/config';
import { RoutePath } from './enums/routes';
import { useMicMixer } from './composables/useMicMixer';
import { useHotkeyListener } from './composables/useHotkeyListener';
import { useAudio } from './composables/useAudio';
import { useStreamDeckListener } from './composables/useStreamDeckListener';

const route = useRoute();
const isWidget = computed(() => route.path === RoutePath.WIDGET);
const isSplash = computed(() => route.path === RoutePath.SPLASH);

const config = useConfigStore();
const { startMic } = useMicMixer();
const { startPlaybackSync, stopPlaybackSync } = useAudio();
const { locale } = useI18n();

useHotkeyListener();
useStreamDeckListener();

onMounted(async () => {
  await config.load();
  locale.value = config.locale;
  startPlaybackSync();
  if (config.enableMicPassthrough) {
    await startMic();
  }
});

onUnmounted(() => {
  stopPlaybackSync();
});

watch(() => config.locale, (val) => {
  locale.value = val;
});
</script>

<template>
  <template v-if="isWidget || isSplash">
    <router-view />
  </template>
  <template v-else>
    <TitleBar />
    <div class="app-body">
      <AppSidebar />
      <div class="main-content">
        <router-view />
      </div>
    </div>
    <NowPlaying />
  </template>
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
