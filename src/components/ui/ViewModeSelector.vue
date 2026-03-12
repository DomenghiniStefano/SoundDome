<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppIcon from './AppIcon.vue';
import { LibraryViewMode, VIEW_MODES } from '../../enums/library';
import type { LibraryViewModeValue } from '../../enums/library';
import { IconName } from '../../enums/icons';

defineProps<{
  viewMode: LibraryViewModeValue;
  hideNames: boolean;
  iconSize?: number;
}>();

const emit = defineEmits<{
  'update:viewMode': [mode: LibraryViewModeValue];
  'update:hideNames': [value: boolean];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="view-controls">
    <button
      v-if="viewMode !== LibraryViewMode.LIST"
      class="view-mode-btn"
      :class="{ active: hideNames }"
      v-tooltip="hideNames ? t('library.showNames') : t('library.hideNames')"
      @click="emit('update:hideNames', !hideNames)"
    >
      <AppIcon :name="hideNames ? IconName.EYE_OFF : IconName.EYE" :size="iconSize ?? 14" />
    </button>
    <div class="view-modes">
      <button
        v-for="vm in VIEW_MODES"
        :key="vm.mode"
        class="view-mode-btn"
        :class="{ active: viewMode === vm.mode }"
        v-tooltip="t(vm.labelKey)"
        @click="emit('update:viewMode', vm.mode)"
      >
        <AppIcon :name="vm.icon" :size="iconSize ?? 14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.view-controls {
  display: flex;
  align-items: stretch;
  gap: 4px;
}

.view-modes {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  overflow: hidden;
}

.view-mode-btn {
  border: none;
  background: var(--bg-card);
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.view-modes .view-mode-btn + .view-mode-btn {
  border-left: 1px solid var(--border-default);
}

.view-mode-btn:hover {
  color: var(--text-inverse);
}

.view-mode-btn.active {
  color: var(--accent);
  background: var(--accent-subtle);
}

.view-controls > .view-mode-btn {
  border: 1px solid var(--border-default);
  border-radius: 6px;
}
</style>
