<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import AppIcon from '../ui/AppIcon.vue';
import AppLogo from '../ui/AppLogo.vue';
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
      <AppLogo :height="18" class="titlebar-logo" />
    </div>
    <div class="titlebar-controls">
      <button
        class="titlebar-btn"
        :class="{ 'titlebar-btn-active': isWidgetOpen }"
        @click="toggleWidget"
        aria-label="Widget"
        v-tooltip="'Widget'"
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
  background: var(--bg-secondary);
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

.titlebar-logo {
  height: 18px;
  object-fit: contain;
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
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.titlebar-btn:hover {
  background: var(--bg-surface-active);
  color: var(--text-primary);
}

.titlebar-btn-active {
  color: var(--accent);
}

.titlebar-btn-close:hover {
  background: var(--titlebar-close-bg);
  color: var(--titlebar-close-text);
}
</style>
