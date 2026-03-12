export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
}

export function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r * (1 - amount),
    g * (1 - amount),
    b * (1 - amount),
  );
}

export function mix(hex1: string, hex2: string, weight: number): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return rgbToHex(
    c1.r * weight + c2.r * (1 - weight),
    c1.g * weight + c2.g * (1 - weight),
    c1.b * weight + c2.b * (1 - weight),
  );
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastColor(hex: string): string {
  return luminance(hex) > 0.179 ? '#000000' : '#ffffff';
}

const CUSTOM_THEME_VARS = [
  '--bg-primary', '--bg-secondary', '--bg-card', '--bg-card-hover', '--bg-input',
  '--bg-active', '--text-primary', '--text-secondary', '--text-tertiary',
  '--text-on-accent', '--accent', '--accent-hover', '--accent-subtle', '--accent-muted',
  '--border-default', '--color-success', '--color-success-subtle',
] as const;

export function buildCustomThemeVars(theme: CustomThemeData): Record<string, string> {
  const isDark = luminance(theme.bgPrimary) < 0.179;
  const adjustBg = isDark ? lighten : darken;
  const adjustAccent = isDark ? lighten : darken;

  return {
    '--bg-primary': theme.bgPrimary,
    '--bg-secondary': darken(theme.bgPrimary, 0.08),
    '--bg-card': theme.bgCard,
    '--bg-card-hover': adjustBg(theme.bgCard, 0.04),
    '--bg-input': adjustBg(theme.bgCard, 0.04),
    '--bg-active': withAlpha(theme.accent, 0.12),
    '--text-primary': theme.textPrimary,
    '--text-secondary': mix(theme.textPrimary, theme.bgPrimary, 0.55),
    '--text-tertiary': mix(theme.textPrimary, theme.bgPrimary, 0.40),
    '--text-on-accent': getContrastColor(theme.accent),
    '--accent': theme.accent,
    '--accent-hover': adjustAccent(theme.accent, 0.08),
    '--accent-subtle': withAlpha(theme.accent, 0.12),
    '--accent-muted': withAlpha(theme.accent, 0.25),
    '--border-default': adjustBg(theme.bgPrimary, 0.12),
    '--color-success': theme.accent,
    '--color-success-subtle': withAlpha(theme.accent, 0.15),
  };
}

export function clearCustomThemeVars(): void {
  const style = document.documentElement.style;
  for (const varName of CUSTOM_THEME_VARS) {
    style.removeProperty(varName);
  }
}

function resolveVar(style: CSSStyleDeclaration, name: string): string {
  return style.getPropertyValue(name).trim();
}

export function resolveThemePreviewColors(dataTheme: string): {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  textPrimary: string;
  accent: string;
} {
  const probe = document.createElement('div');
  probe.setAttribute('data-theme', dataTheme);
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  document.body.appendChild(probe);

  const style = getComputedStyle(probe);
  const colors = {
    bgPrimary: resolveVar(style, '--bg-primary'),
    bgSecondary: resolveVar(style, '--bg-secondary'),
    bgCard: resolveVar(style, '--bg-card'),
    textPrimary: resolveVar(style, '--text-primary'),
    accent: resolveVar(style, '--accent'),
  };

  document.body.removeChild(probe);
  return colors;
}
