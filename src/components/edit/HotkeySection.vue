<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';

const props = defineProps<{
  name: string;
  hotkey: string | null;
  usedHotkeys: Map<string, string>;
}>();

const emit = defineEmits<{
  'update:hotkey': [value: string | null];
}>();

const { t } = useI18n();

const captured = ref<string | null>(props.hotkey);
const listening = ref(false);
const dirty = ref(false);

const conflict = computed(() => {
  if (!captured.value) return null;
  const owner = props.usedHotkeys.get(captured.value);
  if (owner && owner !== props.name) return owner;
  return null;
});

watch(() => props.hotkey, (v) => {
  captured.value = v;
  dirty.value = false;
});

function startListening() {
  listening.value = true;
}

function onKeyDown(e: KeyboardEvent) {
  if (!listening.value) return;
  e.preventDefault();
  e.stopPropagation();

  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  const key = mapKey(e);
  if (key) parts.push(key);

  if (parts.length > 0) {
    captured.value = parts.join('+');
    listening.value = false;
    dirty.value = true;
  }
}

function mapKey(e: KeyboardEvent): string {
  if (e.code.startsWith('Key') && e.code.length === 4) return e.code.slice(3);
  if (e.code.startsWith('Digit') && e.code.length === 6) return e.code.slice(5);
  if (e.code.startsWith('F') && e.code.length >= 2 && e.code.length <= 3) {
    const num = parseInt(e.code.slice(1));
    if (num >= 1 && num <= 24) return e.code;
  }
  if (e.code.startsWith('Numpad')) {
    const suffix = e.code.slice(6);
    const numpadMap: Record<string, string> = {
      '0': 'num0', '1': 'num1', '2': 'num2', '3': 'num3', '4': 'num4',
      '5': 'num5', '6': 'num6', '7': 'num7', '8': 'num8', '9': 'num9',
      'Add': 'numadd', 'Subtract': 'numsub', 'Multiply': 'nummult',
      'Divide': 'numdiv', 'Decimal': 'numdec', 'Enter': 'Enter',
    };
    return numpadMap[suffix] ?? suffix;
  }
  const specialMap: Record<string, string> = {
    'Space': 'Space', 'ArrowUp': 'Up', 'ArrowDown': 'Down',
    'ArrowLeft': 'Left', 'ArrowRight': 'Right', 'Enter': 'Return',
    'Escape': 'Escape', 'Backspace': 'Backspace', 'Delete': 'Delete',
    'Tab': 'Tab', 'Home': 'Home', 'End': 'End',
    'PageUp': 'PageUp', 'PageDown': 'PageDown', 'Insert': 'Insert',
    'Minus': '-', 'Equal': '=', 'BracketLeft': '[', 'BracketRight': ']',
    'Backslash': '\\', 'Semicolon': ';', 'Quote': "'",
    'Comma': ',', 'Period': '.', 'Slash': '/', 'Backquote': '`',
  };
  if (specialMap[e.code]) return specialMap[e.code];
  return e.code;
}

function onSave() {
  emit('update:hotkey', captured.value);
  dirty.value = false;
}

function onRemove() {
  captured.value = null;
  dirty.value = false;
  emit('update:hotkey', null);
}
</script>

<template>
  <section class="edit-section">
    <div class="edit-section-header">
      <AppIcon name="keyboard" :size="16" />
      <span>Hotkey</span>
    </div>

    <div
      class="hotkey-section-display"
      :class="{ listening }"
      tabindex="0"
      @click="startListening"
      @keydown="onKeyDown"
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

<style scoped>
.edit-section {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  padding: 16px 20px;
}

.edit-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-white, #fff);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 14px;
}

.edit-section-header svg {
  color: var(--color-accent);
}

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
