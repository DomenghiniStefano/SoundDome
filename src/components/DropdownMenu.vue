<script setup lang="ts">
import { ref } from 'vue';
import AppIcon from './AppIcon.vue';

const open = ref(false);

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

defineExpose({ close });
</script>

<template>
  <div class="dropdown-menu-wrapper">
    <button
      class="dropdown-trigger"
      :class="{ active: open }"
      @click.stop="toggle"
    >
      <AppIcon name="kebab" />
    </button>
    <div v-if="open" class="dropdown-overlay" @click.stop="close"></div>
    <div v-if="open" class="dropdown-panel" @click.stop>
      <slot :close="close" />
    </div>
  </div>
</template>

<style scoped>
.dropdown-menu-wrapper {
  position: relative;
}

.dropdown-trigger {
  border: none;
  background: none;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
  display: flex;
  align-items: center;
}

.dropdown-trigger.active {
  color: var(--color-text-white);
}

.dropdown-trigger svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9;
}

.dropdown-panel {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border, #333);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 10;
  min-width: 160px;
  overflow: hidden;
}
</style>
