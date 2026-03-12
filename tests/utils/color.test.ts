import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  lighten,
  darken,
  mix,
  withAlpha,
  luminance,
  getContrastColor,
  buildCustomThemeVars,
  clearCustomThemeVars,
} from '../../src/utils/color';

describe('color utils', () => {
  describe('hexToRgb', () => {
    it('converts red', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('converts green', () => {
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('converts blue', () => {
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('converts black', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('converts white', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('handles hex without # prefix', () => {
      expect(hexToRgb('ff8000')).toEqual({ r: 255, g: 128, b: 0 });
    });

    it('converts a mid-gray', () => {
      expect(hexToRgb('#808080')).toEqual({ r: 128, g: 128, b: 128 });
    });
  });

  describe('rgbToHex', () => {
    it('converts red', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    });

    it('converts black', () => {
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
    });

    it('converts white', () => {
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
    });

    it('pads single-digit hex values with zero', () => {
      expect(rgbToHex(0, 0, 15)).toBe('#00000f');
    });

    it('clamps values above 255', () => {
      expect(rgbToHex(300, 0, 0)).toBe('#ff0000');
    });

    it('clamps values below 0', () => {
      expect(rgbToHex(-10, 0, 0)).toBe('#000000');
    });

    it('rounds fractional values', () => {
      // 127.6 rounds to 128 = 0x80
      expect(rgbToHex(127.6, 127.6, 127.6)).toBe('#808080');
    });

    it('roundtrips with hexToRgb', () => {
      const hex = '#3a7bc8';
      const { r, g, b } = hexToRgb(hex);
      expect(rgbToHex(r, g, b)).toBe(hex);
    });
  });

  describe('rgbToHsv', () => {
    it('converts red', () => {
      expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 100, v: 100 });
    });

    it('converts green', () => {
      expect(rgbToHsv(0, 255, 0)).toEqual({ h: 120, s: 100, v: 100 });
    });

    it('converts blue', () => {
      expect(rgbToHsv(0, 0, 255)).toEqual({ h: 240, s: 100, v: 100 });
    });

    it('converts black with h=0, not NaN', () => {
      const result = rgbToHsv(0, 0, 0);
      expect(result).toEqual({ h: 0, s: 0, v: 0 });
      expect(Number.isNaN(result.h)).toBe(false);
    });

    it('converts white with h=0, not NaN', () => {
      const result = rgbToHsv(255, 255, 255);
      expect(result).toEqual({ h: 0, s: 0, v: 100 });
      expect(Number.isNaN(result.h)).toBe(false);
    });

    it('converts mid-gray with h=0, not NaN', () => {
      const result = rgbToHsv(128, 128, 128);
      expect(result).toEqual({ h: 0, s: 0, v: 50 });
      expect(Number.isNaN(result.h)).toBe(false);
    });

    it('converts yellow', () => {
      expect(rgbToHsv(255, 255, 0)).toEqual({ h: 60, s: 100, v: 100 });
    });

    it('converts cyan', () => {
      expect(rgbToHsv(0, 255, 255)).toEqual({ h: 180, s: 100, v: 100 });
    });

    it('converts magenta', () => {
      expect(rgbToHsv(255, 0, 255)).toEqual({ h: 300, s: 100, v: 100 });
    });
  });

  describe('hsvToRgb', () => {
    it('converts red', () => {
      expect(hsvToRgb(0, 100, 100)).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('converts green', () => {
      expect(hsvToRgb(120, 100, 100)).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('converts blue', () => {
      expect(hsvToRgb(240, 100, 100)).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('converts black', () => {
      expect(hsvToRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('converts white', () => {
      expect(hsvToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('converts mid-gray', () => {
      expect(hsvToRgb(0, 0, 50)).toEqual({ r: 128, g: 128, b: 128 });
    });

    it('converts yellow', () => {
      expect(hsvToRgb(60, 100, 100)).toEqual({ r: 255, g: 255, b: 0 });
    });

    it('converts cyan', () => {
      expect(hsvToRgb(180, 100, 100)).toEqual({ r: 0, g: 255, b: 255 });
    });

    it('converts magenta', () => {
      expect(hsvToRgb(300, 100, 100)).toEqual({ r: 255, g: 0, b: 255 });
    });

    it('round-trips through rgbToHsv for primary colors', () => {
      const colors = [
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 0, g: 0, b: 255 },
        { r: 255, g: 255, b: 0 },
        { r: 0, g: 255, b: 255 },
        { r: 255, g: 0, b: 255 },
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
      ];
      for (const { r, g, b } of colors) {
        const hsv = rgbToHsv(r, g, b);
        const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
        expect(rgb).toEqual({ r, g, b });
      }
    });
  });

  describe('lighten', () => {
    it('lightens black by 0.5 to mid-gray', () => {
      // r = 0 + (255 - 0) * 0.5 = 127.5 → rounds to 128 = 0x80
      expect(lighten('#000000', 0.5)).toBe('#808080');
    });

    it('lighten white stays white', () => {
      // r = 255 + (255 - 255) * 0.5 = 255
      expect(lighten('#ffffff', 0.5)).toBe('#ffffff');
    });

    it('lighten by 0 returns same color', () => {
      expect(lighten('#ff0000', 0)).toBe('#ff0000');
    });

    it('lighten by 1.0 returns white', () => {
      // r = any + (255 - any) * 1.0 = 255
      expect(lighten('#336699', 1.0)).toBe('#ffffff');
    });

    it('lightens red correctly', () => {
      // r = 255 + (255-255)*0.5 = 255
      // g = 0 + (255-0)*0.5 = 127.5 → 128 = 0x80
      // b = 0 + (255-0)*0.5 = 127.5 → 128 = 0x80
      expect(lighten('#ff0000', 0.5)).toBe('#ff8080');
    });
  });

  describe('darken', () => {
    it('darkens white by 0.5 to mid-gray', () => {
      // r = 255 * (1 - 0.5) = 127.5 → rounds to 128 = 0x80
      expect(darken('#ffffff', 0.5)).toBe('#808080');
    });

    it('darken black stays black', () => {
      // r = 0 * (1 - 0.5) = 0
      expect(darken('#000000', 0.5)).toBe('#000000');
    });

    it('darken by 0 returns same color', () => {
      expect(darken('#ff0000', 0)).toBe('#ff0000');
    });

    it('darken by 1.0 returns black', () => {
      expect(darken('#336699', 1.0)).toBe('#000000');
    });

    it('darkens red correctly', () => {
      // r = 255 * 0.5 = 127.5 → 128 = 0x80
      // g = 0 * 0.5 = 0
      // b = 0 * 0.5 = 0
      expect(darken('#ff0000', 0.5)).toBe('#800000');
    });
  });

  describe('mix', () => {
    it('mixes black and white at 0.5 to mid-gray', () => {
      // r = 0*0.5 + 255*0.5 = 127.5 → 128 = 0x80
      expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    });

    it('weight 1.0 returns first color', () => {
      expect(mix('#ff0000', '#0000ff', 1.0)).toBe('#ff0000');
    });

    it('weight 0.0 returns second color', () => {
      expect(mix('#ff0000', '#0000ff', 0.0)).toBe('#0000ff');
    });

    it('mixes two arbitrary colors', () => {
      // c1 = {255, 0, 0}, c2 = {0, 0, 255}, weight = 0.75
      // r = 255*0.75 + 0*0.25 = 191.25 → 191 = 0xbf
      // g = 0*0.75 + 0*0.25 = 0
      // b = 0*0.75 + 255*0.25 = 63.75 → 64 = 0x40
      expect(mix('#ff0000', '#0000ff', 0.75)).toBe('#bf0040');
    });

    it('mixes white and white to white', () => {
      expect(mix('#ffffff', '#ffffff', 0.5)).toBe('#ffffff');
    });
  });

  describe('withAlpha', () => {
    it('returns rgba string for red with 0.5 alpha', () => {
      expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('returns rgba string for white with 1.0 alpha', () => {
      expect(withAlpha('#ffffff', 1)).toBe('rgba(255, 255, 255, 1)');
    });

    it('returns rgba string for black with 0 alpha', () => {
      expect(withAlpha('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
    });

    it('handles fractional alpha', () => {
      expect(withAlpha('#336699', 0.12)).toBe('rgba(51, 102, 153, 0.12)');
    });
  });

  describe('luminance', () => {
    it('returns 0 for black', () => {
      expect(luminance('#000000')).toBe(0);
    });

    it('returns 1 for white', () => {
      expect(luminance('#ffffff')).toBe(1);
    });

    it('returns correct luminance for pure red', () => {
      // red sRGB = 255/255 = 1.0, linear = ((1+0.055)/1.055)^2.4 = 1.0
      // luminance = 0.2126 * 1.0 + 0.7152 * 0 + 0.0722 * 0 = 0.2126
      expect(luminance('#ff0000')).toBeCloseTo(0.2126, 4);
    });

    it('returns correct luminance for pure green', () => {
      // luminance = 0.7152
      expect(luminance('#00ff00')).toBeCloseTo(0.7152, 4);
    });

    it('returns correct luminance for pure blue', () => {
      // luminance = 0.0722
      expect(luminance('#0000ff')).toBeCloseTo(0.0722, 4);
    });

    it('mid-gray has luminance around 0.2159', () => {
      // 128/255 ≈ 0.50196, which is > 0.03928 → linear = ((0.50196+0.055)/1.055)^2.4 ≈ 0.2159
      // luminance = (0.2126 + 0.7152 + 0.0722) * 0.2159 ≈ 0.2159
      const lum = luminance('#808080');
      expect(lum).toBeCloseTo(0.2159, 3);
    });
  });

  describe('getContrastColor', () => {
    it('returns white for black background', () => {
      // luminance(#000000) = 0, which is <= 0.179
      expect(getContrastColor('#000000')).toBe('#ffffff');
    });

    it('returns black for white background', () => {
      // luminance(#ffffff) = 1, which is > 0.179
      expect(getContrastColor('#ffffff')).toBe('#000000');
    });

    it('returns white for dark blue', () => {
      // #000080: luminance ≈ 0.0722 * linear(128/255) ≈ 0.0722 * 0.2159 ≈ 0.0156 → <= 0.179
      expect(getContrastColor('#000080')).toBe('#ffffff');
    });

    it('returns black for light yellow', () => {
      // #ffff00: luminance = 0.2126*1 + 0.7152*1 + 0.0722*0 = 0.9278 → > 0.179
      expect(getContrastColor('#ffff00')).toBe('#000000');
    });

    it('returns white for dark red', () => {
      // #800000: r=128, linear ≈ 0.2159, luminance ≈ 0.2126*0.2159 ≈ 0.0459 → <= 0.179
      expect(getContrastColor('#800000')).toBe('#ffffff');
    });

    it('returns black for pure green', () => {
      // #00ff00: luminance ≈ 0.7152 → > 0.179
      expect(getContrastColor('#00ff00')).toBe('#000000');
    });
  });

  describe('buildCustomThemeVars', () => {
    const darkTheme: CustomThemeData = {
      id: 'test-dark',
      name: 'Test Dark',
      base: 'dark',
      accent: '#7c3aed',
      bgPrimary: '#1a1a2e',
      bgCard: '#16213e',
      textPrimary: '#e0e0e0',
    };

    const lightTheme: CustomThemeData = {
      id: 'test-light',
      name: 'Test Light',
      base: 'light',
      accent: '#2563eb',
      bgPrimary: '#f8f8f8',
      bgCard: '#ffffff',
      textPrimary: '#1a1a1a',
    };

    it('returns all expected CSS variable keys', () => {
      const vars = buildCustomThemeVars(darkTheme);
      const expectedKeys = [
        '--bg-primary', '--bg-secondary', '--bg-card', '--bg-card-hover', '--bg-input',
        '--bg-active', '--text-primary', '--text-secondary', '--text-tertiary',
        '--text-on-accent', '--accent', '--accent-hover', '--accent-subtle', '--accent-muted',
        '--border-default', '--color-success', '--color-success-subtle',
        '--color-error', '--color-error-hover', '--color-error-subtle', '--color-error-muted',
        '--btn-danger-bg', '--btn-danger-hover',
        '--color-warning', '--color-warning-subtle',
        '--color-info', '--color-info-subtle',
        '--slider-bg', '--scrollbar-thumb',
      ];
      expect(Object.keys(vars)).toEqual(expectedKeys);
    });

    it('passes through direct theme values', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--bg-primary']).toBe('#1a1a2e');
      expect(vars['--bg-card']).toBe('#16213e');
      expect(vars['--text-primary']).toBe('#e0e0e0');
      expect(vars['--accent']).toBe('#7c3aed');
    });

    it('--bg-secondary is bgPrimary darkened by 0.08', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--bg-secondary']).toBe(darken('#1a1a2e', 0.08));
    });

    it('--color-success equals accent', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--color-success']).toBe('#7c3aed');
    });

    it('--color-success-subtle is accent with 0.15 alpha', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--color-success-subtle']).toBe(withAlpha('#7c3aed', 0.15));
    });

    it('--bg-active is accent with 0.12 alpha', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--bg-active']).toBe(withAlpha('#7c3aed', 0.12));
    });

    it('--accent-subtle is accent with 0.12 alpha', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--accent-subtle']).toBe(withAlpha('#7c3aed', 0.12));
    });

    it('--accent-muted is accent with 0.25 alpha', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--accent-muted']).toBe(withAlpha('#7c3aed', 0.25));
    });

    it('--text-on-accent uses getContrastColor on accent', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--text-on-accent']).toBe(getContrastColor('#7c3aed'));
    });

    it('--text-secondary is mix of textPrimary and bgPrimary at 0.55', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--text-secondary']).toBe(mix('#e0e0e0', '#1a1a2e', 0.55));
    });

    it('--text-tertiary is mix of textPrimary and bgPrimary at 0.40', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--text-tertiary']).toBe(mix('#e0e0e0', '#1a1a2e', 0.40));
    });

    it('uses default error/warning/info colors for dark theme', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--color-error']).toBe('#e74c3c');
      expect(vars['--color-warning']).toBe('#e2b714');
      expect(vars['--color-info']).toBe('#3b82f6');
    });

    it('derives error hover/subtle/muted from error color', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--color-error-hover']).toBe(lighten('#e74c3c', 0.08));
      expect(vars['--color-error-subtle']).toBe(withAlpha('#e74c3c', 0.15));
      expect(vars['--color-error-muted']).toBe(withAlpha('#e74c3c', 0.25));
    });

    it('derives warning/info subtle from status colors', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--color-warning-subtle']).toBe(withAlpha('#e2b714', 0.15));
      expect(vars['--color-info-subtle']).toBe(withAlpha('#3b82f6', 0.15));
    });

    it('sets slider-bg and scrollbar-thumb to border-default', () => {
      const vars = buildCustomThemeVars(darkTheme);
      expect(vars['--slider-bg']).toBe(vars['--border-default']);
      expect(vars['--scrollbar-thumb']).toBe(vars['--border-default']);
    });

    it('uses explicit optional fields when provided', () => {
      const customized: CustomThemeData = {
        ...darkTheme,
        bgSecondary: '#222222',
        textSecondary: '#999999',
        borderDefault: '#444444',
        colorError: '#ff0000',
        colorWarning: '#ffaa00',
        colorInfo: '#0088ff',
      };
      const vars = buildCustomThemeVars(customized);
      expect(vars['--bg-secondary']).toBe('#222222');
      expect(vars['--text-secondary']).toBe('#999999');
      expect(vars['--border-default']).toBe('#444444');
      expect(vars['--color-error']).toBe('#ff0000');
      expect(vars['--color-warning']).toBe('#ffaa00');
      expect(vars['--color-info']).toBe('#0088ff');
      expect(vars['--slider-bg']).toBe('#444444');
      expect(vars['--scrollbar-thumb']).toBe('#444444');
    });

    describe('dark theme (luminance < 0.179)', () => {
      it('uses lighten for bg-card-hover and bg-input', () => {
        const vars = buildCustomThemeVars(darkTheme);
        // isDark = true → adjustBg = lighten
        expect(vars['--bg-card-hover']).toBe(lighten('#16213e', 0.04));
        expect(vars['--bg-input']).toBe(lighten('#16213e', 0.04));
      });

      it('uses lighten for accent-hover', () => {
        const vars = buildCustomThemeVars(darkTheme);
        expect(vars['--accent-hover']).toBe(lighten('#7c3aed', 0.08));
      });

      it('uses lighten for border-default', () => {
        const vars = buildCustomThemeVars(darkTheme);
        expect(vars['--border-default']).toBe(lighten('#1a1a2e', 0.12));
      });
    });

    describe('light theme (luminance > 0.179)', () => {
      it('uses light-appropriate default status colors', () => {
        const vars = buildCustomThemeVars(lightTheme);
        expect(vars['--color-error']).toBe('#e53935');
        expect(vars['--color-warning']).toBe('#ca8a04');
        expect(vars['--color-info']).toBe('#2563eb');
      });

      it('uses darken for bg-card-hover and bg-input', () => {
        const vars = buildCustomThemeVars(lightTheme);
        // isDark = false → adjustBg = darken
        expect(vars['--bg-card-hover']).toBe(darken('#ffffff', 0.04));
        expect(vars['--bg-input']).toBe(darken('#ffffff', 0.04));
      });

      it('uses darken for accent-hover', () => {
        const vars = buildCustomThemeVars(lightTheme);
        expect(vars['--accent-hover']).toBe(darken('#2563eb', 0.08));
      });

      it('uses darken for border-default', () => {
        const vars = buildCustomThemeVars(lightTheme);
        expect(vars['--border-default']).toBe(darken('#f8f8f8', 0.12));
      });
    });
  });

  describe('clearCustomThemeVars', () => {
    const allVars = [
      '--bg-primary', '--bg-secondary', '--bg-card', '--bg-card-hover', '--bg-input',
      '--bg-active', '--text-primary', '--text-secondary', '--text-tertiary',
      '--text-on-accent', '--accent', '--accent-hover', '--accent-subtle', '--accent-muted',
      '--border-default', '--color-success', '--color-success-subtle',
      '--color-error', '--color-error-hover', '--color-error-subtle', '--color-error-muted',
      '--btn-danger-bg', '--btn-danger-hover',
      '--color-warning', '--color-warning-subtle',
      '--color-info', '--color-info-subtle',
      '--slider-bg', '--scrollbar-thumb',
    ];

    let mockRemoveProperty: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockRemoveProperty = vi.fn();
      vi.stubGlobal('document', {
        documentElement: {
          style: { removeProperty: mockRemoveProperty },
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('calls removeProperty for each of the 29 theme variables', () => {
      clearCustomThemeVars();
      expect(mockRemoveProperty).toHaveBeenCalledTimes(29);
    });

    it('removes all expected CSS variable names', () => {
      clearCustomThemeVars();
      const removedVars = mockRemoveProperty.mock.calls.map((call: string[]) => call[0]);
      expect(removedVars).toEqual(allVars);
    });
  });
});
