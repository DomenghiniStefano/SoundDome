<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import { useHotkeyCapture } from '../../composables/useHotkeyCapture';

const props = defineProps<{
  name: string;
  hotkey: string | null;
  usedHotkeys: Map<string, string>;
}>();

const emit = defineEmits<{
  'update:hotkey': [value: string | null];
}>();

const { t } = useI18n();

const { captured, listening, conflict, startListening, stopListening, resetCapture, onKeyDown: handleKeyDown, onMouseDown: handleMouseDown } = useHotkeyCapture(
  () => props.hotkey,
  () => props.usedHotkeys,
  () => props.name
);

const dirty = ref(false);

watch(() => props.hotkey, (v) => {
  resetCapture(v);
  stopListening();
  dirty.value = false;
});

onUnmounted(() => {
  stopListening();
});

function onKeyDown(e: KeyboardEvent) {
  if (handleKeyDown(e)) {
    dirty.value = true;
  }
}

function onMouseDown(e: MouseEvent) {
  if (handleMouseDown(e)) {
    dirty.value = true;
  }
}

function onSave() {
  emit('update:hotkey', captured.value);
  dirty.value = false;
}

function onRemove() {
  resetCapture(null);
  dirty.value = false;
  emit('update:hotkey', null);
}
</script>

<template>
  <section class="edit-section">
    <div class="edit-section-header">
      <AppIcon name="keyboard" :size="16" />
      <span>{{ t('hotkey.title') }}</span>
    </div>

    <div
      class="hotkey-section-display"
      :class="{ listening }"
      tabindex="0"
      @click="startListening"
      @keydown="onKeyDown"
      @mousedown="onMouseDown"
    >
      <template v-if="listening">
        <span class="hotkey-section-listening">{{ t('hotkey.pressKeys') }}</span>
      </template>
      <template v-else-if="captured">
        <span class="hotkey-section-keys">{{ captured }}</span>
      </template>
      <template v-else>
        <span class="hotkey-section-empty">{{ t('hotkey.noHotkey') }}</span>
      </template>
    </div>

    <div v-if="conflict" class="hotkey-section-conflict">
      {{ t('hotkey.conflict', { name: conflict }) }}
    </div>

    <div class="hotkey-section-actions">
      <button v-if="props.hotkey" class="hotkey-section-btn remove" @click="onRemove">
        {{ t('hotkey.remove') }}
      </button>
      <button class="hotkey-section-btn record" @click="startListening">
        {{ t('hotkey.record') }}
      </button>
      <button
        v-if="dirty"
        class="hotkey-section-btn save"
        :disabled="!!conflict"
        @click="onSave"
      >
        {{ t('hotkey.save') }}
      </button>
    </div>
  </section>
</template>

<style src="../../styles/edit-section.css"></style>

<style scoped>
.hotkey-section-display {
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

.hotkey-section-display:focus,
.hotkey-section-display.listening {
  border-color: var(--color-accent);
}

.hotkey-section-listening {
  font-size: 0.8rem;
  color: var(--color-accent);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.hotkey-section-keys {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-white, #fff);
  font-family: monospace;
  letter-spacing: 0.5px;
}

.hotkey-section-empty {
  font-size: 0.8rem;
  color: var(--color-text-dimmer);
}

.hotkey-section-conflict {
  font-size: 0.7rem;
  color: var(--color-error, #e53935);
  margin-top: 8px;
  text-align: center;
}

.hotkey-section-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  justify-content: flex-end;
}

.hotkey-section-btn {
  border: none;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: opacity 0.15s;
}

.hotkey-section-btn:hover {
  opacity: 0.85;
}

.hotkey-section-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.hotkey-section-btn.save {
  background: var(--color-accent);
  color: #000;
}

.hotkey-section-btn.record {
  background: #333;
  color: var(--color-text-white, #fff);
}

.hotkey-section-btn.remove {
  background: none;
  color: var(--color-error, #e53935);
  margin-right: auto;
}
</style>
