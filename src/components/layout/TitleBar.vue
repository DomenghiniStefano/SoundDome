<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import AppIcon from '../ui/AppIcon.vue';
import {
  windowMinimize,
  windowMaximize,
  windowClose,
  windowIsMaximized,
  onWindowMaximizeChange,
  removeWindowMaximizeChangeListener,
  widgetToggle,
  widgetIsOpen,
  onWidgetStateChange,
  removeWidgetStateChangeListener
} from '../../services/api';

const isMaximized = ref(false);
const isWidgetOpen = ref(false);

async function toggleWidget() {
  isWidgetOpen.value = await widgetToggle();
}

onMounted(async () => {
  isMaximized.value = await windowIsMaximized();
  isWidgetOpen.value = await widgetIsOpen();
  onWindowMaximizeChange((val) => {
    isMaximized.value = val;
  });
  onWidgetStateChange((val) => {
    isWidgetOpen.value = val;
  });
});

onUnmounted(() => {
  removeWindowMaximizeChangeListener();
  removeWidgetStateChangeListener();
});
</script>

<template>
  <div class="titlebar">
    <div class="titlebar-drag">
      <span class="titlebar-title">SoundDome</span>
    </div>
    <div class="titlebar-controls">
      <button
        class="titlebar-btn"
        :class="{ 'titlebar-btn-active': isWidgetOpen }"
        @click="toggleWidget"
        aria-label="Widget"
        title="Widget"
      >
        <AppIcon name="widget" :size="12" outlined />
      </button>
      <button class="titlebar-btn" @click="windowMinimize" aria-label="Minimize">
        <AppIcon name="window-minimize" :size="10" outlined />
      </button>
      <button class="titlebar-btn" @click="windowMaximize" :aria-label="isMaximized ? 'Restore' : 'Maximize'">
        <AppIcon :name="isMaximized ? 'window-restore' : 'window-maximize'" :size="10" outlined />
      </button>
      <button class="titlebar-btn titlebar-btn-close" @click="windowClose" aria-label="Close">
        <AppIcon name="close" :size="10" outlined />
      </button>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  height: 32px;
  background: var(--color-bg-sidebar);
  flex-shrink: 0;
  z-index: 1000;
}

.titlebar-drag {
  flex: 1;
  -webkit-app-region: drag;
  height: 100%;
  display: flex;
  align-items: center;
  padding-left: 12px;
}

.titlebar-title {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.titlebar-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.titlebar-btn {
  width: 46px;
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

.titlebar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.titlebar-btn-active {
  color: var(--color-accent, #7c5cfc);
}

.titlebar-btn-close:hover {
  background: #e81123;
  color: #fff;
}
</style>
