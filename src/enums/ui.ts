export const ToastType = {
  INFO: '',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type ToastTypeValue = (typeof ToastType)[keyof typeof ToastType];
export const toastTypes = Object.values(ToastType);

export const ConfirmAction = {
  SINGLE: 'single',
  ALL: 'all',
} as const;

export type ConfirmActionValue = (typeof ConfirmAction)[keyof typeof ConfirmAction];
export const confirmActions = Object.values(ConfirmAction);

export const ThumbnailSize = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
} as const;

export type ThumbnailSizeValue = (typeof ThumbnailSize)[keyof typeof ThumbnailSize];

export const ImageType = {
  NONE: 'none',
  ICON: 'icon',
  EMOJI: 'emoji',
  TEXT: 'text',
  FILE: 'file',
} as const;

export type ImageTypeValue = (typeof ImageType)[keyof typeof ImageType];

export const ImagePrefix = {
  ICON: 'icon:',
  EMOJI: 'emoji:',
  TEXT: 'text:',
} as const;

export type ImagePrefixValue = (typeof ImagePrefix)[keyof typeof ImagePrefix];

export function parseImage(image: string | null | undefined) {
  if (!image) return { type: ImageType.NONE, value: null };
  if (image.startsWith(ImagePrefix.ICON)) return { type: ImageType.ICON, value: image.slice(ImagePrefix.ICON.length) };
  if (image.startsWith(ImagePrefix.EMOJI)) return { type: ImageType.EMOJI, value: image.slice(ImagePrefix.EMOJI.length) };
  if (image.startsWith(ImagePrefix.TEXT)) return { type: ImageType.TEXT, value: image.slice(ImagePrefix.TEXT.length) };
  return { type: ImageType.FILE, value: image };
}

export type ParsedImage = ReturnType<typeof parseImage>;

export function isCustomImage(parsed: ParsedImage): boolean {
  return parsed.type === ImageType.ICON || parsed.type === ImageType.EMOJI || parsed.type === ImageType.TEXT;
}

export function isFileImage(image: string | null | undefined): boolean {
  return parseImage(image).type === ImageType.FILE;
}

export const UpdateStatus = {
  IDLE: 'idle',
  CHECKING: 'checking',
  AVAILABLE: 'available',
  DOWNLOADING: 'downloading',
  READY: 'ready',
  UP_TO_DATE: 'up-to-date',
  ERROR: 'error',
} as const;

export type UpdateStatusValue = (typeof UpdateStatus)[keyof typeof UpdateStatus];

import { IconName } from './icons';
import type { IconNameValue } from './icons';

export const ICON_PRESETS: readonly IconNameValue[] = [
  IconName.MUSIC, IconName.HEADPHONES, IconName.MICROPHONE, IconName.MEGAPHONE,
  IconName.BELL, IconName.STAR, IconName.FLASH, IconName.FIRE,
  IconName.HEART, IconName.SKULL, IconName.GAMING, IconName.BOMB,
  IconName.CROWN, IconName.GHOST, IconName.ROCKET, IconName.TARGET,
];
