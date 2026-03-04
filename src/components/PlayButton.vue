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
    <div class="play-icon"></div>
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
  font-size: 1.8rem;
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
  background: var(--color-accent-hover);
  animation: glow 1s ease-in-out infinite alternate;
}

@keyframes glow {
  from { box-shadow: 0 4px 20px rgba(29, 185, 84, 0.3); }
  to { box-shadow: 0 4px 32px rgba(29, 185, 84, 0.6); }
}

.play-icon {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 12px 0 12px 22px;
  border-color: transparent transparent transparent #000;
  margin-left: 4px;
}
</style>
