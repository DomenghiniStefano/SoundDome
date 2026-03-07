<script setup lang="ts">
import AppIcon from './AppIcon.vue';
import { ICON_PRESETS } from '../../enums/ui';

defineProps<{
  visible: boolean;
  selected: string | null;
}>();

const emit = defineEmits<{
  select: [name: string];
  close: [];
}>();

function onSelect(name: string) {
  emit('select', name);
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="icon-picker-overlay" @click.self="emit('close')">
      <div class="icon-picker-modal">
        <div class="icon-picker-grid">
          <button
            v-for="name in ICON_PRESETS"
            :key="name"
            class="icon-picker-btn"
            :class="{ selected: selected === name }"
            @click="onSelect(name)"
          >
            <AppIcon :name="name" :size="20" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.icon-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.icon-picker-modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  max-width: 320px;
}

.icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}

.icon-picker-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s, color 0.1s;
}

.icon-picker-btn:hover {
  background: var(--color-bg-card-hover);
  color: var(--color-text-white);
}

.icon-picker-btn.selected {
  background: rgba(29, 185, 84, 0.2);
  color: var(--color-accent);
}
</style>
