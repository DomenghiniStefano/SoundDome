<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ColorSpacePicker from './ColorSpacePicker.vue';
import ThemeCard from './ThemeCard.vue';
import ColorFieldRow from './ColorFieldRow.vue';
import { Theme } from '../../enums/settings';
import { luminance, resolveCurrentThemeColors, resolveThemePreviewColors } from '../../utils/color';

const props = defineProps<{
  visible: boolean;
  initialTheme: CustomThemeData | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [theme: CustomThemeData];
}>();

const { t } = useI18n();

type ColorFieldKey = 'accent' | 'bgPrimary' | 'bgCard' | 'textPrimary'
  | 'bgSecondary' | 'textSecondary' | 'borderDefault'
  | 'colorError' | 'colorWarning' | 'colorInfo';

const themeName = ref('');
const accent = ref('#1db954');
const bgPrimary = ref('#121212');
const bgCard = ref('#1a1a1a');
const textPrimary = ref('#e0e0e0');
const bgSecondary = ref('#0a0a0a');
const textSecondary = ref('#888888');
const borderDefault = ref('#333333');
const colorError = ref('#e74c3c');
const colorWarning = ref('#e2b714');
const colorInfo = ref('#3b82f6');
const activeField = ref<ColorFieldKey>('accent');
const editId = ref<string | null>(null);

const colorRefs: Record<string, typeof accent> = {
  accent, bgPrimary, bgCard, textPrimary,
  bgSecondary, textSecondary, borderDefault,
  colorError, colorWarning, colorInfo,
};

const pickerColor = computed(() => colorRefs[activeField.value].value);

const previewColors = computed(() => ({
  bgPrimary: bgPrimary.value,
  bgSecondary: bgSecondary.value,
  bgCard: bgCard.value,
  textPrimary: textPrimary.value,
  accent: accent.value,
}));

const isEditing = computed(() => !!props.initialTheme);

interface ColorFieldGroup {
  title: string;
  fields: { key: ColorFieldKey; label: string; hint: string }[];
}

const colorFieldGroups = computed<ColorFieldGroup[]>(() => [
  {
    title: t('settings.theme.colorsSection'),
    fields: [
      { key: 'accent', label: t('settings.theme.accentColor'), hint: t('settings.theme.accentColorHint') },
      { key: 'bgPrimary', label: t('settings.theme.backgroundColor'), hint: t('settings.theme.backgroundColorHint') },
      { key: 'bgCard', label: t('settings.theme.surfaceColor'), hint: t('settings.theme.surfaceColorHint') },
      { key: 'textPrimary', label: t('settings.theme.textColor'), hint: t('settings.theme.textColorHint') },
    ],
  },
  {
    title: t('settings.theme.interfaceSection'),
    fields: [
      { key: 'bgSecondary', label: t('settings.theme.sidebarColor'), hint: t('settings.theme.sidebarColorHint') },
      { key: 'textSecondary', label: t('settings.theme.secondaryTextColor'), hint: t('settings.theme.secondaryTextColorHint') },
      { key: 'borderDefault', label: t('settings.theme.borderColor'), hint: t('settings.theme.borderColorHint') },
    ],
  },
  {
    title: t('settings.theme.statusSection'),
    fields: [
      { key: 'colorError', label: t('settings.theme.errorColor'), hint: t('settings.theme.errorColorHint') },
      { key: 'colorWarning', label: t('settings.theme.warningColor'), hint: t('settings.theme.warningColorHint') },
      { key: 'colorInfo', label: t('settings.theme.infoColor'), hint: t('settings.theme.infoColorHint') },
    ],
  },
]);

function applyColors(colors: Record<string, string>) {
  accent.value = colors.accent;
  bgPrimary.value = colors.bgPrimary;
  bgCard.value = colors.bgCard;
  textPrimary.value = colors.textPrimary;
  bgSecondary.value = colors.bgSecondary;
  textSecondary.value = colors.textSecondary;
  borderDefault.value = colors.borderDefault;
  colorError.value = colors.colorError;
  colorWarning.value = colors.colorWarning;
  colorInfo.value = colors.colorInfo;
}

watch(() => props.visible, (v) => {
  if (!v) return;
  if (props.initialTheme) {
    editId.value = props.initialTheme.id;
    themeName.value = props.initialTheme.name;
    const baseDefaults = resolveThemePreviewColors(props.initialTheme.base as typeof Theme.DARK);
    applyColors({
      accent: props.initialTheme.accent,
      bgPrimary: props.initialTheme.bgPrimary,
      bgCard: props.initialTheme.bgCard,
      textPrimary: props.initialTheme.textPrimary,
      bgSecondary: props.initialTheme.bgSecondary || baseDefaults.bgSecondary,
      textSecondary: props.initialTheme.textSecondary || baseDefaults.textSecondary,
      borderDefault: props.initialTheme.borderDefault || baseDefaults.borderDefault,
      colorError: props.initialTheme.colorError || baseDefaults.colorError,
      colorWarning: props.initialTheme.colorWarning || baseDefaults.colorWarning,
      colorInfo: props.initialTheme.colorInfo || baseDefaults.colorInfo,
    });
  } else {
    editId.value = null;
    themeName.value = '';
    applyColors(resolveCurrentThemeColors());
  }
  activeField.value = 'accent';
});

function onColorChange(payload: { hex: string; rgb: { r: number; g: number; b: number } }) {
  const target = colorRefs[activeField.value];
  if (target) target.value = payload.hex;
}

function onFieldColorUpdate(key: string, value: string) {
  const target = colorRefs[key];
  if (target) target.value = value;
}

function onSave() {
  const detectedBase = luminance(bgPrimary.value) < 0.179 ? Theme.DARK : Theme.LIGHT;
  emit('save', {
    id: editId.value || crypto.randomUUID(),
    name: themeName.value || t('settings.theme.untitled'),
    base: detectedBase,
    accent: accent.value,
    bgPrimary: bgPrimary.value,
    bgCard: bgCard.value,
    textPrimary: textPrimary.value,
    bgSecondary: bgSecondary.value,
    textSecondary: textSecondary.value,
    borderDefault: borderDefault.value,
    colorError: colorError.value,
    colorWarning: colorWarning.value,
    colorInfo: colorInfo.value,
  });
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal">
        <h3 class="modal-title">
          {{ initialTheme ? t('settings.theme.editorEdit') : t('settings.theme.editorCreate') }}
        </h3>

        <div class="editor-body">
          <div class="editor-left">
            <!-- Name -->
            <div class="field">
              <label class="field-label">{{ t('settings.theme.themeName') }}</label>
              <input
                v-model="themeName"
                type="text"
                class="name-input"
                :placeholder="t('settings.theme.nameplaceholder')"
              />
            </div>

            <!-- Color fields grouped -->
            <div v-for="group in colorFieldGroups" :key="group.title" class="color-group">
              <span class="color-group-title">{{ group.title }}</span>
              <ColorFieldRow
                v-for="field in group.fields"
                :key="field.key"
                :color="colorRefs[field.key].value"
                :label="field.label"
                :hint="field.hint"
                :active="activeField === field.key"
                @select="activeField = field.key"
                @update:color="onFieldColorUpdate(field.key, $event)"
              />
            </div>
          </div>

          <div class="editor-right">
            <!-- Color picker -->
            <ColorSpacePicker
              :color="pickerColor"
              @update:color="onColorChange"
            />

            <!-- Live preview -->
            <div class="editor-preview">
              <span class="preview-label">{{ t('settings.theme.preview') }}</span>
              <ThemeCard
                :colors="previewColors"
                :label="themeName || t('settings.theme.untitled')"
                :selected="false"
              />
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="$emit('close')">{{ t('common.cancel') }}</button>
          <button class="btn-save" @click="onSave">{{ isEditing ? t('settings.theme.saveAction') : t('settings.theme.createAction') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--input-radius);
  padding: 24px;
  width: 85%;
  height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-inverse);
  margin: 0 0 20px;
  flex-shrink: 0;
}

.editor-body {
  display: flex;
  gap: 24px;
  min-height: 0;
  flex: 1;
}

.editor-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  overflow-y: auto;
  padding-right: 12px;
}

.color-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-group-title {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-tertiary);
  padding-left: 10px;
  margin-bottom: 2px;
}

.editor-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  flex-shrink: 0;
  overflow-y: auto;
}

.editor-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.preview-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-tertiary);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.name-input {
  padding: 7px 10px;
  font-size: 0.85rem;
  font-family: var(--font-family);
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  color: var(--text-primary);
  outline: none;
}

.name-input:focus {
  border-color: var(--accent);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}

.btn-cancel,
.btn-save {
  padding: 8px 18px;
  font-size: 0.82rem;
  font-weight: 500;
  font-family: var(--font-family);
  border: none;
  border-radius: var(--small-radius);
  cursor: pointer;
  transition: background 0.15s;
}

.btn-cancel {
  background: var(--bg-input);
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: var(--bg-card-hover);
}

.btn-save {
  background: var(--accent);
  color: var(--text-on-accent);
}

.btn-save:hover {
  background: var(--accent-hover);
}
</style>

