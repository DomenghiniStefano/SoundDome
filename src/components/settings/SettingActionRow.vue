<script setup lang="ts">
import SettingRow from './SettingRow.vue';
import AppIcon from '../ui/AppIcon.vue';
import type { IconNameValue } from '../../enums/icons';

defineProps<{
  label: string;
  hint: string;
  actionLabel: string;
  actionIcon?: IconNameValue;
  danger?: boolean;
}>();

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="setting-action-row">
    <SettingRow :label="label" :hint="hint">
      <button
        class="action-btn"
        :class="{ danger }"
        @click="emit('action')"
      >
        <AppIcon v-if="actionIcon" :name="actionIcon" :size="13" />
        {{ actionLabel }}
      </button>
    </SettingRow>
  </div>
</template>

<style scoped>
.setting-action-row {
  background: var(--color-bg-card);
  padding: 14px 18px;
  border-radius: var(--input-radius);
  margin-bottom: 6px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 0;
  min-width: 90px;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.action-btn:active {
  transform: scale(0.97);
}

.action-btn.danger {
  border-color: var(--color-error);
  color: var(--color-error);
}

.action-btn.danger:hover {
  background: var(--color-error);
  color: #fff;
}
</style>
