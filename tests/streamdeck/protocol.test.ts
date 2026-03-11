import { describe, it, expect } from 'vitest';
import {
  buildBrightnessCommand,
  buildImageAnnounce,
  buildImageDataChunks,
  buildFlushCommand,
  buildClearKeyCommand,
  buildClearAllCommand,
  buildLogoAnnounce,
  parseInputReport,
  isAckResponse,
} from '../../electron/streamdeck/protocol';
import {
  REPORT_PACKET_SIZE,
  REPORT_ID,
  HEADER,
  LCD_KEY_COUNT,
  LOGICAL_TO_DEVICE,
  DEVICE_TO_LOGICAL,
  PACKET_SIZE,
} from '../../electron/streamdeck/constants';

describe('buildBrightnessCommand', () => {
  it('returns buffer of correct size', () => {
    const buf = buildBrightnessCommand(80);
    expect(buf.length).toBe(REPORT_PACKET_SIZE);
  });

  it('starts with report ID', () => {
    const buf = buildBrightnessCommand(80);
    expect(buf[0]).toBe(REPORT_ID);
  });

  it('contains CRT header', () => {
    const buf = buildBrightnessCommand(80);
    expect(buf[1]).toBe(0x43); // C
    expect(buf[2]).toBe(0x52); // R
    expect(buf[3]).toBe(0x54); // T
  });

  it('contains brightness value', () => {
    const buf = buildBrightnessCommand(80);
    // Header(5) + CMD_BRIGHTNESS(5) + brightness at offset 11
    expect(buf[11]).toBe(80);
  });

  it('clamps brightness below 0 to 0', () => {
    const buf = buildBrightnessCommand(-10);
    expect(buf[11]).toBe(0);
  });

  it('clamps brightness above 100 to 100', () => {
    const buf = buildBrightnessCommand(200);
    expect(buf[11]).toBe(100);
  });
});

describe('buildImageAnnounce', () => {
  it('returns buffer of correct size', () => {
    const buf = buildImageAnnounce(0, 1000);
    expect(buf.length).toBe(REPORT_PACKET_SIZE);
  });

  it('encodes JPEG size as big-endian 2 bytes', () => {
    const buf = buildImageAnnounce(0, 1000);
    // After HEADER(5) + CMD(5) = offset 11, 12 are size bytes
    const sizeHi = (1000 >> 8) & 0xff; // 0x03
    const sizeLo = 1000 & 0xff;         // 0xe8
    expect(buf[11]).toBe(sizeHi);
    expect(buf[12]).toBe(sizeLo);
  });

  it('uses 1-based key index', () => {
    const buf = buildImageAnnounce(0, 500);
    // key at offset 13
    expect(buf[13]).toBe(1); // 0 + 1
  });

  it('key index 14 becomes 15 in packet', () => {
    const buf = buildImageAnnounce(14, 500);
    expect(buf[13]).toBe(15);
  });
});

describe('buildImageDataChunks', () => {
  it('produces 1 chunk for small data', () => {
    const data = Buffer.alloc(100, 0xAA);
    const chunks = buildImageDataChunks(data);
    expect(chunks).toHaveLength(1);
  });

  it('each chunk has correct size', () => {
    const data = Buffer.alloc(100, 0xAA);
    const chunks = buildImageDataChunks(data);
    expect(chunks[0].length).toBe(REPORT_PACKET_SIZE);
  });

  it('each chunk starts with report ID', () => {
    const data = Buffer.alloc(100, 0xAA);
    const chunks = buildImageDataChunks(data);
    expect(chunks[0][0]).toBe(REPORT_ID);
  });

  it('produces 2 chunks for data > 512 bytes', () => {
    const data = Buffer.alloc(600, 0xBB);
    const chunks = buildImageDataChunks(data);
    expect(chunks).toHaveLength(2);
  });

  it('splits exactly at PACKET_SIZE boundary', () => {
    const data = Buffer.alloc(PACKET_SIZE, 0xCC);
    const chunks = buildImageDataChunks(data);
    expect(chunks).toHaveLength(1);
  });

  it('splits PACKET_SIZE + 1 into 2 chunks', () => {
    const data = Buffer.alloc(PACKET_SIZE + 1, 0xDD);
    const chunks = buildImageDataChunks(data);
    expect(chunks).toHaveLength(2);
  });

  it('preserves data content', () => {
    const data = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
    const chunks = buildImageDataChunks(data);
    // Data starts at offset 1 (after report ID)
    expect(chunks[0][1]).toBe(0x01);
    expect(chunks[0][2]).toBe(0x02);
    expect(chunks[0][5]).toBe(0x05);
  });
});

describe('buildFlushCommand', () => {
  it('returns buffer of correct size', () => {
    expect(buildFlushCommand().length).toBe(REPORT_PACKET_SIZE);
  });

  it('contains STP command after header', () => {
    const buf = buildFlushCommand();
    // HEADER(5) at offset 1-5, then STP at 6-8
    expect(buf[6]).toBe(0x53); // S
    expect(buf[7]).toBe(0x54); // T
    expect(buf[8]).toBe(0x50); // P
  });
});

describe('buildClearKeyCommand', () => {
  it('returns buffer of correct size', () => {
    expect(buildClearKeyCommand(0).length).toBe(REPORT_PACKET_SIZE);
  });

  it('uses 1-based key index', () => {
    const buf = buildClearKeyCommand(5);
    // After HEADER(5) + CMD_CLEAR(5) + 0x00 = offset 12 is key
    expect(buf[12]).toBe(6); // 5 + 1
  });
});

describe('buildClearAllCommand', () => {
  it('returns buffer of correct size', () => {
    expect(buildClearAllCommand().length).toBe(REPORT_PACKET_SIZE);
  });

  it('uses 0xff as key indicator for "all"', () => {
    const buf = buildClearAllCommand();
    expect(buf[12]).toBe(0xff);
  });
});

describe('buildLogoAnnounce', () => {
  it('returns buffer of correct size', () => {
    expect(buildLogoAnnounce().length).toBe(REPORT_PACKET_SIZE);
  });

  it('contains LOG command', () => {
    const buf = buildLogoAnnounce();
    expect(buf[6]).toBe(0x4c); // L
    expect(buf[7]).toBe(0x4f); // O
    expect(buf[8]).toBe(0x47); // G
  });
});

describe('parseInputReport', () => {
  function makeReport(keyByte: number): Buffer {
    const buf = Buffer.alloc(20, 0);
    buf[9] = keyByte; // INPUT_KEY_OFFSET = 9
    return buf;
  }

  it('returns null for keyByte 0 (no key)', () => {
    expect(parseInputReport(makeReport(0))).toBeNull();
  });

  it('returns null for buffer too short', () => {
    expect(parseInputReport(Buffer.alloc(5))).toBeNull();
  });

  it('parses key 1 (1-based) to correct logical index', () => {
    const result = parseInputReport(makeReport(1));
    expect(result).not.toBeNull();
    expect(result!.type).toBe('release');
    expect(result!.keyIndex).toBe(DEVICE_TO_LOGICAL[0]);
  });

  it('parses key 15 (last key) correctly', () => {
    const result = parseInputReport(makeReport(15));
    expect(result).not.toBeNull();
    expect(result!.keyIndex).toBe(DEVICE_TO_LOGICAL[14]);
  });

  it('returns null for key index out of range', () => {
    expect(parseInputReport(makeReport(16))).toBeNull();
    expect(parseInputReport(makeReport(255))).toBeNull();
  });
});

describe('isAckResponse', () => {
  it('returns true for ACK buffer', () => {
    const buf = Buffer.from([0x41, 0x43, 0x4b, 0x00, 0x00]);
    expect(isAckResponse(buf)).toBe(true);
  });

  it('returns false for non-ACK buffer', () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(isAckResponse(buf)).toBe(false);
  });

  it('returns false for buffer too short', () => {
    expect(isAckResponse(Buffer.from([0x41, 0x43]))).toBe(false);
  });

  it('returns true even with extra bytes after ACK', () => {
    const buf = Buffer.from([0x41, 0x43, 0x4b, 0xFF, 0xFF, 0xFF]);
    expect(isAckResponse(buf)).toBe(true);
  });
});
