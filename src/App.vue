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
import { useDevices, isVirtualAudioDevice, resolveDeviceId } from './composables/useDevices';

const route = useRoute();
const isWidget = computed(() => route.path === RoutePath.WIDGET);
const isSplash = computed(() => route.path === RoutePath.SPLASH);

const config = useConfigStore();
const mixer = useMicMixer();
const { startPlaybackSync, stopPlaybackSync } = useAudio();
const { locale } = useI18n();
const { enumerateOutputDevices, enumerateInputDevices } = useDevices();

useHotkeyListener();
useStreamDeckListener();

async function onDeviceChange() {
  await validateVirtualMicDevice();
  // If mic passthrough is enabled but mic isn't active, retry (device may have come back)
  if (config.enableMicPassthrough && !mixer.isMicActive.value) {
    await mixer.startMic();
  }
}

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
      // Stale ID — try to re-detect by name
      const virtualMic = _.find(devices, d => isVirtualAudioDevice(d.label));
      if (virtualMic) {
        // VB-CABLE found with different ID — update config
        config.virtualMicDeviceId = virtualMic.deviceId;
        await config.save();
      }
      // If VB-CABLE not found at all, keep saved ID for when device comes back
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

async function resolveStaleDevices() {
  const outputDevices = await enumerateOutputDevices();
  const inputDevices = await enumerateInputDevices();
  let changed = false;

  const outputMappings = [
    { idKey: 'speakerDeviceId', labelKey: 'speakerDeviceLabel' },
    { idKey: 'virtualMicDeviceId', labelKey: 'virtualMicDeviceLabel' },
  ] as const;

  for (const { idKey, labelKey } of outputMappings) {
    if (!config[idKey]) continue;
    const resolved = resolveDeviceId(outputDevices, config[idKey], config[labelKey]);
    if (resolved) {
      if (resolved.deviceId !== config[idKey]) { config[idKey] = resolved.deviceId; changed = true; }
      if (resolved.label !== config[labelKey]) { config[labelKey] = resolved.label; changed = true; }
    } else {
      config[idKey] = '';
      config[labelKey] = '';
      changed = true;
    }
  }

  if (config.micDeviceId) {
    const resolved = resolveDeviceId(inputDevices, config.micDeviceId, config.micDeviceLabel);
    if (resolved) {
      if (resolved.deviceId !== config.micDeviceId) { config.micDeviceId = resolved.deviceId; changed = true; }
      if (resolved.label !== config.micDeviceLabel) { config.micDeviceLabel = resolved.label; changed = true; }
    } else {
      config.micDeviceId = '';
      config.micDeviceLabel = '';
      changed = true;
    }
  }

  if (changed) await config.save();
}

onMounted(async () => {
  await config.load();
  locale.value = config.locale;
  applyTheme(config.theme);
  startPlaybackSync();
  await validateVirtualMicDevice();
  await resolveStaleDevices();
  navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
});

onUnmounted(() => {
  stopPlaybackSync();
  systemDarkQuery.removeEventListener('change', onSystemThemeChange);
  navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
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
