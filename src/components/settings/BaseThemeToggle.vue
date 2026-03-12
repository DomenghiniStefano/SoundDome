<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Theme } from '../../enums/settings';

type BaseTheme = typeof Theme.DARK | typeof Theme.LIGHT;

defineProps<{
  modelValue: BaseTheme;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: BaseTheme];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="field">
    <label class="field-label">{{ t('settings.theme.baseTheme') }}</label>
    <div class="base-toggle">
      <button
        class="toggle-btn"
        :class="{ active: modelValue === Theme.DARK }"
        @click="$emit('update:modelValue', Theme.DARK)"
      >
        {{ t('settings.theme.dark') }}
      </button>
      <button
        class="toggle-btn"
        :class="{ active: modelValue === Theme.LIGHT }"
        @click="$emit('update:modelValue', Theme.LIGHT)"
      >
        {{ t('settings.theme.light') }}
      </button>
    </div>
    <span class="field-hint">{{ t('settings.theme.baseThemeHint') }}</span>
  </div>
</template>

<style scoped>
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

.field-hint {
  font-size: 0.68rem;
  color: var(--text-tertiary);
  line-height: 1.2;
}

.base-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  overflow: hidden;
}

.toggle-btn {
  flex: 1;
  padding: 6px 14px;
  font-size: 0.8rem;
  font-weight: 500;
  font-family: var(--font-family);
  border: none;
  background: var(--bg-input);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.toggle-btn.active {
  background: var(--accent);
  color: var(--text-on-accent);
}
</style>
