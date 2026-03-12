<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue';
import { hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from '../../utils/color';

const props = defineProps<{
  color: string;
}>();

const emit = defineEmits<{
  'update:color': [payload: { hex: string; rgb: { r: number; g: number; b: number } }];
}>();

const hue = ref(0);
const sat = ref(100);
const val = ref(100);
const dragging = ref(false);

const svArea = ref<HTMLElement | null>(null);

const hueColor = computed(() => `hsl(${hue.value}, 100%, 50%)`);

const thumbLeft = computed(() => `${sat.value}%`);
const thumbTop = computed(() => `${100 - val.value}%`);

function setFromHex(hex: string, preserveHue: boolean) {
  const { r, g, b } = hexToRgb(hex);
  const hsv = rgbToHsv(r, g, b);
  if (!preserveHue || hsv.s > 0) {
    hue.value = hsv.h;
  }
  sat.value = hsv.s;
  val.value = hsv.v;
}

function emitColor() {
  const { r, g, b } = hsvToRgb(hue.value, sat.value, val.value);
  const hex = rgbToHex(r, g, b);
  emit('update:color', { hex, rgb: { r, g, b } });
}

// Init from prop
setFromHex(props.color, false);

watch(() => props.color, (hex) => {
  if (dragging.value) return;
  setFromHex(hex, true);
});

// SV area pointer handling
function onSvPointerDown(e: PointerEvent) {
  dragging.value = true;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  updateSvFromEvent(e);
}

function onSvPointerMove(e: PointerEvent) {
  if (!dragging.value) return;
  updateSvFromEvent(e);
}

function onSvPointerUp() {
  dragging.value = false;
}

function updateSvFromEvent(e: PointerEvent) {
  if (!svArea.value) return;
  const rect = svArea.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
  sat.value = Math.round(x * 100);
  val.value = Math.round((1 - y) * 100);
  emitColor();
}

function onHueInput(e: Event) {
  hue.value = Number((e.target as HTMLInputElement).value);
  emitColor();
}

onBeforeUnmount(() => {
  dragging.value = false;
});
</script>

<template>
  <div class="color-space-picker">
    <div
      ref="svArea"
      class="sv-area"
      :style="{ backgroundColor: hueColor }"
      @pointerdown="onSvPointerDown"
      @pointermove="onSvPointerMove"
      @pointerup="onSvPointerUp"
    >
      <div
        class="sv-thumb"
        :style="{ left: thumbLeft, top: thumbTop }"
      />
    </div>

    <input
      type="range"
      class="hue-slider"
      min="0"
      max="360"
      :value="hue"
      @input="onHueInput"
    />
  </div>
</template>

<style scoped>
.color-space-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 260px;
}

.sv-area {
  position: relative;
  width: 100%;
  height: 180px;
  border-radius: 10px;
  cursor: crosshair;
  touch-action: none;
  background-image:
    linear-gradient(to bottom, rgba(0, 0, 0, 0), #000),
    linear-gradient(to right, #fff, rgba(255, 255, 255, 0));
}

.sv-thumb {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3), 0 0 4px rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.hue-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  border-radius: 10px;
  outline: none;
  background: linear-gradient(to right,
    hsl(0, 100%, 50%),
    hsl(30, 100%, 50%),
    hsl(60, 100%, 50%),
    hsl(90, 100%, 50%),
    hsl(120, 100%, 50%),
    hsl(150, 100%, 50%),
    hsl(180, 100%, 50%),
    hsl(210, 100%, 50%),
    hsl(240, 100%, 50%),
    hsl(270, 100%, 50%),
    hsl(300, 100%, 50%),
    hsl(330, 100%, 50%),
    hsl(360, 100%, 50%)
  );
}

.hue-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 24px;
  border-radius: 5px;
  background: transparent;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3), 0 0 4px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}

.hue-slider::-moz-range-thumb {
  width: 10px;
  height: 24px;
  border-radius: 5px;
  background: transparent;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3), 0 0 4px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}
</style>
