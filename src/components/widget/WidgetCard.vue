<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import ImageThumbnail from '../ui/ImageThumbnail.vue';
import { isCustomImage, ImageType } from '../../enums/ui';
import { IconName } from '../../enums/icons';
import type { ParsedImage } from '../../enums/ui';
import { useAudio } from '../../composables/useAudio';

const props = defineProps<{
  item: LibraryItem;
  imageUrl?: string;
  parsedImage: ParsedImage;
}>();

const { t } = useI18n();
const { playLibraryItem, previewLibraryItem, stopPreview, playingCardId, previewingCardId } = useAudio();

const isPlaying = computed(() => playingCardId.value === props.item.id);
const isPreviewing = computed(() => previewingCardId.value === props.item.id);

function onPlay() {
  playLibraryItem(props.item);
}

function onPreview() {
  if (isPreviewing.value) {
    stopPreview();
  } else {
    previewLibraryItem(props.item);
  }
}
</script>

<template>
  <button
    class="widget-card"
    :class="{
      'widget-card-playing': isPlaying,
      'widget-card-previewing': isPreviewing
    }"
    v-tooltip="item.name"
    @click="onPlay"
  >
    <span class="widget-card-glow" />
    <span class="widget-card-content">
      <span class="widget-card-icon" :class="{
        'has-image': parsedImage.type === ImageType.FILE,
        'has-custom': isCustomImage(parsedImage)
      }">
        <ImageThumbnail :parsed="parsedImage" :image-url="imageUrl" :icon-size="14" :fallback-icon="IconName.PLAY_ROUNDED" size="sm" />
      </span>
      <span class="widget-card-text">
        <span class="widget-name" v-tooltip="item.name">{{ item.name }}</span>
        <span v-if="item.hotkey" class="widget-hotkey-row">
          <span class="widget-hotkey widget-hotkey-play">
            <AppIcon name="play-rounded" :size="8" />
            {{ item.hotkey }}
          </span>
        </span>
      </span>
    </span>
    <span
      class="widget-preview"
      :class="{ 'widget-preview-active': isPreviewing }"
      @click.stop="onPreview"
      v-tooltip="t('widget.preview')"
    >
      <AppIcon name="headphones" :size="10" />
    </span>
  </button>
</template>

<style scoped>
.widget-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid var(--bg-surface-hover);
  background: var(--bg-surface-subtle);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  font-family: inherit;
  color: inherit;
  text-align: left;
}

.widget-card:hover {
  background: var(--bg-surface-hover);
  border-color: var(--bg-surface-active);
  transform: translateY(-1px);
}

.widget-card:active {
  transform: scale(0.97);
}

/* ── Playing state ── */
.widget-card-playing {
  border-color: var(--accent-muted);
  background: var(--accent-subtle);
}

.widget-card-playing:hover {
  background: var(--accent-subtle);
  border-color: var(--accent-muted);
}

.widget-card-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 50% 50%,
    var(--accent-subtle) 0%,
    transparent 70%
  );
}

.widget-card-playing .widget-card-glow {
  opacity: 1;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ── Previewing state ── */
.widget-card-previewing {
  border-color: var(--bg-surface-active);
}

/* ── Content ── */
.widget-card-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.widget-card-icon {
  flex-shrink: 0;
  width: var(--widget-icon-size, 22px);
  height: var(--widget-icon-size, 22px);
  border-radius: 50%;
  background: var(--bg-surface-hover);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.widget-card-icon.has-image {
  padding: 0;
  overflow: hidden;
}

.widget-card-icon.has-custom {
  background: transparent;
}

.widget-card:hover .widget-card-icon:not(.has-image):not(.has-custom) {
  background: var(--accent);
  color: var(--text-inverse);
}

.widget-card-playing .widget-card-icon:not(.has-image):not(.has-custom),
.widget-card-playing:hover .widget-card-icon:not(.has-image):not(.has-custom) {
  background: var(--accent);
  color: var(--text-inverse);
}

.widget-card-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.widget-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  line-height: 1.3;
}

.widget-hotkey-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.widget-hotkey {
  font-size: 9px;
  color: var(--text-tertiary);
  font-weight: 500;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.widget-hotkey-play {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--accent);
  opacity: 0.8;
}

.widget-hotkey-play svg {
  flex-shrink: 0;
  vertical-align: middle;
  display: block;
}

/* ── Preview button ── */
.widget-preview {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;
}

.widget-card:hover .widget-preview {
  opacity: 0.7;
}

.widget-preview:hover {
  opacity: 1 !important;
  color: var(--text-primary);
  background: var(--bg-surface-active);
}

.widget-preview-active {
  opacity: 1 !important;
  color: var(--color-error);
}

.widget-preview-active:hover {
  color: var(--color-error);
  background: var(--color-error-subtle);
}
</style>
