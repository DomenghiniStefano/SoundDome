<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '../components/layout/PageHeader.vue';
import SettingsGeneral from '../components/settings/SettingsGeneral.vue';
import SettingsAudio from '../components/settings/SettingsAudio.vue';
import SettingsData from '../components/settings/SettingsData.vue';
import SettingsTheme from '../components/settings/SettingsTheme.vue';
import { useConfigStore } from '../stores/config';
import { SettingsTab } from '../enums/settings';
import type { SettingsTabValue } from '../enums/settings';

const { t } = useI18n();
const config = useConfigStore();

const activeTab = ref<SettingsTabValue>(SettingsTab.GENERAL);
const audioRef = ref<InstanceType<typeof SettingsAudio> | null>(null);

const tabs = [
  { key: SettingsTab.GENERAL, icon: 'settings' },
  { key: SettingsTab.AUDIO, icon: 'headphones' },
  { key: SettingsTab.DATA, icon: 'download' },
  { key: SettingsTab.THEME, icon: 'sun' },
] as const;

async function reloadDevices() {
  if (audioRef.value) {
    await audioRef.value.loadDevicesAndDetectVirtualMic();
  }
}

// Auto-save config on changes
watch(
  () => [
    config.sendToSpeakers,
    config.sendToVirtualMic,
    config.speakerDeviceId,
    config.virtualMicDeviceId,
    config.soundboardVolume,
    config.monitorVolume,
    config.micDeviceId,
    config.micVolume,
    config.enableMicPassthrough,
    config.enableMicMonitor,
    config.locale,
    config.stopHotkey,
    config.enableCompressor,
    config.theme,
    config.customThemes,
  ],
  () => {
    config.save();
  }
);
</script>

<template>
  <div class="page">
    <PageHeader :title="t('settings.title')" :subtitle="t('settings.subtitle')" />

    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ t(`settings.tabs.${tab.key}`) }}
      </button>
    </div>

    <div class="tab-content">
      <SettingsGeneral v-if="activeTab === SettingsTab.GENERAL" />
      <SettingsAudio v-if="activeTab === SettingsTab.AUDIO" ref="audioRef" />
      <SettingsData v-if="activeTab === SettingsTab.DATA" :reload-devices="reloadDevices" />
      <SettingsTheme v-if="activeTab === SettingsTab.THEME" />
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--page-padding);
}

.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-default);
  padding-bottom: 0;
}

.tab-btn {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  font-family: var(--font-family);
  margin-bottom: -1px;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
</style>
