<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import TitleBar from './components/layout/TitleBar.vue';
import AppSidebar from './components/layout/AppSidebar.vue';
import NowPlaying from './components/layout/NowPlaying.vue';
import _ from 'lodash';
import { useConfigStore } from './stores/config';
import { RoutePath } from './enums/routes';
import { Theme, isCustomTheme, getCustomThemeId } from './enums/settings';
import { buildCustomThemeVars, clearCustomThemeVars } from './utils/color';
import { useMicMixer } from './composables/useMicMixer';
import { useHotkeyListener } from './composables/useHotkeyListener';
import { useAudio } from './composables/useAudio';
import { useStreamDeckListener } from './composables/useStreamDeckListener';
import { useDevices, isVirtualAudioDevice } from './composables/useDevices';

const route = useRoute();
const isWidget = computed(() => route.path === RoutePath.WIDGET);
const isSplash = computed(() => route.path === RoutePath.SPLASH);

const config = useConfigStore();
const { startMic } = useMicMixer();
const { startPlaybackSync, stopPlaybackSync } = useAudio();
const { locale } = useI18n();
const { enumerateOutputDevices } = useDevices();

useHotkeyListener();
useStreamDeckListener();

const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(theme: string) {
  clearCustomThemeVars();
  if (isCustomTheme(theme)) {
    const customTheme = _.find(config.customThemes, { id: getCustomThemeId(theme) });
    if (customTheme) {
      document.documentElement.setAttribute('data-theme', customTheme.base);
      const vars = buildCustomThemeVars(customTheme);
      _.forOwn(vars, (val, key) => document.documentElement.style.setProperty(key, val));
    } else {
      document.documentElement.setAttribute('data-theme', Theme.DARK);
    }
  } else if (theme === Theme.SYSTEM) {
    document.documentElement.setAttribute('data-theme', systemDarkQuery.matches ? Theme.DARK : Theme.LIGHT);
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function onSystemThemeChange() {
  if (config.theme === Theme.SYSTEM) {
    applyTheme(Theme.SYSTEM);
  }
}

systemDarkQuery.addEventListener('change', onSystemThemeChange);

async function validateVirtualMicDevice() {
  const devices = await enumerateOutputDevices();
  // Check if saved virtualMicDeviceId still exists
  if (config.virtualMicDeviceId) {
    const found = _.find(devices, { deviceId: config.virtualMicDeviceId });
    if (!found) {
      // Stale ID — try to re-detect
      const virtualMic = _.find(devices, d => isVirtualAudioDevice(d.label));
      config.virtualMicDeviceId = virtualMic ? virtualMic.deviceId : '';
      if (virtualMic) await config.save();
    }
  } else {
    // No device set — auto-detect
    const virtualMic = _.find(devices, d => isVirtualAudioDevice(d.label));
    if (virtualMic) {
      config.virtualMicDeviceId = virtualMic.deviceId;
      await config.save();
    }
  }
}

onMounted(async () => {
  await config.load();
  locale.value = config.locale;
  applyTheme(config.theme);
  startPlaybackSync();
  await validateVirtualMicDevice();
  if (config.enableMicPassthrough) {
    await startMic();
  }
});

onUnmounted(() => {
  stopPlaybackSync();
  systemDarkQuery.removeEventListener('change', onSystemThemeChange);
});

watch(() => config.locale, (val) => {
  locale.value = val;
});

watch(() => config.theme, (val) => {
  applyTheme(val);
});

watch(() => config.customThemes, () => {
  if (isCustomTheme(config.theme)) {
    applyTheme(config.theme);
  }
}, { deep: true });
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
  background: var(--bg-primary);
}
</style>
