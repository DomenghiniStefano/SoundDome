<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import { useHotkeyCapture } from '../../composables/useHotkeyCapture';

const props = defineProps<{
  visible: boolean;
  name: string;
  hotkey: string | null;
  usedHotkeys: Map<string, string>;
}>();

const emit = defineEmits<{
  close: [];
  'update:hotkey': [value: string | null];
}>();

const { t } = useI18n();

const { captured, listening, conflict, startListening, resetCapture, onKeyDown } = useHotkeyCapture(
  () => props.hotkey,
  () => props.usedHotkeys,
  () => props.name
);

watch(() => props.visible, (v) => {
  if (v) {
    resetCapture(props.hotkey);
    listening.value = false;
  }
});

function onSave() {
  emit('update:hotkey', captured.value);
  emit('close');
}

function onRemove() {
  resetCapture(null);
  emit('update:hotkey', null);
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="hotkey-modal-overlay" @click="emit('close')">
      <div class="hotkey-modal" @click.stop @keydown="onKeyDown">
        <div class="hotkey-modal-header">
          <span class="hotkey-modal-title">{{ name }}</span>
          <button class="hotkey-modal-close" @click="emit('close')">
            <AppIcon name="close" :size="16" />
          </button>
        </div>

        <div class="hotkey-display" :class="{ listening }" tabindex="0" @click="startListening" @keydown="onKeyDown">
          <template v-if="listening">
            <span class="hotkey-listening">{{ t('hotkey.pressKeys') }}</span>
          </template>
          <template v-else-if="captured">
            <span class="hotkey-keys">{{ captured }}</span>
          </template>
          <template v-else>
            <span class="hotkey-empty">{{ t('hotkey.noHotkey') }}</span>
          </template>
        </div>

        <div v-if="conflict" class="hotkey-conflict">
          {{ t('hotkey.conflict', { name: conflict }) }}
        </div>

        <div class="hotkey-actions">
          <button v-if="props.hotkey" class="hotkey-btn remove" @click="onRemove">
            {{ t('hotkey.remove') }}
          </button>
          <button class="hotkey-btn record" @click="startListening">
            {{ t('hotkey.record') }}
          </button>
          <button class="hotkey-btn save" :disabled="!!conflict" @click="onSave">
            {{ t('hotkey.save') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
/* Hotkey modal (unscoped for Teleport) */
.hotkey-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hotkey-modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  padding: 16px;
  min-width: 280px;
  max-width: 360px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.hotkey-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.hotkey-modal-title {
  font-size: 0.85rem;
  color: var(--color-text-white, #fff);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.hotkey-modal-close {
  border: none;
  background: none;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.hotkey-modal-close:hover {
  color: var(--color-text-white);
}

.hotkey-display {
  background: #1a1a1a;
  border: 2px solid #333;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s;
  outline: none;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hotkey-display:focus,
.hotkey-display.listening {
  border-color: var(--color-accent);
}

.hotkey-listening {
  font-size: 0.8rem;
  color: var(--color-accent);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.hotkey-keys {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-white, #fff);
  font-family: monospace;
  letter-spacing: 0.5px;
}

.hotkey-empty {
  font-size: 0.8rem;
  color: var(--color-text-dimmer);
}

.hotkey-conflict {
  font-size: 0.7rem;
  color: var(--color-error, #e53935);
  margin-top: 8px;
  text-align: center;
}

.hotkey-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  justify-content: flex-end;
}

.hotkey-btn {
  border: none;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: opacity 0.15s;
}

.hotkey-btn:hover {
  opacity: 0.85;
}

.hotkey-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.hotkey-btn.save {
  background: var(--color-accent);
  color: #000;
}

.hotkey-btn.record {
  background: #333;
  color: var(--color-text-white, #fff);
}

.hotkey-btn.remove {
  background: none;
  color: var(--color-error, #e53935);
  margin-right: auto;
}
</style>
