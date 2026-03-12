export const SettingsTab = {
  GENERAL: 'general',
  AUDIO: 'audio',
  DATA: 'data',
  THEME: 'theme',
} as const;

export type SettingsTabValue = (typeof SettingsTab)[keyof typeof SettingsTab];

export const Theme = {
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system',
} as const;

export type ThemeValue = (typeof Theme)[keyof typeof Theme];

const CUSTOM_PREFIX = 'custom:';

export function isCustomTheme(theme: string): boolean {
  return theme.startsWith(CUSTOM_PREFIX);
}

export function getCustomThemeId(theme: string): string {
  return theme.substring(CUSTOM_PREFIX.length);
}

export function makeCustomThemeValue(id: string): string {
  return `${CUSTOM_PREFIX}${id}`;
}
