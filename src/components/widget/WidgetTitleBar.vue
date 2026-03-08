<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import logoFull from '../../../assets/logo-full.svg';
import { widgetClose, widgetToggle } from '../../services/api';

const { t } = useI18n();

async function showMainApp() {
  await widgetToggle();
}
</script>

<template>
  <div class="widget-titlebar">
    <div class="widget-drag">
      <img :src="logoFull" alt="SoundDome" class="widget-logo" />
    </div>
    <div class="widget-controls">
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

.widget-btn-close:hover {
  background: #e81123;
  color: #fff;
}
</style>
