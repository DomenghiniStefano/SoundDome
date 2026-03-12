<script setup lang="ts">
import AppIcon from './AppIcon.vue';

defineProps<{
  playing?: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button class="play-btn" :class="{ playing }" @click="emit('click')">
    <AppIcon v-if="playing" name="stop-rounded" class="play-svg" />
    <AppIcon v-else name="play-rounded" class="play-svg" />
  </button>
</template>

<style scoped>
.play-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: var(--text-on-accent);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px var(--accent-muted);
}

.play-btn:hover {
  transform: scale(1.06);
  background: var(--accent-hover);
  box-shadow: 0 6px 28px var(--accent-muted);
}

.play-btn:active {
  transform: scale(0.96);
}

.play-btn.playing {
  background: var(--color-error);
  box-shadow: 0 4px 20px var(--color-error-muted);
  animation: glow-stop 1s ease-in-out infinite alternate;
}

.play-btn.playing:hover {
  background: var(--btn-danger-bg);
  box-shadow: 0 6px 28px var(--color-error-muted);
}

@keyframes glow-stop {
  from { box-shadow: 0 4px 20px var(--color-error-muted); }
  to { box-shadow: 0 4px 32px var(--color-error-muted); }
}

.play-svg {
  width: 28px;
  height: 28px;
  fill: var(--text-inverse);
}
</style>
