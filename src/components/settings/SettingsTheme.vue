<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import _ from 'lodash';
import SettingSection from './SettingSection.vue';
import ThemeCard from './ThemeCard.vue';
import ThemeEditorModal from './ThemeEditorModal.vue';
import DropdownMenu from '../ui/DropdownMenu.vue';
import AppIcon from '../ui/AppIcon.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';
import ToastNotification from '../ui/ToastNotification.vue';
import { useConfigStore } from '../../stores/config';
import { useConfirmDialog } from '../../composables/useConfirmDialog';
import { useToast } from '../../composables/useToast';
import { Theme, isCustomTheme, makeCustomThemeValue } from '../../enums/settings';
import { IconName } from '../../enums/icons';
import { ToastType } from '../../enums/ui';
import { darken, resolveThemePreviewColors } from '../../utils/color';
import { themeExport, themeImport } from '../../services/api';

const { t } = useI18n();
const config = useConfigStore();
const confirmDialog = useConfirmDialog();
const { toastMessage, toastType, showToast } = useToast();
const editorVisible = ref(false);
const editingTheme = ref<CustomThemeData | null>(null);

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
  const exportData = _.map(config.customThemes, (theme) => _.pick(theme, THEME_EXPORT_FIELDS));
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
  <div class="theme-actions">
    <button class="theme-action-btn" @click="importTheme" v-tooltip="t('settings.theme.importThemeTooltip')">
      <AppIcon :name="IconName.DOWNLOAD" :size="13" />
      {{ t('settings.theme.importTheme') }}
    </button>
    <button class="theme-action-btn" @click="exportAllThemes" :disabled="_.isEmpty(config.customThemes)" v-tooltip="t('settings.theme.exportAllThemesTooltip')">
      <AppIcon :name="IconName.UPLOAD" :size="13" />
      {{ t('settings.theme.exportAllThemes') }}
    </button>
  </div>

  <SettingSection :title="t('settings.theme.title')">
    <div class="theme-grid">
      <!-- Default themes (not editable/deletable) -->
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

      <!-- Custom themes (with kebab menu) -->
      <ThemeCard
        v-for="theme in config.customThemes"
        :key="theme.id"
        :colors="getPreviewColors(theme)"
        :label="theme.name"
        :selected="isCustomTheme(config.theme) && config.theme === makeCustomThemeValue(theme.id)"
        @click="selectCustom(theme)"
        @dblclick="openEditEditor(theme)"
      >
        <template #actions>
          <DropdownMenu v-slot="{ close }">
            <button class="theme-menu-item" @click="openEditEditor(theme); close()">
              <AppIcon :name="IconName.EDIT" :size="14" />
              {{ t('settings.theme.editCustom') }}
            </button>
            <button class="theme-menu-item" @click="exportSingleTheme(theme); close()">
              <AppIcon :name="IconName.UPLOAD" :size="14" />
              {{ t('settings.theme.exportTheme') }}
            </button>
            <div class="theme-menu-divider" />
            <button class="theme-menu-item danger" @click="deleteCustomTheme(theme); close()">
              <AppIcon :name="IconName.TRASH" :size="14" />
              {{ t('settings.theme.deleteCustom') }}
            </button>
          </DropdownMenu>
        </template>
      </ThemeCard>

      <!-- Add new theme -->
      <button class="add-card" @click="openCreateEditor">
        <div class="add-icon">+</div>
        <span class="add-label">{{ t('settings.theme.addCustom') }}</span>
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
.theme-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.theme-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 500;
  font-family: var(--font-family);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.theme-action-btn:hover:not(:disabled) {
  background: var(--bg-card-hover);
  border-color: var(--text-tertiary);
  color: var(--text-primary);
}

.theme-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.theme-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.theme-menu-item {
  width: 100%;
  border: none;
  background: none;
  color: var(--text-primary);
  padding: 8px 14px;
  font-size: 0.8rem;
  font-family: var(--font-family);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.1s;
}

.theme-menu-item:hover {
  background: var(--bg-card-hover);
  color: var(--text-inverse);
}

.theme-menu-item svg {
  width: 16px;
  height: 16px;
  min-width: 16px;
}

.theme-menu-item.danger {
  color: var(--color-error);
}

.theme-menu-item.danger:hover {
  background: var(--color-error-subtle);
}

.theme-menu-divider {
  height: 1px;
  background: var(--border-default);
  margin: 4px 0;
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

</style>
