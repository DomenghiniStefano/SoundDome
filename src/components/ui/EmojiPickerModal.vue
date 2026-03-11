<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import _ from 'lodash';
import {
  EMOJI_CATEGORIES, EMOJI_BY_CATEGORY, CATEGORY_ICONS, ALL_EMOJIS,
  EmojiCategory,
} from '../../enums/emoji';
import type { EmojiCategoryValue, EmojiItem } from '../../enums/emoji';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  select: [emoji: string];
  close: [];
}>();

const { t } = useI18n();

const COLS = 8;
const ROW_HEIGHT = 42;
const BUFFER_ROWS = 4;

const searchQuery = ref('');
const activeCategory = ref<EmojiCategoryValue>(EmojiCategory.SMILEYS);
const gridRef = ref<HTMLElement>();
const searchRef = ref<HTMLInputElement>();
const scrollTop = ref(0);

const filteredEmojis = computed<EmojiItem[]>(() => {
  if (!searchQuery.value.trim()) {
    return EMOJI_BY_CATEGORY[activeCategory.value];
  }
  const query = searchQuery.value.trim().toLowerCase();
  return _.filter(ALL_EMOJIS, (item) => item.name.includes(query));
});

const totalRows = computed(() => Math.ceil(filteredEmojis.value.length / COLS));
const totalHeight = computed(() => totalRows.value * ROW_HEIGHT);

const visibleEmojis = computed(() => {
  const items = filteredEmojis.value;
  const startRow = Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER_ROWS);
  const visibleRows = Math.ceil(320 / ROW_HEIGHT) + BUFFER_ROWS * 2;
  const startIdx = startRow * COLS;
  const endIdx = Math.min(items.length, (startRow + visibleRows) * COLS);
  return {
    items: items.slice(startIdx, endIdx),
    offsetY: startRow * ROW_HEIGHT,
    startIdx,
  };
});

function onScroll() {
  if (gridRef.value) {
    scrollTop.value = gridRef.value.scrollTop;
  }
}

function onSelect(emoji: string) {
  emit('select', emoji);
  emit('close');
}

function onCategoryClick(cat: EmojiCategoryValue) {
  activeCategory.value = cat;
  resetScroll();
}

function resetScroll() {
  scrollTop.value = 0;
  if (gridRef.value) {
    gridRef.value.scrollTop = 0;
  }
}

watch(() => searchQuery.value, () => resetScroll());

watch(() => searchQuery.value, (val) => {
  if (!val.trim()) {
    activeCategory.value = EmojiCategory.SMILEYS;
  }
});

// Reset state when opened, focus search
watch(
  () => searchRef.value,
  async (el) => {
    if (el) {
      searchQuery.value = '';
      activeCategory.value = EmojiCategory.SMILEYS;
      scrollTop.value = 0;
      await nextTick();
      el.focus();
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="emoji-picker-overlay" @click.self="emit('close')">
      <div class="emoji-picker-modal">
        <!-- Search -->
        <div class="emoji-picker-header">
          <input
            ref="searchRef"
            v-model="searchQuery"
            class="emoji-search"
            :placeholder="t('editSound.emojiSearch')"
          />
        </div>

        <!-- Category tabs -->
        <div v-if="!searchQuery.trim()" class="emoji-category-tabs">
          <button
            v-for="cat in EMOJI_CATEGORIES"
            :key="cat"
            class="emoji-category-tab"
            :class="{ active: activeCategory === cat }"
            :title="cat"
            @click="onCategoryClick(cat)"
          >
            {{ CATEGORY_ICONS[cat] }}
          </button>
        </div>

        <!-- Virtual scrolling grid -->
        <div ref="gridRef" class="emoji-grid" @scroll="onScroll">
          <div class="emoji-grid-spacer" :style="{ height: totalHeight + 'px' }">
            <div
              class="emoji-grid-visible"
              :style="{ transform: `translateY(${visibleEmojis.offsetY}px)` }"
            >
              <button
                v-for="(item, i) in visibleEmojis.items"
                :key="visibleEmojis.startIdx + i"
                class="emoji-btn"
                :title="item.name"
                @click="onSelect(item.emoji)"
              >
                {{ item.emoji }}
              </button>
            </div>
          </div>
          <div v-if="_.isEmpty(filteredEmojis)" class="emoji-empty">
            {{ t('editSound.emojiNoResults') }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.emoji-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.emoji-picker-modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px;
  width: 380px;
  max-height: 440px;
  display: flex;
  flex-direction: column;
}

/* Search */
.emoji-picker-header {
  margin-bottom: 8px;
}

.emoji-search {
  width: 100%;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius);
  background: var(--color-bg-input);
  color: var(--color-text);
  font-size: 0.78rem;
  padding: 0 10px;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.emoji-search:focus {
  border-color: var(--color-accent);
}

.emoji-search::placeholder {
  color: var(--color-text-dimmer);
}

/* Category tabs */
.emoji-category-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 6px;
}

.emoji-category-tab {
  flex: 1;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 4px 0;
  border-radius: 6px;
  transition: background 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-category-tab:hover {
  background: var(--color-bg-card-hover);
}

.emoji-category-tab.active {
  background: rgba(29, 185, 84, 0.15);
}

/* Virtual scrolling grid */
.emoji-grid {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  max-height: 320px;
}

.emoji-grid::-webkit-scrollbar {
  width: 6px;
}

.emoji-grid::-webkit-scrollbar-track {
  background: transparent;
}

.emoji-grid::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.emoji-grid-spacer {
  position: relative;
}

.emoji-grid-visible {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  padding: 0 2px;
}

.emoji-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
}

.emoji-btn:hover {
  background: var(--color-bg-card-hover);
}

.emoji-empty {
  text-align: center;
  color: var(--color-text-dim);
  font-size: 0.78rem;
  padding: 24px 0;
}
</style>
