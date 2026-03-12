<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import _ from 'lodash';
import SettingSection from './SettingSection.vue';
import ThemeCard from './ThemeCard.vue';
import ThemeEditorModal from './ThemeEditorModal.vue';
import AppIcon from '../ui/AppIcon.vue';
import { useConfigStore } from '../../stores/config';
import { useConfirmDialog } from '../../composables/useConfirmDialog';
import { Theme, isCustomTheme, makeCustomThemeValue } from '../../enums/settings';
import { IconName } from '../../enums/icons';
import { darken, resolveThemePreviewColors } from '../../utils/color';

const { t } = useI18n();
const config = useConfigStore();
const { showConfirm } = useConfirmDialog();
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
    bgSecondary: darken(theme.bgPrimary, 0.08),
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
    config.customThemes[idx] = theme;
  } else {
    config.customThemes.push(theme);
  }
  config.theme = makeCustomThemeValue(theme.id);
  editorVisible.value = false;
}

async function deleteCustomTheme(theme: CustomThemeData) {
  const confirmed = await showConfirm(
    t('settings.theme.deleteCustom'),
    t('settings.theme.deleteConfirm', { name: theme.name }),
  );
  if (!confirmed) return;
  config.customThemes = _.reject(config.customThemes, { id: theme.id });
  if (config.theme === makeCustomThemeValue(theme.id)) {
    config.theme = Theme.DARK;
  }
}

async function exportTheme(theme: CustomThemeData) {
  const exportData = _.pick(theme, ['name', 'base', 'accent', 'bgPrimary', 'bgCard', 'textPrimary']);
  await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
}

async function importTheme() {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);
    if (!data.base || !data.accent || !data.bgPrimary || !data.bgCard || !data.textPrimary) {
      return;
    }
    const imported: CustomThemeData = {
      id: crypto.randomUUID(),
      name: data.name || t('settings.theme.importedName'),
      base: data.base,
      accent: data.accent,
      bgPrimary: data.bgPrimary,
      bgCard: data.bgCard,
      textPrimary: data.textPrimary,
    };
    config.customThemes.push(imported);
    config.theme = makeCustomThemeValue(imported.id);
  } catch {
    // Invalid clipboard content
  }
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
          <button class="icon-btn" :title="t('settings.theme.exportTheme')" @click="exportTheme(theme)">
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
    </div>
  </SettingSection>

  <ThemeEditorModal
    :visible="editorVisible"
    :initial-theme="editingTheme"
    @close="editorVisible = false"
    @save="onEditorSave"
  />
</template>

<style scoped>
.theme-grid {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.custom-card-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.custom-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: var(--bg-input);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.icon-btn.danger:hover {
  background: var(--color-error-subtle);
  color: var(--color-error);
  border-color: var(--color-error);
}

.add-card {
  width: 140px;
  height: 132px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 2px dashed var(--border-default);
  border-radius: var(--card-radius);
  background: none;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  font-family: var(--font-family);
}

.add-card:hover {
  border-color: var(--accent);
  background: var(--accent-subtle);
}

.add-icon {
  font-size: 1.8rem;
  font-weight: 300;
  color: var(--text-tertiary);
  line-height: 1;
}

.add-card:hover .add-icon {
  color: var(--accent);
}

.add-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-tertiary);
}

.add-card:hover .add-label {
  color: var(--accent);
}

.import-row {
  margin-top: 12px;
}

.import-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 500;
  font-family: var(--font-family);
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  background: var(--bg-input);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.import-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}
</style>
