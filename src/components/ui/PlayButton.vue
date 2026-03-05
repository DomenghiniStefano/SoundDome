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
  background: var(--color-accent);
  color: #000;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(29, 185, 84, 0.3);
}

.play-btn:hover {
  transform: scale(1.06);
  background: var(--color-accent-hover);
  box-shadow: 0 6px 28px rgba(29, 185, 84, 0.45);
}

.play-btn:active {
  transform: scale(0.96);
}

.play-btn.playing {
  background: var(--color-error, #e53935);
  box-shadow: 0 4px 20px rgba(229, 57, 53, 0.3);
  animation: glow-stop 1s ease-in-out infinite alternate;
}

.play-btn.playing:hover {
  background: #c62828;
  box-shadow: 0 6px 28px rgba(229, 57, 53, 0.45);
}

@keyframes glow-stop {
  from { box-shadow: 0 4px 20px rgba(229, 57, 53, 0.3); }
  to { box-shadow: 0 4px 32px rgba(229, 57, 53, 0.6); }
}

.play-svg {
  width: 28px;
  height: 28px;
  fill: #fff;
}
</style>
