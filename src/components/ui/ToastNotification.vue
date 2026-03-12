<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ToastTypeValue } from '../../enums/ui';
import { TOAST_DURATION_DEFAULT } from '../../enums/constants';

const props = defineProps<{
  message: string;
  type?: ToastTypeValue;
  duration?: number;
}>();

const visible = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

watch(() => props.message, (msg) => {
  if (!msg) {
    visible.value = false;
    return;
  }
  visible.value = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    visible.value = false;
  }, props.duration ?? TOAST_DURATION_DEFAULT);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast" :class="type">
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 44px;
  right: 16px;
  padding: 10px 18px;
  border-radius: var(--small-radius);
  font-size: 0.85rem;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  z-index: 2000;
  pointer-events: none;
}

.toast.success {
  border-color: var(--accent);
  color: var(--accent);
}

.toast.error {
  border-color: var(--color-error);
  color: var(--color-error);
}

.toast-enter-active {
  transition: all 0.3s ease;
}

.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
