<script setup lang="ts">
defineProps<{
  label: string;
  selected: boolean;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgCard: string;
    textPrimary: string;
    accent: string;
  };
}>();

defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    class="theme-card"
    :class="{ selected }"
    :style="selected ? { '--tc-border': colors.accent } : {}"
    @click="$emit('click')"
  >
    <div class="preview" :style="{ background: colors.bgPrimary }">
      <div class="preview-sidebar" :style="{ background: colors.bgSecondary }" />
      <div class="preview-main">
        <div class="preview-accent-bar" :style="{ background: colors.accent }" />
        <div class="preview-card" :style="{ background: colors.bgCard }">
          <div class="preview-line" :style="{ background: colors.textPrimary, opacity: 0.9, width: '70%' }" />
          <div class="preview-line" :style="{ background: colors.textPrimary, opacity: 0.5, width: '50%' }" />
          <div class="preview-line" :style="{ background: colors.textPrimary, opacity: 0.3, width: '60%' }" />
        </div>
      </div>
    </div>
    <div class="check-badge" v-if="selected">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <span class="label">{{ label }}</span>
  </button>
</template>

<style scoped>
.theme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
  background: none;
  border: 2px solid var(--tc-border, var(--border-default));
  border-radius: var(--card-radius);
  cursor: pointer;
  transition: border-color 0.2s, transform 0.15s;
  overflow: hidden;
  font-family: var(--font-family);
}

.theme-card:hover {
  transform: translateY(-2px);
}

.preview {
  width: 140px;
  height: 100px;
  display: flex;
  border-radius: calc(var(--card-radius) - 2px);
  overflow: hidden;
}

.preview-sidebar {
  width: 28px;
  flex-shrink: 0;
}

.preview-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 6px;
  gap: 4px;
}

.preview-accent-bar {
  height: 4px;
  border-radius: 2px;
  width: 60%;
}

.preview-card {
  flex: 1;
  border-radius: 4px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.preview-line {
  height: 3px;
  border-radius: 1.5px;
}

.check-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--text-on-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-primary);
  padding: 0 8px 10px;
}
</style>
