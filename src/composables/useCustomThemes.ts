import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import _ from 'lodash';
import { useConfigStore } from '../stores/config';
import { useConfirmDialog } from './useConfirmDialog';
import { useToast } from './useToast';
import { makeCustomThemeValue } from '../enums/settings';
import { THEME_FIELDS } from '../enums/constants';
import { ToastType } from '../enums/ui';
import { themeExport, themeImport } from '../services/api';

export function useCustomThemes() {
  const { t } = useI18n();
  const config = useConfigStore();
  const confirmDialog = useConfirmDialog();
  const { toastMessage, toastType, showToast } = useToast();
  const editorVisible = ref(false);
  const editingTheme = ref<CustomThemeData | null>(null);

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

  async function exportSingleTheme(theme: CustomThemeData) {
    const exportData = _.pick(theme, THEME_FIELDS);
    await themeExport({ theme: exportData });
  }

  async function exportAllThemes() {
    if (_.isEmpty(config.customThemes)) return;
    const exportData = _.map(config.customThemes, (theme) => _.pick(theme, THEME_FIELDS));
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

  return {
    editorVisible,
    editingTheme,
    confirmDialog,
    toastMessage,
    toastType,
    selectDefault,
    selectCustom,
    openCreateEditor,
    openEditEditor,
    onEditorSave,
    deleteCustomTheme,
    exportSingleTheme,
    exportAllThemes,
    importTheme,
  };
}
