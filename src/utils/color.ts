export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
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

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const v = Math.round(max * 100);
  return { h, s, v };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const sn = s / 100;
  const vn = v / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;

  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function hexToHue(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  if (delta === 0) return 0;
  let h = 0;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
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
  '--color-error', '--color-error-hover', '--color-error-subtle', '--color-error-muted',
  '--btn-danger-bg', '--btn-danger-hover',
  '--color-warning', '--color-warning-subtle',
  '--color-info', '--color-info-subtle',
  '--slider-bg', '--scrollbar-thumb',
] as const;

export function buildCustomThemeVars(theme: CustomThemeData): Record<string, string> {
  const isDark = luminance(theme.bgPrimary) < 0.179;
  const adjustBg = isDark ? lighten : darken;
  const adjustAccent = isDark ? lighten : darken;
  const adjustStatus = isDark ? lighten : darken;

  const bgSecondary = theme.bgSecondary || darken(theme.bgPrimary, 0.08);
  const textSecondary = theme.textSecondary || mix(theme.textPrimary, theme.bgPrimary, 0.55);
  const borderDefault = theme.borderDefault || adjustBg(theme.bgPrimary, 0.12);
  const colorError = theme.colorError || (isDark ? '#e74c3c' : '#e53935');
  const colorWarning = theme.colorWarning || (isDark ? '#e2b714' : '#ca8a04');
  const colorInfo = theme.colorInfo || (isDark ? '#3b82f6' : '#2563eb');

  return {
    '--bg-primary': theme.bgPrimary,
    '--bg-secondary': bgSecondary,
    '--bg-card': theme.bgCard,
    '--bg-card-hover': adjustBg(theme.bgCard, 0.04),
    '--bg-input': adjustBg(theme.bgCard, 0.04),
    '--bg-active': withAlpha(theme.accent, 0.12),
    '--text-primary': theme.textPrimary,
    '--text-secondary': textSecondary,
    '--text-tertiary': mix(theme.textPrimary, theme.bgPrimary, 0.40),
    '--text-on-accent': getContrastColor(theme.accent),
    '--accent': theme.accent,
    '--accent-hover': adjustAccent(theme.accent, 0.08),
    '--accent-subtle': withAlpha(theme.accent, 0.12),
    '--accent-muted': withAlpha(theme.accent, 0.25),
    '--border-default': borderDefault,
    '--color-success': theme.accent,
    '--color-success-subtle': withAlpha(theme.accent, 0.15),
    '--color-error': colorError,
    '--color-error-hover': adjustStatus(colorError, 0.08),
    '--color-error-subtle': withAlpha(colorError, 0.15),
    '--color-error-muted': withAlpha(colorError, 0.25),
    '--btn-danger-bg': isDark ? darken(colorError, 0.15) : colorError,
    '--btn-danger-hover': adjustStatus(colorError, 0.08),
    '--color-warning': colorWarning,
    '--color-warning-subtle': withAlpha(colorWarning, 0.15),
    '--color-info': colorInfo,
    '--color-info-subtle': withAlpha(colorInfo, 0.15),
    '--slider-bg': borderDefault,
    '--scrollbar-thumb': borderDefault,
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

export function resolveCurrentThemeColors(): {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  textPrimary: string;
  accent: string;
  textSecondary: string;
  borderDefault: string;
  colorError: string;
  colorWarning: string;
  colorInfo: string;
} {
  const style = getComputedStyle(document.documentElement);
  return {
    bgPrimary: resolveVar(style, '--bg-primary'),
    bgSecondary: resolveVar(style, '--bg-secondary'),
    bgCard: resolveVar(style, '--bg-card'),
    textPrimary: resolveVar(style, '--text-primary'),
    accent: resolveVar(style, '--accent'),
    textSecondary: resolveVar(style, '--text-secondary'),
    borderDefault: resolveVar(style, '--border-default'),
    colorError: resolveVar(style, '--color-error'),
    colorWarning: resolveVar(style, '--color-warning'),
    colorInfo: resolveVar(style, '--color-info'),
  };
}

export function resolveThemePreviewColors(dataTheme: string): {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  textPrimary: string;
  accent: string;
  textSecondary: string;
  borderDefault: string;
  colorError: string;
  colorWarning: string;
  colorInfo: string;
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
    textSecondary: resolveVar(style, '--text-secondary'),
    borderDefault: resolveVar(style, '--border-default'),
    colorError: resolveVar(style, '--color-error'),
    colorWarning: resolveVar(style, '--color-warning'),
    colorInfo: resolveVar(style, '--color-info'),
  };

  document.body.removeChild(probe);
  return colors;
}
