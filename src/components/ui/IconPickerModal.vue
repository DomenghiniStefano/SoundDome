<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from './AppIcon.vue';
import { ICON_CHOICES, EMOJI_CHOICES, ImagePrefix, parseImage, PickerTab } from '../../enums/ui';
import type { PickerTabValue } from '../../enums/ui';

const props = defineProps<{
  visible: boolean;
  selected: string | null;
}>();

const emit = defineEmits<{
  select: [value: string];
  close: [];
}>();

const { t } = useI18n();

const activeTab = ref<PickerTabValue>(PickerTab.EMOJI);
const search = ref('');
const draft = ref<string | null>(null);

// Reset draft when opening
watch(() => props.visible, (v) => {
  if (v) {
    draft.value = props.selected;
    search.value = '';
  }
});

const draftParsed = computed(() => parseImage(draft.value));

const hasChanged = computed(() => draft.value !== props.selected);

const filteredIcons = computed(() => {
  if (!search.value) return ICON_CHOICES;
  const q = search.value.toLowerCase();
  return ICON_CHOICES.filter(name => name.includes(q));
});

function onApply() {
  if (draft.value) {
    emit('select', draft.value);
  }
  emit('close');
}

function onOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('picker-overlay')) {
    emit('close');
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="picker-overlay" @click="onOverlayClick">
      <div class="picker-panel">
        <!-- Search bar -->
        <div class="picker-search">
          <AppIcon name="search" :size="14" />
          <input
            v-model="search"
            class="picker-search-input"
            :placeholder="activeTab === PickerTab.EMOJI ? t('editSound.searchEmoji') : t('editSound.searchIcons')"
          />
        </div>

        <!-- Grid area -->
        <div class="picker-grid-area">
          <div v-if="activeTab === PickerTab.EMOJI" class="picker-grid">
            <button
              v-for="e in EMOJI_CHOICES"
              :key="e"
              class="picker-item emoji-item"
              :class="{ selected: draftParsed.type === 'emoji' && draftParsed.value === e }"
              @click="draft = `${ImagePrefix.EMOJI}${e}`"
            >
              {{ e }}
            </button>
          </div>

          <div v-if="activeTab === PickerTab.ICONS" class="picker-grid">
            <button
              v-for="name in filteredIcons"
              :key="name"
              class="picker-item icon-item"
              :class="{ selected: draftParsed.type === 'icon' && draftParsed.value === name }"
              @click="draft = `${ImagePrefix.ICON}${name}`"
            >
              <AppIcon :name="name" :size="20" />
            </button>
          </div>
        </div>

        <!-- Footer: tabs + apply -->
        <div class="picker-footer">
          <div class="picker-tabs">
            <button
              class="picker-tab"
              :class="{ active: activeTab === PickerTab.EMOJI }"
              @click="activeTab = PickerTab.EMOJI; search = ''"
            >
              <span class="picker-tab-emoji">😀</span>
            </button>
            <button
              class="picker-tab"
              :class="{ active: activeTab === PickerTab.ICONS }"
              @click="activeTab = PickerTab.ICONS; search = ''"
            >
              <AppIcon name="star" :size="18" />
            </button>
          </div>

          <button
            class="picker-apply"
            :disabled="!hasChanged || !draft"
            @click="onApply"
          >
            {{ t('editSound.apply') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.picker-panel {
  width: 340px;
  max-height: 420px;
  background: #1f1f1f;
  border-radius: 12px;
  border: 1px solid #3a3a3a;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: picker-in 0.15s ease-out;
}

@keyframes picker-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Search */
.picker-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #2a2a2a;
  color: #888;
}

.picker-search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: #e0e0e0;
  font-size: 13px;
  outline: none;
  font-family: inherit;
}

.picker-search-input::placeholder {
  color: #555;
}

/* Grid area */
.picker-grid-area {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.picker-grid-area::-webkit-scrollbar {
  width: 4px;
}

.picker-grid-area::-webkit-scrollbar-track {
  background: transparent;
}

.picker-grid-area::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

/* Items */
.picker-item {
  width: 100%;
  aspect-ratio: 1;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
}

.picker-item:hover {
  background: #333;
}

.picker-item.selected {
  background: rgba(29, 185, 84, 0.2);
}

.emoji-item {
  font-size: 22px;
  line-height: 1;
}

.icon-item {
  color: #aaa;
}

.icon-item:hover {
  color: #e0e0e0;
}

.icon-item.selected {
  color: var(--color-accent);
}

/* Footer */
.picker-footer {
  display: flex;
  align-items: center;
  border-top: 1px solid #2a2a2a;
  padding: 4px 8px;
  gap: 8px;
}

.picker-tabs {
  display: flex;
  flex: 1;
  gap: 2px;
}

.picker-tab {
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.picker-tab:hover {
  background: #2a2a2a;
  color: #aaa;
}

.picker-tab.active {
  background: #2a2a2a;
  color: #e0e0e0;
}

.picker-tab-emoji {
  font-size: 18px;
  line-height: 1;
}

/* Apply button */
.picker-apply {
  border: none;
  background: var(--color-accent);
  color: #000;
  cursor: pointer;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.picker-apply:hover:not(:disabled) {
  opacity: 0.85;
}

.picker-apply:disabled {
  opacity: 0.35;
  cursor: default;
}
</style>
