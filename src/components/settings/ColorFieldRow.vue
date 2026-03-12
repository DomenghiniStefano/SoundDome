<script setup lang="ts">
import { computed } from 'vue';
import { hexToRgb, rgbToHex } from '../../utils/color';

const props = defineProps<{
  color: string;
  label: string;
  hint: string;
  active: boolean;
}>();

const emit = defineEmits<{
  select: [];
  'update:color': [value: string];
}>();

const rgb = computed(() => {
  try {
    return hexToRgb(props.color);
  } catch {
    return { r: 0, g: 0, b: 0 };
  }
});

function onHexInput(e: Event) {
  emit('update:color', (e.target as HTMLInputElement).value);
}

function onRgbChannelInput(channel: 'r' | 'g' | 'b', e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value, 10);
  if (isNaN(val) || val < 0 || val > 255) return;
  const { r, g, b } = rgb.value;
  const updated = { r, g, b, [channel]: val };
  emit('update:color', rgbToHex(updated.r, updated.g, updated.b));
}
</script>

<template>
  <div
    class="color-field"
    :class="{ active }"
    @click="$emit('select')"
  >
    <div class="swatch" :style="{ background: color }" />
    <div class="color-field-info">
      <span class="color-field-label">{{ label }}</span>
      <span class="color-field-hint">{{ hint }}</span>
      <div class="color-inputs">
        <div class="color-input-group">
          <span class="color-input-prefix">HEX</span>
          <input
            type="text"
            class="color-input"
            :value="color"
            maxlength="7"
            @input="onHexInput"
            @click.stop="$emit('select')"
          />
        </div>
        <div class="color-input-group rgb-group">
          <span class="color-input-prefix">RGB</span>
          <input
            type="number"
            class="color-input color-input--channel"
            :value="rgb.r"
            min="0" max="255"
            @change="onRgbChannelInput('r', $event)"
            @click.stop="$emit('select')"
          />
          <input
            type="number"
            class="color-input color-input--channel"
            :value="rgb.g"
            min="0" max="255"
            @change="onRgbChannelInput('g', $event)"
            @click.stop="$emit('select')"
          />
          <input
            type="number"
            class="color-input color-input--channel"
            :value="rgb.b"
            min="0" max="255"
            @change="onRgbChannelInput('b', $event)"
            @click.stop="$emit('select')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-field {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 2px solid transparent;
  border-radius: var(--small-radius);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.color-field:hover {
  background: var(--bg-surface-hover);
}

.color-field.active {
  border-color: var(--accent);
  background: var(--accent-subtle);
}

.swatch {
  width: 28px;
  height: 28px;
  border-radius: var(--small-radius);
  border: 1px solid var(--border-default);
  flex-shrink: 0;
}

.color-field-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.color-field-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.color-field-hint {
  font-size: 0.68rem;
  color: var(--text-tertiary);
  line-height: 1.2;
}

.color-inputs {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}

.color-input-group {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--small-radius);
  overflow: hidden;
  background: var(--bg-input);
  transition: border-color 0.15s;
}

.color-input-group:focus-within {
  border-color: var(--accent);
}

.color-input-prefix {
  padding: 3px 6px;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--text-tertiary);
  background: var(--bg-card-hover);
  border-right: 1px solid var(--border-default);
  user-select: none;
  line-height: 1;
}

.color-input {
  width: 62px;
  padding: 3px 6px;
  font-size: 0.75rem;
  font-family: monospace;
  background: transparent;
  border: none;
  color: var(--text-primary);
  outline: none;
}

.color-input:focus {
  background: var(--bg-card);
}

.color-input--channel {
  border-left: 1px solid var(--border-default);
  width: 38px;
  -moz-appearance: textfield;
}

.color-input--channel::-webkit-outer-spin-button,
.color-input--channel::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
