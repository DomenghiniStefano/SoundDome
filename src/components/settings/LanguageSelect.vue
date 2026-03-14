<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import { IconName } from '../../enums/icons';

defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { t } = useI18n();

const languages = ['en', 'it'] as const;

const open = ref(false);

function select(value: string) {
  emit('update:modelValue', value);
  open.value = false;
}
</script>

<template>
  <div class="select-card">
    <label>{{ t('settings.language.label') }}</label>
    <div class="language-select" :class="{ open }">
      <div v-if="open" class="backdrop" @click="open = false" />
      <button class="select-trigger" @click="open = !open">
      <svg v-if="modelValue === 'en'" class="flag" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="30" fill="#B22234"/>
        <rect y="2.3" width="60" height="2.3" fill="#fff"/>
        <rect y="6.9" width="60" height="2.3" fill="#fff"/>
        <rect y="11.5" width="60" height="2.3" fill="#fff"/>
        <rect y="16.2" width="60" height="2.3" fill="#fff"/>
        <rect y="20.8" width="60" height="2.3" fill="#fff"/>
        <rect y="25.4" width="60" height="2.3" fill="#fff"/>
        <rect width="24" height="16.15" fill="#3C3B6E"/>
      </svg>
      <svg v-else-if="modelValue === 'it'" class="flag" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
        <rect width="20" height="30" fill="#009246"/>
        <rect x="20" width="20" height="30" fill="#fff"/>
        <rect x="40" width="20" height="30" fill="#CE2B37"/>
      </svg>
      <span>{{ t(`settings.language.${modelValue}`) }}</span>
      <AppIcon :name="IconName.CHEVRON_DOWN" :size="14" class="chevron" />
    </button>
    <div v-if="open" class="dropdown">
      <button
        v-for="lang in languages"
        :key="lang"
        class="dropdown-item"
        :class="{ active: modelValue === lang }"
        @click="select(lang)"
      >
        <svg v-if="lang === 'en'" class="flag" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
          <rect width="60" height="30" fill="#B22234"/>
          <rect y="2.3" width="60" height="2.3" fill="#fff"/>
          <rect y="6.9" width="60" height="2.3" fill="#fff"/>
          <rect y="11.5" width="60" height="2.3" fill="#fff"/>
          <rect y="16.2" width="60" height="2.3" fill="#fff"/>
          <rect y="20.8" width="60" height="2.3" fill="#fff"/>
          <rect y="25.4" width="60" height="2.3" fill="#fff"/>
          <rect width="24" height="16.15" fill="#3C3B6E"/>
        </svg>
        <svg v-else-if="lang === 'it'" class="flag" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
          <rect width="20" height="30" fill="#009246"/>
          <rect x="20" width="20" height="30" fill="#fff"/>
          <rect x="40" width="20" height="30" fill="#CE2B37"/>
        </svg>
        <span>{{ t(`settings.language.${lang}`) }}</span>
      </button>
    </div>
    </div>
  </div>
</template>

<style scoped>
.select-card {
  background: var(--bg-card);
  padding: 14px 18px;
  border-radius: var(--input-radius);
  margin-bottom: 6px;
}

.select-card label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.language-select {
  position: relative;
}

.select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 32px 8px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.2s;
}

.select-trigger:hover,
.language-select.open .select-trigger {
  border-color: var(--accent);
}

.chevron {
  position: absolute;
  right: 10px;
  color: var(--text-secondary);
  transition: transform 0.2s;
}

.language-select.open .chevron {
  transform: rotate(180deg);
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  overflow: hidden;
  z-index: 10;
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--bg-card);
}

.dropdown-item.active {
  color: var(--accent);
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 9;
}

.flag {
  width: 24px;
  height: 14px;
  border-radius: 2px;
  flex-shrink: 0;
}
</style>
