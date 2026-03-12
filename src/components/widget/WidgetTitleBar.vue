<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import AppLogo from '../ui/AppLogo.vue';
import { widgetClose, widgetToggle } from '../../services/api';

const { t } = useI18n();

async function showMainApp() {
  await widgetToggle();
}
</script>

<template>
  <div class="widget-titlebar">
    <div class="widget-drag">
      <AppLogo :height="16" class="widget-logo" />
    </div>
    <div class="widget-controls">
      <button class="widget-btn" @click="showMainApp" v-tooltip="t('widget.openMain')">
        <AppIcon name="window-restore" :size="10" />
      </button>
      <button class="widget-btn widget-btn-close" @click="widgetClose" v-tooltip="t('widget.close')">
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
  background: var(--bg-secondary);
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

.widget-logo {
  height: 16px;
  object-fit: contain;
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
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.widget-btn:hover {
  background: var(--bg-surface-active);
  color: var(--text-primary);
}

.widget-btn-close:hover {
  background: var(--titlebar-close-bg);
  color: var(--titlebar-close-text);
}
</style>
