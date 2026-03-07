<script setup lang="ts">
import AppIcon from './AppIcon.vue';
import { ImageType } from '../../enums/ui';
import { IconName } from '../../enums/icons';
import type { IconNameValue } from '../../enums/icons';
import type { ParsedImage, ThumbnailSizeValue } from '../../enums/ui';

defineProps<{
  parsed: ParsedImage;
  imageUrl?: string | null;
  iconSize?: number;
  fallbackIcon?: IconNameValue;
  size?: ThumbnailSizeValue;
}>();
</script>

<template>
  <img v-if="parsed.type === ImageType.FILE && imageUrl" :src="imageUrl" alt="" class="thumb-img" />
  <span v-else-if="parsed.type === ImageType.EMOJI" class="thumb-emoji" :class="size">{{ parsed.value }}</span>
  <AppIcon v-else-if="parsed.type === ImageType.ICON" :name="(parsed.value as IconNameValue)" :size="iconSize ?? 16" />
  <span v-else-if="parsed.type === ImageType.TEXT" class="thumb-text" :class="size">{{ parsed.value }}</span>
  <AppIcon v-else :name="fallbackIcon ?? IconName.PLAY" :size="iconSize ?? 16" />
</template>

<style scoped>
.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-emoji {
  line-height: 1;
  font-size: 18px;
}

.thumb-emoji.sm {
  font-size: 14px;
}

.thumb-emoji.lg {
  font-size: 28px;
}

.thumb-text {
  font-weight: 700;
  color: currentColor;
  line-height: 1.1;
  text-align: center;
  word-break: break-all;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  font-size: 8px;
  max-width: 32px;
  -webkit-line-clamp: 2;
}

.thumb-text.sm {
  font-size: 6px;
  max-width: 20px;
}

.thumb-text.lg {
  font-size: 12px;
  max-width: none;
  padding: 2px;
  -webkit-line-clamp: 3;
}
</style>
