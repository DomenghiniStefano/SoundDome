<script setup lang="ts">
defineProps<{
  playing?: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button class="play-btn" :class="{ playing }" @click="emit('click')">
    <svg v-if="playing" class="play-svg" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
    <svg v-else class="play-svg" viewBox="0 0 24 24">
      <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z" />
    </svg>
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
