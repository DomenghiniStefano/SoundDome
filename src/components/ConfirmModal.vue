<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  visible: boolean;
  title: string;
  message: string;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const { t } = useI18n();
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="emit('cancel')">
      <div class="modal">
        <h3 class="modal-title">{{ title }}</h3>
        <p class="modal-message">{{ message }}</p>
        <div class="modal-actions">
          <button class="modal-btn" @click="emit('cancel')">{{ t('common.cancel') }}</button>
          <button class="modal-btn danger" @click="emit('confirm')">{{ t('common.confirm') }}</button>
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
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius);
  padding: 24px;
  max-width: 380px;
  width: 90%;
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
  width: 90px;
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

.modal-btn.danger {
  border-color: var(--color-error);
  color: var(--color-error);
}

.modal-btn.danger:hover {
  background: var(--color-error);
  color: #fff;
}
</style>
