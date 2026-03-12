<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import _ from 'lodash';
import SettingSection from './SettingSection.vue';
import ThemeCard from './ThemeCard.vue';
import ThemeEditorModal from './ThemeEditorModal.vue';
import AppIcon from '../ui/AppIcon.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';
import ToastNotification from '../ui/ToastNotification.vue';
import { useConfigStore } from '../../stores/config';
import { useConfirmDialog } from '../../composables/useConfirmDialog';
import { Theme, isCustomTheme, makeCustomThemeValue } from '../../enums/settings';
import { TOAST_RESET_DELAY } from '../../enums/constants';
import { IconName } from '../../enums/icons';
import { ToastType, type ToastTypeValue } from '../../enums/ui';
import { darken, resolveThemePreviewColors } from '../../utils/color';
import { themeExport, themeImport } from '../../services/api';

const { t } = useI18n();
const config = useConfigStore();
const confirmDialog = useConfirmDialog();
const editorVisible = ref(false);
const editingTheme = ref<CustomThemeData | null>(null);
const toastMessage = ref('');
const toastType = ref<ToastTypeValue>(ToastType.INFO);

function showToast(message: string, type: ToastTypeValue = ToastType.INFO) {
  toastMessage.value = '';
  setTimeout(() => {
    toastMessage.value = message;
    toastType.value = type;
  }, TOAST_RESET_DELAY);
}

const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

const darkPreview = resolveThemePreviewColors(Theme.DARK);
const lightPreview = resolveThemePreviewColors(Theme.LIGHT);

const systemPreviewColors = computed(() => {
  return systemDarkQuery.matches ? darkPreview : lightPreview;
});

function getPreviewColors(theme: CustomThemeData) {
  return {
    bgPrimary: theme.bgPrimary,
    bgSecondary: theme.bgSecondary || darken(theme.bgPrimary, 0.08),
    bgCard: theme.bgCard,
    textPrimary: theme.textPrimary,
    accent: theme.accent,
  };
}

function selectDefault(theme: string) {
  config.theme = theme;
}

function selectCustom(theme: CustomThemeData) {
  config.theme = makeCustomThemeValue(theme.id);
}

function openCreateEditor() {
  editingTheme.value = null;
  editorVisible.value = true;
}

function openEditEditor(theme: CustomThemeData) {
  editingTheme.value = theme;
  editorVisible.value = true;
}

function onEditorSave(theme: CustomThemeData) {
  const idx = _.findIndex(config.customThemes, { id: theme.id });
  if (idx >= 0) {
    config.customThemes.splice(idx, 1, theme);
  } else {
    config.customThemes.push(theme);
  }
  config.theme = makeCustomThemeValue(theme.id);
  editorVisible.value = false;
  config.save();
}

function deleteCustomTheme(theme: CustomThemeData) {
  if (config.theme === makeCustomThemeValue(theme.id)) {
    showToast(t('settings.theme.deleteActiveError'), ToastType.ERROR);
    return;
  }
  confirmDialog.show(
    t('settings.theme.deleteCustom'),
    t('settings.theme.deleteConfirm', { name: theme.name }),
    async () => {
      config.customThemes = _.reject(config.customThemes, { id: theme.id });
      config.save();
    },
  );
}

const THEME_EXPORT_FIELDS = [
  'name', 'base', 'accent', 'bgPrimary', 'bgCard', 'textPrimary',
  'bgSecondary', 'textSecondary', 'borderDefault', 'colorError', 'colorWarning', 'colorInfo',
] as const;

async function exportSingleTheme(theme: CustomThemeData) {
  const exportData = _.pick(theme, THEME_EXPORT_FIELDS);
  await themeExport({ theme: exportData });
}

async function exportAllThemes() {
  if (_.isEmpty(config.customThemes)) return;
  const exportData = _.map(config.customThemes, (t) => _.pick(t, THEME_EXPORT_FIELDS));
  await themeExport({ themes: exportData });
}

async function importTheme() {
  const result = await themeImport();
  if (!result.success || !result.themes) return;
  for (const data of result.themes) {
    const d = data as Record<string, string>;
    if (!d.base || !d.accent || !d.bgPrimary || !d.bgCard || !d.textPrimary) continue;
    const imported: CustomThemeData = {
      id: crypto.randomUUID(),
      name: d.name || t('settings.theme.importedName'),
      base: d.base,
      accent: d.accent,
      bgPrimary: d.bgPrimary,
      bgCard: d.bgCard,
      textPrimary: d.textPrimary,
      bgSecondary: d.bgSecondary || undefined,
      textSecondary: d.textSecondary || undefined,
      borderDefault: d.borderDefault || undefined,
      colorError: d.colorError || undefined,
      colorWarning: d.colorWarning || undefined,
      colorInfo: d.colorInfo || undefined,
    };
    config.customThemes.push(imported);
    config.theme = makeCustomThemeValue(imported.id);
  }
  config.save();
}
</script>

<template>
  <SettingSection :title="t('settings.theme.defaultSection')">
    <div class="theme-grid">
      <ThemeCard
        :colors="darkPreview"
        :label="t('settings.theme.dark')"
        :selected="config.theme === Theme.DARK"
        @click="selectDefault(Theme.DARK)"
      />
      <ThemeCard
        :colors="lightPreview"
        :label="t('settings.theme.light')"
        :selected="config.theme === Theme.LIGHT"
        @click="selectDefault(Theme.LIGHT)"
      />
      <ThemeCard
        :colors="systemPreviewColors"
        :label="t('settings.theme.system')"
        :selected="config.theme === Theme.SYSTEM"
        @click="selectDefault(Theme.SYSTEM)"
      />
    </div>
  </SettingSection>

  <SettingSection :title="t('settings.theme.customSection')">
    <div class="theme-grid">
      <div
        v-for="theme in config.customThemes"
        :key="theme.id"
        class="custom-card-wrapper"
      >
        <ThemeCard
          :colors="getPreviewColors(theme)"
          :label="theme.name"
          :selected="isCustomTheme(config.theme) && config.theme === makeCustomThemeValue(theme.id)"
          @click="selectCustom(theme)"
        />
        <div class="custom-actions">
          <button class="icon-btn" :title="t('settings.theme.editCustom')" @click="openEditEditor(theme)">
            <AppIcon :name="IconName.EDIT" :size="13" />
          </button>
          <button class="icon-btn" :title="t('settings.theme.exportTheme')" @click="exportSingleTheme(theme)">
            <AppIcon :name="IconName.UPLOAD" :size="13" />
          </button>
          <button class="icon-btn danger" :title="t('settings.theme.deleteCustom')" @click="deleteCustomTheme(theme)">
            <AppIcon :name="IconName.TRASH" :size="13" />
          </button>
        </div>
      </div>

      <button class="add-card" @click="openCreateEditor">
        <div class="add-icon">+</div>
        <span class="add-label">{{ t('settings.theme.addCustom') }}</span>
      </button>
    </div>

    <div class="import-row">
      <button class="import-btn" @click="importTheme">
        <AppIcon :name="IconName.DOWNLOAD" :size="13" />
        {{ t('settings.theme.importTheme') }}
      </button>
      <button v-if="!_.isEmpty(config.customThemes)" class="import-btn" @click="exportAllThemes">
        <AppIcon :name="IconName.UPLOAD" :size="13" />
        {{ t('settings.theme.exportAllThemes') }}
      </button>
    </div>
  </SettingSection>

  <ThemeEditorModal
    :visible="editorVisible"
    :initial-theme="editingTheme"
    @close="editorVisible = false"
    @save="onEditorSave"
  />

  <ConfirmModal
    :visible="confirmDialog.visible.value"
    :title="confirmDialog.title.value"
    :message="confirmDialog.message.value"
    @confirm="confirmDialog.confirm"
    @cancel="confirmDialog.cancel"
  />

  <ToastNotification :message="toastMessage" :type="toastType" />
</template>

<style scoped>
.theme-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.custom-card-wrapper {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.custom-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  align-items: center;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  height: 26px;
  justify-content: center;
  padding: 0;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  width: 26px;
}

.icon-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.icon-btn.danger:hover {
  background: var(--color-error-subtle);
  border-color: var(--color-error);
  color: var(--color-error);
}

.add-card {
  align-items: center;
  background: none;
  border: 2px dashed var(--border-default);
  border-radius: var(--card-radius);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font-family: var(--font-family);
  gap: 8px;
  height: 132px;
  justify-content: center;
  transition: background 0.2s, border-color 0.2s;
  width: 140px;
}

.add-card:hover {
  background: var(--accent-subtle);
  border-color: var(--accent);
}

.add-icon {
  color: var(--text-tertiary);
  font-size: 1.8rem;
  font-weight: 300;
  line-height: 1;
}

.add-card:hover .add-icon {
  color: var(--accent);
}

.add-label {
  color: var(--text-tertiary);
  font-size: 0.78rem;
  font-weight: 500;
}

.add-card:hover .add-label {
  color: var(--accent);
}

.import-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.import-btn {
  align-items: center;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  font-family: var(--font-family);
  font-size: 0.78rem;
  font-weight: 500;
  gap: 6px;
  padding: 6px 14px;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.import-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--text-tertiary);
  color: var(--text-primary);
}
</style>
