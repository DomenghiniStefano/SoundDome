<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { ColorPicker } from 'vue-accessible-color-picker';
import type { ColorChangeDetail } from 'vue-accessible-color-picker';
import ThemeCard from './ThemeCard.vue';
import ColorFieldRow from './ColorFieldRow.vue';
import BaseThemeToggle from './BaseThemeToggle.vue';
import { Theme } from '../../enums/settings';
import { darken, resolveThemePreviewColors } from '../../utils/color';

type BaseTheme = typeof Theme.DARK | typeof Theme.LIGHT;

const props = defineProps<{
  visible: boolean;
  initialTheme: CustomThemeData | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [theme: CustomThemeData];
}>();

const { t } = useI18n();

const themeName = ref('');
const base = ref<BaseTheme>(Theme.DARK);
const accent = ref('#1db954');
const bgPrimary = ref('#121212');
const bgCard = ref('#1a1a1a');
const textPrimary = ref('#e0e0e0');
const activeField = ref<'accent' | 'bgPrimary' | 'bgCard' | 'textPrimary'>('accent');
const editId = ref<string | null>(null);

const colorRefs: Record<string, typeof accent> = { accent, bgPrimary, bgCard, textPrimary };
const pickerWrapper = ref<HTMLElement | null>(null);

function applyPickerTooltips() {
  nextTick(() => {
    if (!pickerWrapper.value) return;
    const copyBtn = pickerWrapper.value.querySelector('.vacp-copy-button');
    if (copyBtn) copyBtn.setAttribute('title', t('settings.theme.pickerCopyTooltip'));
    const switchBtn = pickerWrapper.value.querySelector('.vacp-format-switch-button');
    if (switchBtn) switchBtn.setAttribute('title', t('settings.theme.pickerSwitchTooltip'));
  });
}

const activeColor = computed(() => colorRefs[activeField.value].value);

const previewColors = computed(() => ({
  bgPrimary: bgPrimary.value,
  bgSecondary: darken(bgPrimary.value, 0.08),
  bgCard: bgCard.value,
  textPrimary: textPrimary.value,
  accent: accent.value,
}));

const isEditing = computed(() => !!props.initialTheme);

const colorFields = computed(() => [
  { key: 'accent' as const, label: t('settings.theme.accentColor'), hint: t('settings.theme.accentColorHint') },
  { key: 'bgPrimary' as const, label: t('settings.theme.backgroundColor'), hint: t('settings.theme.backgroundColorHint') },
  { key: 'bgCard' as const, label: t('settings.theme.surfaceColor'), hint: t('settings.theme.surfaceColorHint') },
  { key: 'textPrimary' as const, label: t('settings.theme.textColor'), hint: t('settings.theme.textColorHint') },
]);

function loadDefaults(baseTheme: BaseTheme) {
  const colors = resolveThemePreviewColors(baseTheme);
  accent.value = colors.accent;
  bgPrimary.value = colors.bgPrimary;
  bgCard.value = colors.bgCard;
  textPrimary.value = colors.textPrimary;
}

watch(() => props.visible, (v) => {
  if (!v) return;
  if (props.initialTheme) {
    editId.value = props.initialTheme.id;
    themeName.value = props.initialTheme.name;
    base.value = props.initialTheme.base as BaseTheme;
    accent.value = props.initialTheme.accent;
    bgPrimary.value = props.initialTheme.bgPrimary;
    bgCard.value = props.initialTheme.bgCard;
    textPrimary.value = props.initialTheme.textPrimary;
  } else {
    editId.value = null;
    themeName.value = '';
    base.value = Theme.DARK;
    loadDefaults(Theme.DARK);
  }
  activeField.value = 'accent';
  applyPickerTooltips();
});

watch(activeField, () => applyPickerTooltips());

function onBaseChange(newBase: BaseTheme) {
  base.value = newBase;
  loadDefaults(newBase);
}

function onColorChange(detail: ColorChangeDetail) {
  const target = colorRefs[activeField.value];
  if (target) target.value = detail.cssColor;
}

function onFieldColorUpdate(key: string, value: string) {
  const target = colorRefs[key];
  if (target) target.value = value;
}

function onSave() {
  emit('save', {
    id: editId.value || crypto.randomUUID(),
    name: themeName.value || t('settings.theme.untitled'),
    base: base.value,
    accent: accent.value,
    bgPrimary: bgPrimary.value,
    bgCard: bgCard.value,
    textPrimary: textPrimary.value,
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

            <!-- Base theme toggle -->
            <BaseThemeToggle :model-value="base" @update:model-value="onBaseChange" />

            <!-- Color fields -->
            <ColorFieldRow
              v-for="field in colorFields"
              :key="field.key"
              :color="colorRefs[field.key].value"
              :label="field.label"
              :hint="field.hint"
              :active="activeField === field.key"
              @select="activeField = field.key"
              @update:color="onFieldColorUpdate(field.key, $event)"
            />
          </div>

          <div class="editor-right">
            <!-- Color picker -->
            <div ref="pickerWrapper" class="picker-wrapper">
              <ColorPicker
                :key="activeField"
                :color="activeColor"
                :visible-formats="['hex', 'rgb']"
                default-format="hex"
                alpha-channel="hide"
                @color-change="onColorChange"
              />
            </div>

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
  max-width: 700px;
  width: 90%;
  max-height: 85vh;
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
  overflow-y: auto;
  min-height: 0;
}

.editor-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.editor-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  flex-shrink: 0;
}

.picker-wrapper {
  --vacp-color-background: var(--bg-input);
  --vacp-color-background-2: var(--bg-card);
  --vacp-color-border: var(--border-default);
  --vacp-color-text: var(--text-primary);
  --vacp-color-focus: var(--accent);
  --vacp-font-family: var(--font-family);
  --vacp-font-size: 0.78rem;
  --vacp-spacing: 8px;
  --vacp-width: 260px;
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

<style>
/* vue-accessible-color-picker global overrides */
@import 'vue-accessible-color-picker/styles';

/* Theme-aware overrides for picker inputs and buttons */
.vacp-color-input {
  background: var(--bg-input) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-default) !important;
  border-radius: var(--small-radius) !important;
  font-family: monospace !important;
  outline: none !important;
}

.vacp-color-input:focus {
  border-color: var(--accent) !important;
}

.vacp-copy-button {
  background: var(--bg-input) !important;
  color: var(--text-secondary) !important;
  border-color: var(--border-default) !important;
  border-radius: var(--small-radius) !important;
}

.vacp-copy-button:hover {
  background: var(--bg-card-hover) !important;
  color: var(--text-primary) !important;
}

.vacp-format-switch-button {
  background: var(--bg-input) !important;
  color: var(--text-secondary) !important;
  border-color: var(--border-default) !important;
  border-radius: var(--small-radius) !important;
}

.vacp-format-switch-button:hover {
  background: var(--bg-card-hover) !important;
  color: var(--text-primary) !important;
}

.vacp-color-input-label-text {
  color: var(--text-tertiary) !important;
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
}

/* Smoother hue gradient — 13 stops instead of default 6 */
.vacp-range-input--hue::-webkit-slider-runnable-track {
  background-image: linear-gradient(to right,
    hsl(0, 100%, 50%),
    hsl(30, 100%, 50%),
    hsl(60, 100%, 50%),
    hsl(90, 100%, 50%),
    hsl(120, 100%, 50%),
    hsl(150, 100%, 50%),
    hsl(180, 100%, 50%),
    hsl(210, 100%, 50%),
    hsl(240, 100%, 50%),
    hsl(270, 100%, 50%),
    hsl(300, 100%, 50%),
    hsl(330, 100%, 50%),
    hsl(360, 100%, 50%)
  ) !important;
}

.vacp-range-input--hue::-moz-range-track {
  background-image: linear-gradient(to right,
    hsl(0, 100%, 50%),
    hsl(30, 100%, 50%),
    hsl(60, 100%, 50%),
    hsl(90, 100%, 50%),
    hsl(120, 100%, 50%),
    hsl(150, 100%, 50%),
    hsl(180, 100%, 50%),
    hsl(210, 100%, 50%),
    hsl(240, 100%, 50%),
    hsl(270, 100%, 50%),
    hsl(300, 100%, 50%),
    hsl(330, 100%, 50%),
    hsl(360, 100%, 50%)
  ) !important;
}
</style>
