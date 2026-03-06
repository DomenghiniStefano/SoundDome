<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import { useConfigStore } from '../../stores/config';
import { useAudio } from '../../composables/useAudio';
import { widgetClose, widgetToggle } from '../../services/api';

const { t } = useI18n();
const config = useConfigStore();
const { playingCardId, stopPlayback } = useAudio();

async function showMainApp() {
  await widgetToggle();
}
</script>

<template>
  <div class="widget-titlebar">
    <div class="widget-drag">
      <span class="widget-title">SoundDome</span>
    </div>
    <div class="widget-controls">
      <button
        v-if="playingCardId"
        class="widget-btn widget-btn-stop"
        @click="stopPlayback"
        :title="config.stopHotkey ? `Stop (${config.stopHotkey})` : 'Stop'"
      >
        <AppIcon name="stop" :size="10" />
        <span v-if="config.stopHotkey" class="widget-btn-hotkey">{{ config.stopHotkey }}</span>
      </button>
      <button class="widget-btn" @click="showMainApp" :title="t('widget.openMain')">
        <AppIcon name="window-restore" :size="10" />
      </button>
      <button class="widget-btn widget-btn-close" @click="widgetClose" :title="t('widget.close')">
        <AppIcon name="close" :size="10" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.widget-titlebar {
  display: flex;
  align-items: center;
  height: 28px;
  background: var(--color-bg-sidebar);
  flex-shrink: 0;
}

.widget-drag {
  flex: 1;
  -webkit-app-region: drag;
  height: 100%;
  display: flex;
  align-items: center;
  padding-left: 10px;
}

.widget-title {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.widget-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.widget-btn {
  width: 36px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.widget-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.widget-btn-stop {
  gap: 4px;
  padding: 0 8px;
  width: auto;
  color: var(--color-error);
  font-size: 9px;
  font-weight: 600;
}

.widget-btn-stop svg {
  display: block;
  flex-shrink: 0;
}

.widget-btn-stop:hover {
  background: rgba(229, 57, 53, 0.15);
  color: var(--color-error);
}

.widget-btn-hotkey {
  letter-spacing: 0.3px;
  line-height: 10px;
}

.widget-btn-close:hover {
  background: #e81123;
  color: #fff;
}
</style>
