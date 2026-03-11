import { describe, it, expect } from 'vitest';
import {
  LOGICAL_TO_DEVICE,
  DEVICE_TO_LOGICAL,
  LCD_KEY_COUNT,
  TOTAL_KEY_COUNT,
  KEY_IMAGE_SIZE,
  PACKET_SIZE,
  REPORT_PACKET_SIZE,
  REPORT_ID,
  HEADER,
  ITEMS_PER_PAGE,
  DEFAULT_BRIGHTNESS,
} from '../../electron/streamdeck/constants';

describe('LOGICAL_TO_DEVICE mapping', () => {
  it('has exactly LCD_KEY_COUNT entries', () => {
    expect(LOGICAL_TO_DEVICE).toHaveLength(LCD_KEY_COUNT);
  });

  it('contains all values 0 through 14 (no gaps, no duplicates)', () => {
    const sorted = [...LOGICAL_TO_DEVICE].sort((a, b) => a - b);
    for (let i = 0; i < LCD_KEY_COUNT; i++) {
      expect(sorted[i]).toBe(i);
    }
  });
});

describe('DEVICE_TO_LOGICAL mapping', () => {
  it('has exactly LCD_KEY_COUNT entries', () => {
    expect(DEVICE_TO_LOGICAL).toHaveLength(LCD_KEY_COUNT);
  });

  it('contains all values 0 through 14 (no gaps, no duplicates)', () => {
    const sorted = [...DEVICE_TO_LOGICAL].sort((a, b) => a - b);
    for (let i = 0; i < LCD_KEY_COUNT; i++) {
      expect(sorted[i]).toBe(i);
    }
  });
});

describe('LOGICAL_TO_DEVICE ↔ DEVICE_TO_LOGICAL roundtrip', () => {
  it('logical → device → logical is identity', () => {
    for (let logical = 0; logical < LCD_KEY_COUNT; logical++) {
      const device = LOGICAL_TO_DEVICE[logical];
      expect(DEVICE_TO_LOGICAL[device]).toBe(logical);
    }
  });

  it('device → logical → device is identity', () => {
    for (let device = 0; device < LCD_KEY_COUNT; device++) {
      const logical = DEVICE_TO_LOGICAL[device];
      expect(LOGICAL_TO_DEVICE[logical]).toBe(device);
    }
  });
});

describe('physical layout verification', () => {
  // The device has a 5-column × 3-row grid.
  // Physical layout (device key numbers, 0-based):
  //   12   9   6   3   0
  //   13  10   7   4   1
  //   14  11   8   5   2
  //
  // Logical layout (L→R, T→B):
  //    0   1   2   3   4
  //    5   6   7   8   9
  //   10  11  12  13  14

  it('logical key 0 (top-left) maps to device key 12', () => {
    expect(LOGICAL_TO_DEVICE[0]).toBe(12);
  });

  it('logical key 4 (top-right) maps to device key 0', () => {
    expect(LOGICAL_TO_DEVICE[4]).toBe(0);
  });

  it('logical key 10 (bottom-left) maps to device key 14', () => {
    expect(LOGICAL_TO_DEVICE[10]).toBe(14);
  });

  it('logical key 14 (bottom-right) maps to device key 2', () => {
    expect(LOGICAL_TO_DEVICE[14]).toBe(2);
  });

  it('logical key 7 (center) maps to device key 7', () => {
    expect(LOGICAL_TO_DEVICE[7]).toBe(7);
  });
});

describe('packet constants', () => {
  it('REPORT_PACKET_SIZE = PACKET_SIZE + 1', () => {
    expect(REPORT_PACKET_SIZE).toBe(PACKET_SIZE + 1);
  });

  it('PACKET_SIZE is 512', () => {
    expect(PACKET_SIZE).toBe(512);
  });

  it('REPORT_ID is 0', () => {
    expect(REPORT_ID).toBe(0x00);
  });
});

describe('HEADER', () => {
  it('is CRT\\x00\\x00 (5 bytes)', () => {
    expect(HEADER).toEqual([0x43, 0x52, 0x54, 0x00, 0x00]);
  });

  it('spells "CRT" in ASCII', () => {
    expect(String.fromCharCode(HEADER[0], HEADER[1], HEADER[2])).toBe('CRT');
  });
});

describe('device constants', () => {
  it('LCD_KEY_COUNT is 15', () => {
    expect(LCD_KEY_COUNT).toBe(15);
  });

  it('TOTAL_KEY_COUNT equals LCD_KEY_COUNT', () => {
    expect(TOTAL_KEY_COUNT).toBe(LCD_KEY_COUNT);
  });

  it('KEY_IMAGE_SIZE is 85px', () => {
    expect(KEY_IMAGE_SIZE).toBe(85);
  });

  it('ITEMS_PER_PAGE equals LCD_KEY_COUNT', () => {
    expect(ITEMS_PER_PAGE).toBe(LCD_KEY_COUNT);
  });

  it('DEFAULT_BRIGHTNESS is in valid range 0-100', () => {
    expect(DEFAULT_BRIGHTNESS).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_BRIGHTNESS).toBeLessThanOrEqual(100);
  });
});
