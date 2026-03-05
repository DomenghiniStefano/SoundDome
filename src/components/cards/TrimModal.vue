<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import AppIcon from '../ui/AppIcon.vue';
import { useLibraryStore } from '../../stores/library';

const props = defineProps<{
  visible: boolean;
  item: LibraryItem;
}>();

const emit = defineEmits<{
  close: [];
  trimmed: [];
}>();

const { t } = useI18n();
const libraryStore = useLibraryStore();

const waveformRef = ref<HTMLDivElement>();
const startTime = ref(0);
const endTime = ref(0);
const duration = ref(0);
const saving = ref(false);
const testing = ref(false);
const error = ref('');

let wavesurfer: WaveSurfer | null = null;
let regionsPlugin: RegionsPlugin | null = null;
let activeRegion: ReturnType<RegionsPlugin['addRegion']> | null = null;
let testAudio: HTMLAudioElement | null = null;

const MIN_DURATION = 0.1;

function formatTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const minutes = Math.floor(clamped / 60);
  const secs = (clamped % 60).toFixed(2);
  return `${minutes}:${secs.padStart(5, '0')}`;
}

function parseTime(input: string): number {
  const parts = input.split(':');
  if (parts.length === 2) {
    return Math.max(0, Number(parts[0]) * 60 + Number(parts[1]));
  }
  return Math.max(0, Number(input) || 0);
}

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

async function resolveFileUrl(): Promise<string> {
  const filePath = await libraryStore.getFilePath(props.item.filename);
  return `file://${filePath}`;
}

function destroyWavesurfer() {
  stopTest();
  if (wavesurfer) {
    wavesurfer.destroy();
    wavesurfer = null;
    regionsPlugin = null;
    activeRegion = null;
  }
}

async function initWavesurfer() {
  destroyWavesurfer();
  error.value = '';
  await nextTick();

  if (!waveformRef.value) return;

  const fileUrl = await resolveFileUrl();

  regionsPlugin = RegionsPlugin.create();

  wavesurfer = WaveSurfer.create({
    container: waveformRef.value,
    waveColor: '#555',
    progressColor: '#1db954',
    cursorColor: '#1db954',
    height: 100,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    normalize: true,
    plugins: [regionsPlugin]
  });

  wavesurfer.on('ready', () => {
    duration.value = wavesurfer!.getDuration();
    endTime.value = duration.value;
    startTime.value = 0;

    activeRegion = regionsPlugin!.addRegion({
      start: 0,
      end: duration.value,
      color: 'rgba(29, 185, 84, 0.15)',
      drag: false,
      resize: true
    });

    activeRegion.on('update-end', () => {
      if (!activeRegion) return;
      startTime.value = roundToHundredths(activeRegion.start);
      endTime.value = roundToHundredths(activeRegion.end);
    });
  });

  wavesurfer.load(fileUrl);
}

watch(() => props.visible, (visible) => {
  if (visible) {
    initWavesurfer();
  } else {
    destroyWavesurfer();
    error.value = '';
  }
});

onBeforeUnmount(() => {
  destroyWavesurfer();
});

function syncRegion(field: 'start' | 'end') {
  if (!activeRegion) return;
  activeRegion.setOptions({
    [field]: field === 'start' ? startTime.value : endTime.value
  });
}

function onStartChange(e: Event) {
  const parsed = parseTime((e.target as HTMLInputElement).value);
  startTime.value = Math.min(parsed, endTime.value - MIN_DURATION);
  syncRegion('start');
}

function onEndChange(e: Event) {
  const parsed = parseTime((e.target as HTMLInputElement).value);
  endTime.value = Math.min(Math.max(parsed, startTime.value + MIN_DURATION), duration.value);
  syncRegion('end');
}

async function onTest() {
  if (testing.value) {
    stopTest();
    return;
  }

  const fileUrl = await resolveFileUrl();

  testAudio = new Audio(fileUrl);
  testAudio.currentTime = startTime.value;
  testing.value = true;

  const trimEnd = endTime.value;

  testAudio.addEventListener('timeupdate', () => {
    if (testAudio && testAudio.currentTime >= trimEnd) {
      stopTest();
    }
  });
  testAudio.addEventListener('ended', () => stopTest());
  testAudio.play();
}

function stopTest() {
  if (testAudio) {
    testAudio.pause();
    testAudio.src = '';
    testAudio = null;
  }
  testing.value = false;
}

async function onTrimSave() {
  saving.value = true;
  error.value = '';
  stopTest();

  const result = await libraryStore.trim(props.item.id, startTime.value, endTime.value);
  saving.value = false;

  if (result.success) {
    emit('trimmed');
    emit('close');
  } else {
    error.value = result.error || t('toast.trimError');
  }
}

function onClose() {
  stopTest();
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="trim-modal-overlay" @click="onClose">
      <div class="trim-modal" @click.stop>
        <div class="trim-modal-header">
          <span class="trim-modal-title">{{ item.name }}</span>
          <button class="trim-modal-close" @click="onClose">
            <AppIcon name="close" :size="16" />
          </button>
        </div>

        <div ref="waveformRef" class="trim-waveform" />

        <div class="trim-times">
          <label class="trim-time-field">
            <span>{{ t('library.trimStart') }}</span>
            <input
              type="text"
              :value="formatTime(startTime)"
              @change="onStartChange"
            />
          </label>
          <label class="trim-time-field">
            <span>{{ t('library.trimEnd') }}</span>
            <input
              type="text"
              :value="formatTime(endTime)"
              @change="onEndChange"
            />
          </label>
          <div class="trim-duration">
            <span>{{ t('library.trimDuration') }}</span>
            <span class="trim-duration-value">{{ formatTime(endTime - startTime) }}</span>
          </div>
        </div>

        <div v-if="error" class="trim-error">{{ error }}</div>

        <div class="trim-actions">
          <button class="trim-btn trim-btn-test" :class="{ active: testing }" @click="onTest">
            <AppIcon :name="testing ? 'stop' : 'headphones'" :size="12" />
            {{ t('library.trimTest') }}
          </button>
          <div class="trim-actions-right">
            <button class="trim-btn trim-btn-cancel" @click="onClose">
              {{ t('common.cancel') }}
            </button>
            <button class="trim-btn trim-btn-save" :disabled="saving" @click="onTrimSave">
              {{ saving ? t('library.trimSaving') : t('library.trimSave') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
/* Trim modal (unscoped for Teleport) */
.trim-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trim-modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  padding: 20px;
  width: 560px;
  max-width: 90vw;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.trim-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.trim-modal-title {
  font-size: 0.9rem;
  color: var(--color-text-white, #fff);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.trim-modal-close {
  border: none;
  background: none;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.trim-modal-close:hover {
  color: var(--color-text-white);
}

.trim-waveform {
  background: var(--color-bg, #121212);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 16px;
  min-height: 100px;
}

.trim-error {
  color: var(--color-error);
  font-size: 0.78rem;
  margin-bottom: 12px;
}

.trim-times {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: flex-end;
}

.trim-time-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.trim-time-field span {
  font-size: 0.7rem;
  color: var(--color-text-dimmer);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trim-time-field input {
  background: var(--color-bg-input, #252525);
  border: 1px solid var(--color-border, #333);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--color-text-white, #fff);
  font-size: 0.8rem;
  font-family: monospace;
  outline: none;
  transition: border-color 0.15s;
}

.trim-time-field input:focus {
  border-color: var(--color-accent);
}

.trim-duration {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.trim-duration span {
  font-size: 0.7rem;
  color: var(--color-text-dimmer);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trim-duration-value {
  font-size: 0.8rem;
  font-family: monospace;
  color: var(--color-accent);
  padding: 6px 0;
}

.trim-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.trim-actions-right {
  display: flex;
  gap: 8px;
}

.trim-btn {
  border: none;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s, background 0.15s;
}

.trim-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.trim-btn-test {
  background: var(--color-bg-input);
  color: var(--color-text-white);
}

.trim-btn-test:hover {
  background: var(--color-bg-card-hover);
}

.trim-btn-test.active {
  background: rgba(231, 76, 60, 0.15);
  color: var(--color-error);
}

.trim-btn-cancel {
  background: var(--color-bg-input);
  color: var(--color-text-dimmer);
}

.trim-btn-cancel:hover {
  color: var(--color-text-white);
}

.trim-btn-save {
  background: var(--color-accent);
  color: #000;
  font-weight: 600;
}

.trim-btn-save:hover:not(:disabled) {
  opacity: 0.85;
}
</style>
