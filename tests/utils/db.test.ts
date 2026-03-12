import { describe, it, expect } from 'vitest';
import { dbToGain, gainToDb, sliderToDb, dbToSlider, sliderToGain } from '../../src/utils/db';

describe('dbToGain', () => {
  it('converts 0 dB to gain 1.0', () => {
    expect(dbToGain(0)).toBe(1);
  });

  it('converts -6 dB to approximately 0.5', () => {
    expect(dbToGain(-6)).toBeCloseTo(0.5012, 3);
  });

  it('converts -20 dB to 0.1', () => {
    expect(dbToGain(-20)).toBeCloseTo(0.1, 5);
  });

  it('converts -60 dB to 0.001', () => {
    expect(dbToGain(-60)).toBeCloseTo(0.001, 5);
  });

  it('converts positive dB to gain > 1', () => {
    expect(dbToGain(6)).toBeCloseTo(1.9953, 3);
  });
});

describe('gainToDb', () => {
  it('converts gain 1.0 to 0 dB', () => {
    expect(gainToDb(1)).toBe(0);
  });

  it('converts gain 0.5 to approximately -6 dB', () => {
    expect(gainToDb(0.5)).toBeCloseTo(-6.0206, 3);
  });

  it('converts gain 0.1 to -20 dB', () => {
    expect(gainToDb(0.1)).toBeCloseTo(-20, 3);
  });

  it('returns -Infinity for gain 0', () => {
    expect(gainToDb(0)).toBe(-Infinity);
  });

  it('returns -Infinity for negative gain', () => {
    expect(gainToDb(-1)).toBe(-Infinity);
  });
});

describe('sliderToDb', () => {
  it('maps slider 0 to -60 dB (silence)', () => {
    expect(sliderToDb(0)).toBe(-60);
  });

  it('maps slider 50 to -15 dB (perceived half volume)', () => {
    expect(sliderToDb(50)).toBe(-15);
  });

  it('maps slider 100 to 0 dB (full volume)', () => {
    expect(sliderToDb(100)).toBe(0);
  });

  it('maps slider 25 to -33.75 dB', () => {
    // -60 * (1 - 0.25)^2 = -60 * 0.5625 = -33.75
    expect(sliderToDb(25)).toBeCloseTo(-33.75, 5);
  });

  it('maps slider 75 to -3.75 dB', () => {
    // -60 * (1 - 0.75)^2 = -60 * 0.0625 = -3.75
    expect(sliderToDb(75)).toBeCloseTo(-3.75, 5);
  });

  it('clamps values below 0', () => {
    expect(sliderToDb(-10)).toBe(-60);
  });

  it('clamps values above 100', () => {
    expect(sliderToDb(150)).toBe(0);
  });
});

describe('dbToSlider', () => {
  it('maps -60 dB to slider 0', () => {
    expect(dbToSlider(-60)).toBe(0);
  });

  it('maps 0 dB to slider 100', () => {
    expect(dbToSlider(0)).toBe(100);
  });

  it('maps -15 dB to slider 50', () => {
    expect(dbToSlider(-15)).toBe(50);
  });

  it('clamps values below -60 dB', () => {
    expect(dbToSlider(-100)).toBe(0);
  });

  it('clamps values above 0 dB', () => {
    expect(dbToSlider(10)).toBe(100);
  });
});

describe('sliderToGain', () => {
  it('maps slider 0 to gain 0 (silent)', () => {
    expect(sliderToGain(0)).toBe(0);
  });

  it('maps slider 50 to gain 0.5', () => {
    expect(sliderToGain(50)).toBe(0.5);
  });

  it('maps slider 100 to gain 1.0', () => {
    expect(sliderToGain(100)).toBe(1);
  });

  it('maps slider 200 to gain 2.0 (amplification)', () => {
    expect(sliderToGain(200)).toBe(2);
  });

  it('clamps negative values to 0', () => {
    expect(sliderToGain(-10)).toBe(0);
  });

  it('returns values in [0, 1] range for slider 0-100', () => {
    for (let v = 0; v <= 100; v++) {
      const gain = sliderToGain(v);
      expect(gain).toBeGreaterThanOrEqual(0);
      expect(gain).toBeLessThanOrEqual(1);
    }
  });

  it('is monotonically increasing', () => {
    let prev = sliderToGain(0);
    for (let v = 1; v <= 200; v++) {
      const current = sliderToGain(v);
      expect(current).toBeGreaterThan(prev);
      prev = current;
    }
  });
});

describe('round-trip conversions', () => {
  it('dbToSlider(sliderToDb(x)) returns x for integers 0-100', () => {
    for (let v = 0; v <= 100; v++) {
      expect(dbToSlider(sliderToDb(v))).toBe(v);
    }
  });

  it('dbToGain(gainToDb(x)) is identity for positive gains', () => {
    const gains = [0.001, 0.01, 0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0];
    for (const g of gains) {
      expect(dbToGain(gainToDb(g))).toBeCloseTo(g, 10);
    }
  });
});
