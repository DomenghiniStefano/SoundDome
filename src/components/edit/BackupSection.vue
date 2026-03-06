<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';
import { ConfirmAction } from '../../enums/ui';
import type { ConfirmActionValue } from '../../enums/ui';

const props = defineProps<{
  name: string;
  backups: BackupItem[];
  restoring: boolean;
}>();

const emit = defineEmits<{
  restore: [timestamp: number];
  delete: [timestamp: number];
  deleteAll: [];
}>();

const { t } = useI18n();
const expanded = ref(false);
const confirmVisible = ref(false);
const confirmAction = ref<ConfirmActionValue>(ConfirmAction.SINGLE);
const pendingTimestamp = ref(0);

function askDeleteSingle(timestamp: number) {
  pendingTimestamp.value = timestamp;
  confirmAction.value = ConfirmAction.SINGLE;
  confirmVisible.value = true;
}

function askDeleteAll() {
  confirmAction.value = ConfirmAction.ALL;
  confirmVisible.value = true;
}

function onConfirm() {
  confirmVisible.value = false;
  if (confirmAction.value === ConfirmAction.SINGLE) {
    emit('delete', pendingTimestamp.value);
  } else {
    emit('deleteAll');
  }
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  return `${date} ${time}`;
}
</script>

<template>
  <section class="edit-section backup-section">
    <button class="backup-section-toggle" @click="expanded = !expanded">
      <div class="edit-section-header">
        <AppIcon name="history" :size="16" />
        <span>{{ t('editSound.backups') }}</span>
        <span v-if="backups.length > 0" class="backup-section-count">{{ backups.length }}</span>
      </div>
      <AppIcon
        name="play"
        :size="10"
        class="backup-section-chevron"
        :class="{ expanded }"
      />
    </button>

    <div v-if="expanded" class="backup-section-body">
      <div v-if="backups.length === 0" class="backup-section-empty">
        {{ t('editSound.noBackups') }}
      </div>
      <template v-else>
        <div class="backup-section-list">
          <div
            v-for="backup in backups"
            :key="backup.timestamp"
            class="backup-item"
          >
            <span class="backup-item-date">{{ formatDate(backup.timestamp) }}</span>
            <div class="backup-item-actions">
              <button
                class="backup-item-btn"
                :disabled="restoring"
                @click="emit('restore', backup.timestamp)"
              >
                {{ t('editSound.useBackup') }}
              </button>
              <button
                class="backup-item-delete"
                :disabled="restoring"
                @click="askDeleteSingle(backup.timestamp)"
              >
                <AppIcon name="trash" :size="12" />
              </button>
            </div>
          </div>
        </div>
        <button
          class="backup-delete-all"
          :disabled="restoring"
          @click="askDeleteAll"
        >
          <AppIcon name="trash" :size="12" />
          {{ t('editSound.deleteAllBackups') }}
        </button>
      </template>
    </div>

    <ConfirmModal
      :visible="confirmVisible"
      :title="confirmAction === ConfirmAction.ALL ? t('confirm.deleteAllBackups.title') : t('confirm.deleteBackup.title')"
      :message="confirmAction === ConfirmAction.ALL ? t('confirm.deleteAllBackups.message', { name: props.name }) : t('confirm.deleteBackup.message', { name: props.name, date: formatDate(pendingTimestamp) })"
      @confirm="onConfirm"
      @cancel="confirmVisible = false"
    />
  </section>
</template>

<style scoped>
.edit-section {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  padding: 16px 20px;
}

.backup-section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
}

.edit-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-white, #fff);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.edit-section-header svg {
  color: var(--color-accent);
}

.backup-section-count {
  font-size: 0.65rem;
  background: var(--color-accent);
  color: #000;
  border-radius: 10px;
  padding: 1px 7px;
  font-weight: 700;
}

.backup-section-chevron {
  color: var(--color-text-dimmer);
  transition: transform 0.2s;
  transform: rotate(90deg);
}

.backup-section-chevron.expanded {
  transform: rotate(-90deg);
}

.backup-section-body {
  margin-top: 14px;
}

.backup-section-empty {
  font-size: 0.75rem;
  color: var(--color-text-dimmer);
}

.backup-section-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.backup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-bg, #121212);
  border-radius: 6px;
}

.backup-item-date {
  font-size: 0.75rem;
  color: var(--color-text-dimmer);
  font-family: monospace;
}

.backup-item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.backup-item-btn {
  border: none;
  background: var(--color-bg-card-hover);
  color: var(--color-text-white, #fff);
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  transition: background 0.15s;
}

.backup-item-btn:hover:not(:disabled) {
  background: var(--color-accent);
  color: #000;
}

.backup-item-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.backup-item-delete {
  border: none;
  background: none;
  color: var(--color-error);
  opacity: 0.45;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: opacity 0.15s, background 0.15s;
}

.backup-item-delete:hover:not(:disabled) {
  opacity: 1;
  background: rgba(231, 76, 60, 0.1);
}

.backup-item-delete:disabled {
  opacity: 0.4;
  cursor: default;
}

.backup-delete-all {
  border: none;
  background: none;
  color: var(--color-error);
  opacity: 0.45;
  cursor: pointer;
  padding: 6px 0;
  margin-top: 8px;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s;
}

.backup-delete-all:hover:not(:disabled) {
  opacity: 1;
}

.backup-delete-all:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
