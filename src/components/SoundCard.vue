<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  name: string;
  mode: 'browse' | 'library';
  active?: boolean;
  saved?: boolean;
}>();

const emit = defineEmits<{
  play: [];
  preview: [];
  save: [];
  delete: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div
    class="sound-card"
    :class="{ active, library: mode === 'library' }"
    @click="emit('play')"
  >
    <button
      v-if="mode === 'library'"
      class="card-delete"
      :title="t('common.remove')"
      @click.stop="emit('delete')"
    >
      <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
    </button>

    <button class="card-play" @click.stop="emit('play')">
      <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    </button>

    <div class="card-name">{{ name }}</div>

    <div v-if="mode === 'browse'" class="card-actions">
      <button class="card-preview" :title="t('common.listenLocal')" @click.stop="emit('preview')">
        <svg viewBox="0 0 24 24"><path d="M12 1C7.03 1 3 5.03 3 10v6c0 1.66 1.34 3 3 3h1v-7H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-2v7h1c1.66 0 3-1.34 3-3v-6c0-4.97-4.03-9-9-9zM7 14v4H6c-.55 0-1-.45-1-1v-3h2zm12 3c0 .55-.45 1-1 1h-1v-4h2v3z"/></svg>
      </button>
      <button
        class="card-save"
        :class="{ saved }"
        :title="t('common.saveToLibrary')"
        @click.stop="emit('save')"
      >
        <svg v-if="!saved" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        <svg v-else viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sound-card {
  background: var(--color-bg-card);
  border-radius: var(--card-radius);
  padding: 16px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  position: relative;
}

.sound-card:hover {
  background: var(--color-bg-card-hover);
  border-color: var(--color-border);
}

.sound-card.active {
  border-color: var(--color-accent);
  background: var(--color-active-bg);
}

.card-play {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #282828;
  color: var(--color-accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.sound-card:hover .card-play {
  background: var(--color-accent);
  color: #000;
}

.sound-card.active .card-play {
  background: var(--color-accent);
  color: #000;
}

.card-play svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.card-name {
  font-size: 0.78rem;
  color: #bbb;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-preview,
.card-save {
  border: none;
  background: none;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
  display: flex;
  align-items: center;
}

.card-preview:hover {
  color: var(--color-text-white);
}

.card-save:hover {
  color: var(--color-accent);
}

.card-save.saved {
  color: var(--color-accent);
  pointer-events: none;
}

.card-preview svg,
.card-save svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.card-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  border: none;
  background: none;
  color: var(--color-text-faint);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: none;
  align-items: center;
}

.sound-card:hover .card-delete {
  display: flex;
}

.card-delete:hover {
  color: var(--color-error);
}

.card-delete svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}
</style>
