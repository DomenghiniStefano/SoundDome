import { LCD_KEY_COUNT } from '../../src/enums/streamdeck';

// Re-export shared constant so electron/ consumers keep the same import path
export { LCD_KEY_COUNT };

// Ajazz AKP153E USB HID identifiers
export const AJAZZ_VENDOR_ID = 0x0300;
export const AJAZZ_PRODUCT_ID = 0x1010;

// Packet layout
export const PACKET_SIZE = 512;
export const REPORT_PACKET_SIZE = 513; // PACKET_SIZE + 1 byte report ID
export const REPORT_ID = 0x00;

// Device capabilities
export const NON_LCD_KEY_COUNT = 0;
export const TOTAL_KEY_COUNT = 15;
export const KEY_IMAGE_SIZE = 85;
export const KEY_DISPLAY_SIZE = 320;
export const JPEG_QUALITY = 85;

// Header: "CRT" + two null bytes (5 bytes total)
export const HEADER = [0x43, 0x52, 0x54, 0x00, 0x00];

// Command prefixes (follow the header)
export const CMD_BRIGHTNESS = [0x4c, 0x49, 0x47, 0x00, 0x00]; // "LIG\x00\x00"
export const CMD_IMAGE_ANNOUNCE = [0x42, 0x41, 0x54, 0x00, 0x00]; // "BAT\x00\x00"
export const CMD_FLUSH = [0x53, 0x54, 0x50]; // "STP"
export const CMD_CLEAR = [0x43, 0x4c, 0x45, 0x00, 0x00]; // "CLE\x00\x00"
export const CMD_LOGO = [0x4c, 0x4f, 0x47]; // "LOG" — LCD strip image

// LCD strip (side display) dimensions
export const LCD_STRIP_WIDTH = 854;
export const LCD_STRIP_HEIGHT = 480;

// Input report — key number at byte offset 9
export const INPUT_KEY_OFFSET = 9;

// Device key numbering is column-major from top-right to bottom-left.
// Physical layout for 5-col × 3-row LCD grid (device key numbers, 0-based):
//   12   9   6   3   0
//   13  10   7   4   1
//   14  11   8   5   2
// Non-LCD: 15  16  17
//
// Logical layout (left-to-right, top-to-bottom, 0-based):
//    0   1   2   3   4
//    5   6   7   8   9
//   10  11  12  13  14
// Non-LCD: 15  16  17

// Logical index → device key (0-based), used for sending images
export const LOGICAL_TO_DEVICE = [12, 9, 6, 3, 0, 13, 10, 7, 4, 1, 14, 11, 8, 5, 2];

// Device key (0-based) → logical index, used for parsing input reports
export const DEVICE_TO_LOGICAL = [4, 9, 14, 3, 8, 13, 2, 7, 12, 1, 6, 11, 0, 5, 10];

// Timing
export const POLL_INTERVAL_MS = 2000;
export const KEEPALIVE_INTERVAL_MS = 30000;
export const IMAGE_WRITE_DELAY_MS = 10;
export const ACK_TIMEOUT_MS = 2000;

// Default brightness (0-100)
export const DEFAULT_BRIGHTNESS = 80;

// System stat refresh interval (ms) — how often stat gauges update on device
export const STAT_REFRESH_INTERVAL_MS = 2000;

// Streamdeck config file
export const STREAMDECK_CONFIG_FILENAME = 'streamdeck.json';

// Per-page item count
export const ITEMS_PER_PAGE = 15;
