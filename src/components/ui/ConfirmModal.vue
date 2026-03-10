<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export interface ModalAction {
  label: string;
  event: string;
  variant?: 'default' | 'accent' | 'danger';
}

const props = defineProps<{
  visible: boolean;
  title: string;
  message: string;
  actions?: ModalAction[];
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
  action: [event: string];
}>();

const { t } = useI18n();

const resolvedActions = computed<ModalAction[]>(() =>
  props.actions ?? [
    { label: t('common.cancel'), event: 'cancel', variant: 'default' },
    { label: t('common.confirm'), event: 'confirm', variant: 'danger' },
  ]
);

function onAction(action: ModalAction) {
  emit('action', action.event);
  if (action.event === 'cancel') emit('cancel');
  if (action.event === 'confirm') emit('confirm');
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="emit('cancel')">
      <div class="modal">
        <button class="modal-close" @click="emit('cancel')">✕</button>
        <h3 class="modal-title">{{ title }}</h3>
        <p class="modal-message">{{ message }}</p>
        <div class="modal-actions">
          <button
            v-for="action in resolvedActions"
            :key="action.event"
            class="modal-btn"
            :class="action.variant ?? 'default'"
            @click="onAction(action)"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  position: relative;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius);
  padding: 24px;
  max-width: 420px;
  width: 90%;
}

.modal-close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: var(--color-text-dim);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--small-radius);
  transition: color 0.15s;
}

.modal-close:hover {
  color: var(--color-text-white);
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-white);
  margin-bottom: 10px;
}

.modal-message {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  line-height: 1.5;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-btn {
  padding: 8px 0;
  min-width: 90px;
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: var(--small-radius);
  background: var(--color-bg-input);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.modal-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.modal-btn:active {
  transform: scale(0.97);
}

.modal-btn.accent {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: #000;
}

.modal-btn.accent:hover {
  opacity: 0.85;
}

.modal-btn.danger {
  border-color: var(--color-error);
  color: var(--color-error);
}

.modal-btn.danger:hover {
  background: var(--color-error);
  color: #fff;
}
</style>
