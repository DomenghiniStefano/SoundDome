import {
  PACKET_SIZE,
  REPORT_PACKET_SIZE,
  REPORT_ID,
  HEADER,
  CMD_BRIGHTNESS,
  CMD_IMAGE_ANNOUNCE,
  CMD_FLUSH,
  CMD_CLEAR,
  CMD_LOGO,
  INPUT_KEY_OFFSET,
  DEVICE_TO_LOGICAL,
} from './constants';

function padToPacket(data: number[]): Buffer {
  const buf = Buffer.alloc(REPORT_PACKET_SIZE, 0);
  buf[0] = REPORT_ID;
  for (let i = 0; i < data.length && i < PACKET_SIZE; i++) {
    buf[i + 1] = data[i];
  }
  return buf;
}

// CRT\x00\x00 LIG\x00\x00 [brightness]
export function buildBrightnessCommand(brightness: number): Buffer {
  const clamped = Math.max(0, Math.min(100, brightness));
  return padToPacket([...HEADER, ...CMD_BRIGHTNESS, clamped]);
}

// CRT\x00\x00 BAT\x00\x00 [size_hi] [size_lo] [key_1based] 0x00 0x00 0x00
export function buildImageAnnounce(keyIndex: number, jpegSize: number): Buffer {
  const sizeHi = (jpegSize >> 8) & 0xff;
  const sizeLo = jpegSize & 0xff;
  return padToPacket([
    ...HEADER,
    ...CMD_IMAGE_ANNOUNCE,
    sizeHi,
    sizeLo,
    keyIndex + 1, // device uses 1-based key index
    0x00,
    0x00,
    0x00,
  ]);
}

// Raw JPEG bytes split into 512-byte chunks (each prefixed with report ID)
export function buildImageDataChunks(jpegData: Buffer): Buffer[] {
  const chunks: Buffer[] = [];
  let offset = 0;
  while (offset < jpegData.length) {
    const chunkSize = Math.min(PACKET_SIZE, jpegData.length - offset);
    const buf = Buffer.alloc(REPORT_PACKET_SIZE, 0);
    buf[0] = REPORT_ID;
    jpegData.copy(buf, 1, offset, offset + chunkSize);
    chunks.push(buf);
    offset += chunkSize;
  }
  return chunks;
}

// CRT\x00\x00 LOG — LCD strip image announce (v1: no size bytes)
export function buildLogoAnnounce(): Buffer {
  return padToPacket([...HEADER, ...CMD_LOGO]);
}

// CRT\x00\x00 STP
export function buildFlushCommand(): Buffer {
  return padToPacket([...HEADER, ...CMD_FLUSH]);
}

// CRT\x00\x00 CLE\x00\x00 [TG0] [key_1based] 0x00 0x00 0x00 0x00
export function buildClearKeyCommand(keyIndex: number): Buffer {
  return padToPacket([...HEADER, ...CMD_CLEAR, 0x00, keyIndex + 1, 0x00, 0x00, 0x00, 0x00]);
}

// CRT\x00\x00 CLE\x00\x00 0x00 0xff — clear all keys
export function buildClearAllCommand(): Buffer {
  return padToPacket([...HEADER, ...CMD_CLEAR, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00]);
}

export interface InputEvent {
  type: 'release';
  keyIndex: number; // logical key index (after permutation)
}

// Input report: key number at byte offset 9 (1-based), event is key release
export function parseInputReport(data: Buffer): InputEvent | null {
  if (data.length < INPUT_KEY_OFFSET + 1) return null;

  const keyByte = data[INPUT_KEY_OFFSET];
  if (keyByte === 0) return null; // no key

  // keyByte is 1-based physical key index
  const physicalIndex = keyByte - 1;
  if (physicalIndex < 0 || physicalIndex >= DEVICE_TO_LOGICAL.length) return null;

  const logicalKey = DEVICE_TO_LOGICAL[physicalIndex];
  return { type: 'release', keyIndex: logicalKey };
}

// Check if data is an ACK response: starts with "ACK"
export function isAckResponse(data: Buffer): boolean {
  return data.length >= 3 && data[0] === 0x41 && data[1] === 0x43 && data[2] === 0x4b;
}
