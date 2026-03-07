<script setup lang="ts">
import SettingRow from './SettingRow.vue';

defineProps<{
  label: string;
  hint: string;
  actionLabel: string;
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
  padding: 8px 0;
  width: 90px;
  text-align: center;
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
