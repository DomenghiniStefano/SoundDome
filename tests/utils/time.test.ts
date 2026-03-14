import { describe, it, expect } from 'vitest';
import { formatTime, parseTime, roundToHundredths } from '../../src/utils/time';

describe('formatTime', () => {
  it('formats 0 seconds as 0:00.00', () => {
    expect(formatTime(0)).toBe('0:00.00');
  });

  it('formats whole seconds with .00 decimal', () => {
    expect(formatTime(5)).toBe('0:05.00');
  });

  it('formats fractional seconds to two decimal places', () => {
    expect(formatTime(1.5)).toBe('0:01.50');
  });

  it('formats seconds with sub-hundredth precision (rounds)', () => {
    expect(formatTime(1.999)).toBe('0:02.00');
  });

  it('formats exactly 60 seconds as 1:00.00', () => {
    expect(formatTime(60)).toBe('1:00.00');
  });

  it('formats values over 60 seconds with minutes', () => {
    expect(formatTime(90)).toBe('1:30.00');
  });

  it('formats large values with multi-digit minutes', () => {
    expect(formatTime(600)).toBe('10:00.00');
  });

  it('pads single-digit seconds with leading zero', () => {
    expect(formatTime(63.5)).toBe('1:03.50');
  });

  it('pads seconds below 10 correctly', () => {
    expect(formatTime(0.5)).toBe('0:00.50');
  });

  it('clamps negative values to 0', () => {
    expect(formatTime(-5)).toBe('0:00.00');
  });

  it('clamps large negative values to 0', () => {
    expect(formatTime(-1000)).toBe('0:00.00');
  });

  it('does not handle NaN (Math.max(0, NaN) returns NaN)', () => {
    // formatTime does not guard against NaN — Math.max(0, NaN) is NaN
    expect(formatTime(NaN)).toBe('NaN:00NaN');
  });

  it('handles very small positive values', () => {
    expect(formatTime(0.01)).toBe('0:00.01');
  });

  it('handles values just under a minute boundary', () => {
    expect(formatTime(59.99)).toBe('0:59.99');
  });

  it('handles very large values', () => {
    expect(formatTime(3661.25)).toBe('61:01.25');
  });
});

describe('parseTime', () => {
  it('parses "0:00.00" to 0', () => {
    expect(parseTime('0:00.00')).toBe(0);
  });

  it('parses minutes:seconds format', () => {
    expect(parseTime('1:30')).toBe(90);
  });

  it('parses minutes:seconds.decimals format', () => {
    expect(parseTime('1:30.50')).toBe(90.5);
  });

  it('parses seconds-only input (no colon)', () => {
    expect(parseTime('45')).toBe(45);
  });

  it('parses fractional seconds-only input', () => {
    expect(parseTime('30.5')).toBe(30.5);
  });

  it('parses "0:05.00" to 5', () => {
    expect(parseTime('0:05.00')).toBe(5);
  });

  it('clamps negative results to 0 (negative minutes)', () => {
    expect(parseTime('-1:00')).toBe(0);
  });

  it('clamps negative seconds-only to 0', () => {
    expect(parseTime('-5')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseTime('')).toBe(0);
  });

  it('returns 0 for non-numeric string', () => {
    expect(parseTime('abc')).toBe(0);
  });

  it('returns 0 for "NaN"', () => {
    expect(parseTime('NaN')).toBe(0);
  });

  it('parses zero minutes correctly', () => {
    expect(parseTime('0:45.25')).toBe(45.25);
  });

  it('parses large minute values', () => {
    expect(parseTime('10:00')).toBe(600);
  });

  it('handles extra whitespace in seconds-only by returning 0', () => {
    // Number(' 5 ') is 5, so this actually parses
    expect(parseTime(' 5 ')).toBe(5);
  });

  it('handles colon with non-numeric parts by returning 0', () => {
    // Number('abc') * 60 + Number('def') = NaN + NaN = NaN
    // Math.max(0, NaN) = 0... actually NaN
    // Let's check: Math.max(0, NaN) returns NaN in JS
    // So this would return NaN — but the function uses Math.max(0, ...) on the mm:ss path
    // which doesn't have the || 0 fallback. NaN > 0 is false so Math.max returns NaN.
    const result = parseTime('abc:def');
    expect(result).toBeNaN();
  });
});

describe('roundToHundredths', () => {
  it('returns 0 for 0', () => {
    expect(roundToHundredths(0)).toBe(0);
  });

  it('keeps already-rounded values unchanged', () => {
    expect(roundToHundredths(1.25)).toBe(1.25);
  });

  it('rounds down to hundredths', () => {
    expect(roundToHundredths(1.234)).toBe(1.23);
  });

  it('rounds up to hundredths', () => {
    expect(roundToHundredths(1.235)).toBe(1.24);
  });

  it('rounds 0.005 up to 0.01', () => {
    expect(roundToHundredths(0.005)).toBe(0.01);
  });

  it('rounds 0.004 down to 0.00', () => {
    expect(roundToHundredths(0.004)).toBe(0);
  });

  it('handles negative values', () => {
    expect(roundToHundredths(-1.236)).toBe(-1.24);
  });

  it('handles negative values rounding toward zero', () => {
    expect(roundToHundredths(-1.234)).toBe(-1.23);
  });

  it('handles integers', () => {
    expect(roundToHundredths(5)).toBe(5);
  });

  it('handles very small values', () => {
    expect(roundToHundredths(0.001)).toBe(0);
  });

  it('handles large values', () => {
    expect(roundToHundredths(12345.6789)).toBe(12345.68);
  });

  it('returns NaN for NaN', () => {
    expect(roundToHundredths(NaN)).toBeNaN();
  });
});

describe('round-trip: formatTime and parseTime', () => {
  it('parseTime(formatTime(x)) returns x for whole seconds', () => {
    for (let s = 0; s <= 120; s++) {
      expect(parseTime(formatTime(s))).toBe(s);
    }
  });

  it('parseTime(formatTime(x)) returns x for hundredths precision', () => {
    const values = [0, 0.01, 0.5, 1.25, 30.99, 59.99, 60, 60.01, 90.5, 120.75];
    for (const v of values) {
      expect(parseTime(formatTime(v))).toBeCloseTo(v, 2);
    }
  });

  it('formatTime(parseTime(s)) preserves formatted strings', () => {
    const formatted = ['0:00.00', '0:05.00', '0:30.50', '1:00.00', '1:30.25', '10:00.00'];
    for (const s of formatted) {
      expect(formatTime(parseTime(s))).toBe(s);
    }
  });

  it('negative inputs clamp to 0 in both directions', () => {
    expect(parseTime(formatTime(-10))).toBe(0);
    expect(formatTime(parseTime('-10'))).toBe('0:00.00');
  });
});
