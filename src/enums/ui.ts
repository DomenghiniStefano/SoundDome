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

export const ImagePrefix = {
  ICON: 'icon:',
  EMOJI: 'emoji:',
} as const;

export type ImagePrefixValue = (typeof ImagePrefix)[keyof typeof ImagePrefix];

export function parseImage(image: string | null | undefined) {
  if (!image) return { type: 'none' as const, value: null };
  if (image.startsWith(ImagePrefix.ICON)) return { type: 'icon' as const, value: image.slice(ImagePrefix.ICON.length) };
  if (image.startsWith(ImagePrefix.EMOJI)) return { type: 'emoji' as const, value: image.slice(ImagePrefix.EMOJI.length) };
  return { type: 'file' as const, value: image };
}

export function isFileImage(image: string | null | undefined): boolean {
  return parseImage(image).type === 'file';
}

export const PickerTab = {
  EMOJI: 'emoji',
  ICONS: 'icons',
} as const;

export type PickerTabValue = (typeof PickerTab)[keyof typeof PickerTab];

export const EMOJI_CHOICES = [
  '🔥', '💥', '🎵', '🎶', '🎸', '🥁', '🎺', '🎤',
  '👏', '😂', '😱', '💀', '👀', '🤡', '👑', '🎯',
  '⚡', '🚨', '🔔', '📢', '💣', '🎮', '🏆', '❤️',
  '✅', '❌', '⭐', '🌊', '🐶', '🐱', '🦆', '🐸',
  '💩', '🤮', '🍑', '🍆', '🤯', '😈', '👹', '💅',
  '🧠', '🤓', '🥴', '🫠', '🗿', '💀', '☠️', '👽',
  '🤖', '👻', '🎃', '😤', '🥶', '🤑', '🫡', '🤌',
] as const;

export const ICON_CHOICES = [
  'music', 'headphones', 'microphone', 'megaphone',
  'bell', 'star', 'flash', 'fire',
  'heart', 'skull', 'emoji', 'gaming',
  'warning', 'cloud', 'pets', 'volume-high',
  'poop', 'bomb', 'crown', 'devil',
  'alien', 'ghost', 'rocket', 'toilet',
  'clown', 'thumbsup', 'thumbsdown', 'target',
] as const;
