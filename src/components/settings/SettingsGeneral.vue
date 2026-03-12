<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import SettingSection from './SettingSection.vue';
import SettingActionRow from './SettingActionRow.vue';
import SwitchToggle from '../ui/SwitchToggle.vue';
import DeviceSelect from './DeviceSelect.vue';
import IconButton from '../ui/IconButton.vue';
import SettingRow from './SettingRow.vue';
import HotkeyModal from '../cards/HotkeyModal.vue';
import { useConfigStore } from '../../stores/config';
import { useUsedHotkeys } from '../../composables/useUsedHotkeys';
import {
  getAutoLaunch, setAutoLaunch,
  onUpdateAvailable, onUpdateNotAvailable, onUpdateDownloaded, onUpdateError, onUpdateProgress,
  removeUpdateListeners, updateCheck, updateInstall
} from '../../services/api';
import { UpdateStatus } from '../../enums/ui';
import type { UpdateStatusValue } from '../../enums/ui';

const { t } = useI18n();
const config = useConfigStore();

const autoLaunch = ref(false);
const showStopHotkeyModal = ref(false);
const { usedHotkeys } = useUsedHotkeys();

const updateStatus = ref<UpdateStatusValue>(UpdateStatus.IDLE);
const updateVersion = ref('');
const updatePercent = ref(0);

const updateHint = computed(() => {
  switch (updateStatus.value) {
    case UpdateStatus.CHECKING:
      return t('update.checking');
    case UpdateStatus.AVAILABLE:
      return t('update.available', { version: updateVersion.value });
    case UpdateStatus.DOWNLOADING:
      return t('update.downloading', { percent: updatePercent.value });
    case UpdateStatus.READY:
      return t('update.ready', { version: updateVersion.value });
    case UpdateStatus.UP_TO_DATE:
      return t('update.upToDate');
    case UpdateStatus.ERROR:
      return t('update.error');
    case UpdateStatus.DEV_SKIP:
      return t('update.devSkip');
    default:
      return t('update.checkHint', { version: APP_VERSION });
  }
});

const updateActionLabel = computed(() => {
  if (updateStatus.value === UpdateStatus.READY) return t('update.install');
  return t('update.checkAction');
});

const isUpdateBusy = computed(() =>
  updateStatus.value === UpdateStatus.CHECKING || updateStatus.value === UpdateStatus.DOWNLOADING
);

async function onUpdateAction() {
  if (updateStatus.value === UpdateStatus.READY) {
    updateInstall();
    return;
  }
  updateStatus.value = UpdateStatus.CHECKING;
  const result = await updateCheck();
  if (result?.devSkip) {
    updateStatus.value = UpdateStatus.DEV_SKIP;
  }
}

async function onToggleAutoLaunch(value: boolean) {
  await setAutoLaunch(value);
  autoLaunch.value = value;
}

onMounted(async () => {
  autoLaunch.value = await getAutoLaunch();

  onUpdateAvailable((data) => {
    updateVersion.value = data.version;
    updateStatus.value = UpdateStatus.AVAILABLE;
  });
  onUpdateNotAvailable(() => {
    updateStatus.value = UpdateStatus.UP_TO_DATE;
  });
  onUpdateProgress((data) => {
    updatePercent.value = data.percent;
    updateStatus.value = UpdateStatus.DOWNLOADING;
  });
  onUpdateDownloaded((data) => {
    updateVersion.value = data.version;
    updateStatus.value = UpdateStatus.READY;
  });
  onUpdateError(() => {
    updateStatus.value = UpdateStatus.ERROR;
  });
});

onUnmounted(() => {
  removeUpdateListeners();
});
</script>

<template>
  <!-- Language -->
  <SettingSection :title="t('settings.language.title')">
    <DeviceSelect
      v-model="config.locale"
      :label="t('settings.language.label')"
      :options="[{ value: 'en', label: 'English' }, { value: 'it', label: 'Italiano' }]"
      hide-default
    />
  </SettingSection>

  <!-- Hotkeys -->
  <SettingSection :title="t('settingsHotkeys.title')" :tooltip="t('settingsHotkeys.tooltip')">
    <SettingRow :label="t('settingsHotkeys.stopLabel')" :hint="t('settingsHotkeys.stopHint')">
      <IconButton
        icon="keyboard"
        :label="config.stopHotkey ?? t('settingsHotkeys.none')"
        :size="12"
        :active="!!config.stopHotkey"
        class="hotkey-set-btn"
        @click="showStopHotkeyModal = true"
      />
    </SettingRow>
    <HotkeyModal
      :visible="showStopHotkeyModal"
      :name="t('settingsHotkeys.stopLabel')"
      :hotkey="config.stopHotkey"
      :used-hotkeys="usedHotkeys"
      @close="showStopHotkeyModal = false"
      @update:hotkey="(v: string | null) => { config.stopHotkey = v; showStopHotkeyModal = false; }"
    />
  </SettingSection>

  <!-- Startup -->
  <SettingSection :title="t('settings.startup.title')" :tooltip="t('settings.startup.tooltip')">
    <SettingRow :label="t('settings.startup.label')" :hint="t('settings.startup.hint')">
      <SwitchToggle :modelValue="autoLaunch" @update:modelValue="onToggleAutoLaunch" />
    </SettingRow>
  </SettingSection>

  <!-- Updates -->
  <SettingSection :title="t('update.title')" :tooltip="t('update.tooltip')">
    <SettingActionRow
      :label="t('update.checkLabel')"
      :hint="updateHint"
      :action-label="updateActionLabel"
      :action-icon="updateStatus === 'ready' ? 'download' : 'cloud'"
      @action="onUpdateAction"
    />
    <div v-if="updateStatus === 'downloading'" class="update-progress">
      <div class="update-progress-bar" :style="{ width: updatePercent + '%' }" />
    </div>
  </SettingSection>
</template>

<style scoped>
.hotkey-set-btn {
  font-family: monospace;
}

.update-progress {
  height: 4px;
  background: var(--bg-input);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.update-progress-bar {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}
</style>
