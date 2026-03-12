<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import SettingSection from './SettingSection.vue';
import SettingActionRow from './SettingActionRow.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';
import ToastNotification from '../ui/ToastNotification.vue';
import { useConfigStore } from '../../stores/config';
import { useLibraryStore } from '../../stores/library';
import { useConfirmDialog } from '../../composables/useConfirmDialog';
import { configExport, importInspect, importExecute } from '../../services/api';
import { ToastType } from '../../enums/ui';
import type { ToastTypeValue } from '../../enums/ui';
import { TOAST_RESET_DELAY } from '../../enums/constants';

const props = defineProps<{
  reloadDevices: () => Promise<void>;
}>();

const { t } = useI18n();
const config = useConfigStore();
const libraryStore = useLibraryStore();
const confirmDialog = useConfirmDialog();

const toastMessage = ref('');
const toastType = ref<ToastTypeValue>(ToastType.INFO);
const pendingImport = ref<ImportPreview | null>(null);

function showToast(message: string, type: ToastTypeValue = ToastType.INFO) {
  toastMessage.value = '';
  setTimeout(() => {
    toastMessage.value = message;
    toastType.value = type;
  }, TOAST_RESET_DELAY);
}

const importConfirmMessage = computed(() => {
  if (!pendingImport.value) return '';
  if (pendingImport.value.type === 'library' && pendingImport.value.library) {
    const { totalSounds, newSounds, groups } = pendingImport.value.library;
    if (newSounds === 0) return t('settings.import.noNewSounds', { totalSounds });
    return t('settings.import.confirmLibrary', { totalSounds, newSounds, groups });
  }
  if (pendingImport.value.type === 'settings' && pendingImport.value.settings) {
    return t('settings.import.confirmSettings', { count: pendingImport.value.settings.count });
  }
  return '';
});

async function runExport(includeBackups: boolean) {
  try {
    const result = await libraryStore.doExport(includeBackups);
    if (result.canceled) return;
    if (result.success) {
      showToast(t('toast.exported', { count: result.count }), ToastType.SUCCESS);
    } else {
      showToast(result.error || t('toast.exportFailed'), ToastType.ERROR);
    }
  } catch (err) {
    showToast(t('toast.exportFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

async function onExport() {
  try {
    const hasBackups = await libraryStore.hasBackups();
    if (hasBackups) {
      confirmDialog.showCustom(
        t('confirm.includeBackups.title'),
        t('confirm.includeBackups.message'),
        [
          { label: t('common.cancel'), event: 'cancel' },
          { label: t('confirm.includeBackups.exclude'), event: 'exclude' },
          { label: t('confirm.includeBackups.include'), event: 'include', variant: 'accent' },
        ],
        {
          include: () => runExport(true),
          exclude: () => runExport(false),
        }
      );
      return;
    }
    await runExport(false);
  } catch (err) {
    showToast(t('toast.exportFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

async function onExportSettings() {
  try {
    const result = await configExport();
    if (result.canceled) return;
    if (result.success) {
      showToast(t('toast.settingsExported'), ToastType.SUCCESS);
    } else {
      showToast(result.error || t('toast.settingsExportFailed'), ToastType.ERROR);
    }
  } catch (err) {
    showToast(t('toast.settingsExportFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

async function onUnifiedImport() {
  try {
    const preview = await importInspect();
    if (!preview) return;
    if (preview.type === 'library' && preview.library && preview.library.newSounds === 0) {
      showToast(t('settings.import.noNewSounds', { totalSounds: preview.library.totalSounds }), ToastType.INFO);
      return;
    }
    pendingImport.value = preview;
  } catch (err) {
    showToast(t('toast.importFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

async function onConfirmImport() {
  if (!pendingImport.value) return;
  const filePath = pendingImport.value.filePath;
  const importType = pendingImport.value.type;
  pendingImport.value = null;

  try {
    const result = await importExecute(filePath);
    if (result.success) {
      if (importType === 'library') {
        await libraryStore.load();
        showToast(t('toast.imported', { added: result.added, total: result.total }), ToastType.SUCCESS);
      } else {
        await config.load();
        await props.reloadDevices();
        showToast(t('toast.settingsImported'), ToastType.SUCCESS);
      }
    } else {
      showToast(result.error || t('toast.importFailed'), ToastType.ERROR);
    }
  } catch (err) {
    showToast(t('toast.importFailed') + ': ' + (err as Error).message, ToastType.ERROR);
  }
}

function onClearLibrary() {
  confirmDialog.show(t('confirm.clearLibrary.title'), t('confirm.clearLibrary.message'), async () => {
    try {
      const count = libraryStore.items.length;
      await libraryStore.clearAll();
      await libraryStore.load();
      showToast(t('toast.deleted', { count }), ToastType.SUCCESS);
    } catch (err) {
      showToast(t('toast.clearFailed') + ': ' + (err as Error).message, ToastType.ERROR);
    }
  });
}

function onResetSettings() {
  confirmDialog.show(t('confirm.resetSettings.title'), t('confirm.resetSettings.message'), async () => {
    await config.resetDefaults();
    await props.reloadDevices();
    showToast(t('toast.resetDone'), ToastType.SUCCESS);
  });
}
</script>

<template>
  <!-- Backup & Restore -->
  <SettingSection :title="t('settings.backup.title')" :tooltip="t('settings.backup.tooltip')">
    <SettingActionRow
      :label="t('settings.backup.exportLibraryLabel')"
      :hint="t('settings.backup.exportLibraryHint')"
      :action-label="t('settings.backup.exportAction')"
      action-icon="download"
      @action="onExport"
    />
    <SettingActionRow
      :label="t('settings.backup.exportSettingsLabel')"
      :hint="t('settings.backup.exportSettingsHint')"
      :action-label="t('settings.backup.exportAction')"
      action-icon="download"
      @action="onExportSettings"
    />
    <SettingActionRow
      :label="t('settings.backup.importLabel')"
      :hint="t('settings.backup.importHint')"
      :action-label="t('settings.backup.importAction')"
      action-icon="upload"
      @action="onUnifiedImport"
    />
  </SettingSection>

  <!-- Danger Zone -->
  <SettingSection :title="t('settings.dangerZone.title')" :tooltip="t('settings.dangerZone.tooltip')">
    <SettingActionRow
      :label="t('settings.dangerZone.clearLabel')"
      :hint="t('settings.dangerZone.clearHint')"
      :action-label="t('settings.dangerZone.clearAction')"
      action-icon="trash"
      danger
      @action="onClearLibrary"
    />
    <SettingActionRow
      :label="t('settings.dangerZone.resetLabel')"
      :hint="t('settings.dangerZone.resetHint')"
      :action-label="t('settings.dangerZone.resetAction')"
      action-icon="history"
      danger
      @action="onResetSettings"
    />
  </SettingSection>

  <ToastNotification :message="toastMessage" :type="toastType" />
  <ConfirmModal
    :visible="!!pendingImport"
    :title="t('settings.import.title')"
    :message="importConfirmMessage"
    @confirm="onConfirmImport"
    @cancel="pendingImport = null"
  />
  <ConfirmModal
    :visible="confirmDialog.visible.value"
    :title="confirmDialog.title.value"
    :message="confirmDialog.message.value"
    :actions="confirmDialog.actions.value"
    @confirm="confirmDialog.confirm"
    @cancel="confirmDialog.cancel"
    @action="confirmDialog.onAction"
  />
</template>
