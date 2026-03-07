<script setup lang="ts">
import { ref } from 'vue';
import _ from 'lodash';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import IconButton from '../ui/IconButton.vue';
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
        <span v-if="!_.isEmpty(backups)" class="backup-section-count">{{ backups.length }}</span>
      </div>
      <AppIcon
        name="play"
        :size="10"
        class="backup-section-chevron"
        :class="{ expanded }"
      />
    </button>

    <div v-if="expanded" class="backup-section-body">
      <div v-if="_.isEmpty(backups)" class="backup-section-empty">
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
              <IconButton
                icon="trash"
                :size="12"
                danger
                compact
                :disabled="restoring"
                @click="askDeleteSingle(backup.timestamp)"
              />
            </div>
          </div>
        </div>
        <IconButton
          icon="trash"
          :size="12"
          :label="t('editSound.deleteAllBackups')"
          danger
          compact
          class="backup-delete-all"
          :disabled="restoring"
          @click="askDeleteAll"
        />
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

<style src="../../styles/edit-section.css"></style>

<style scoped>
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
  margin-bottom: 0;
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

.backup-delete-all {
  margin-top: 8px;
}
</style>
