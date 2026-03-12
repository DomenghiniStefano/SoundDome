import { describe, it, expect } from 'vitest';
import {
  COMPRESSOR_PRESETS,
  VIRTUAL_MIC_KEYWORDS,
  VIRTUAL_DEVICE_FILTER_KEYWORDS,
  VOLUME_DIVISOR,
  VOLUME_ITEM_DEFAULT,
  VOLUME_ITEM_MAX,
  AUDIO_SAMPLE_RATE,
  GAIN_RAMP_DURATION,
} from '../../src/enums/constants';

describe('COMPRESSOR_PRESETS', () => {
  const presetNames = ['light', 'medium', 'heavy'] as const;

  for (const name of presetNames) {
    describe(name, () => {
      const preset = COMPRESSOR_PRESETS[name];

      it('has threshold in valid range (-50 to 0 dB)', () => {
        expect(preset.threshold).toBeGreaterThanOrEqual(-50);
        expect(preset.threshold).toBeLessThanOrEqual(0);
      });

      it('has knee in valid range (0 to 40 dB)', () => {
        expect(preset.knee).toBeGreaterThanOrEqual(0);
        expect(preset.knee).toBeLessThanOrEqual(40);
      });

      it('has ratio in valid range (1 to 20)', () => {
        expect(preset.ratio).toBeGreaterThanOrEqual(1);
        expect(preset.ratio).toBeLessThanOrEqual(20);
      });

      it('has attack in valid range (0 to 1 second)', () => {
        expect(preset.attack).toBeGreaterThan(0);
        expect(preset.attack).toBeLessThanOrEqual(1);
      });

      it('has release in valid range (0 to 1 second)', () => {
        expect(preset.release).toBeGreaterThan(0);
        expect(preset.release).toBeLessThanOrEqual(1);
      });
    });
  }

  it('heavy has lower threshold than light (more aggressive)', () => {
    expect(COMPRESSOR_PRESETS.heavy.threshold).toBeLessThan(COMPRESSOR_PRESETS.light.threshold);
  });

  it('heavy has higher ratio than light', () => {
    expect(COMPRESSOR_PRESETS.heavy.ratio).toBeGreaterThan(COMPRESSOR_PRESETS.light.ratio);
  });
});

describe('VIRTUAL_MIC_KEYWORDS', () => {
  it('contains VB-CABLE keyword', () => {
    expect(VIRTUAL_MIC_KEYWORDS).toContain('cable input');
  });

  it('contains Virtual Audio Driver keyword', () => {
    expect(VIRTUAL_MIC_KEYWORDS).toContain('virtual audio driver by mtt');
  });

  it('has all lowercase keywords', () => {
    for (const keyword of VIRTUAL_MIC_KEYWORDS) {
      expect(keyword).toBe(keyword.toLowerCase());
    }
  });
});

describe('VIRTUAL_DEVICE_FILTER_KEYWORDS', () => {
  it('contains VB-CABLE filter keyword', () => {
    expect(VIRTUAL_DEVICE_FILTER_KEYWORDS).toContain('cable');
  });

  it('contains Virtual Mic Driver keyword', () => {
    expect(VIRTUAL_DEVICE_FILTER_KEYWORDS).toContain('virtual mic driver by mtt');
  });

  it('has all lowercase keywords', () => {
    for (const keyword of VIRTUAL_DEVICE_FILTER_KEYWORDS) {
      expect(keyword).toBe(keyword.toLowerCase());
    }
  });
});

describe('volume constants', () => {
  it('VOLUME_DIVISOR is 100', () => {
    expect(VOLUME_DIVISOR).toBe(100);
  });

  it('VOLUME_ITEM_DEFAULT is 100 (unity = 1x)', () => {
    expect(VOLUME_ITEM_DEFAULT).toBe(100);
  });

  it('VOLUME_ITEM_MAX is 200 (max boost = 2x)', () => {
    expect(VOLUME_ITEM_MAX).toBe(200);
  });

  it('default item volume / divisor = 1.0 (unity gain)', () => {
    expect(VOLUME_ITEM_DEFAULT / VOLUME_DIVISOR).toBe(1);
  });

  it('max item volume / divisor = 2.0 (double gain)', () => {
    expect(VOLUME_ITEM_MAX / VOLUME_DIVISOR).toBe(2);
  });
});

describe('audio constants', () => {
  it('sample rate is 48000 Hz', () => {
    expect(AUDIO_SAMPLE_RATE).toBe(48000);
  });

  it('gain ramp duration is positive and short', () => {
    expect(GAIN_RAMP_DURATION).toBeGreaterThan(0);
    expect(GAIN_RAMP_DURATION).toBeLessThan(1);
  });
});
