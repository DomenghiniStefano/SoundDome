import type HID from 'node-hid';
import {
  buildBrightnessCommand,
  buildImageAnnounce,
  buildImageDataChunks,
  buildFlushCommand,
  buildLogoAnnounce,
  buildClearKeyCommand,
  buildClearAllCommand,
  parseInputReport,
  isAckResponse,
} from './protocol';
import {
  AJAZZ_VENDOR_ID,
  AJAZZ_PRODUCT_ID,
  IMAGE_WRITE_DELAY_MS,
  DEFAULT_BRIGHTNESS,
  ACK_TIMEOUT_MS,
} from './constants';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class AjazzDevice {
  private device: HID.HID | null = null;
  private closed = false;
  private ackResolve: (() => void) | null = null;

  onButtonPress: ((keyIndex: number) => void) | null = null;
  onDisconnect: (() => void) | null = null;
  onError: ((err: Error) => void) | null = null;

  connect(): boolean {
    try {
      const nodeHid = require('node-hid') as typeof HID;
      this.device = new nodeHid.HID(AJAZZ_VENDOR_ID, AJAZZ_PRODUCT_ID);
      this.closed = false;
      this.startReadLoop();
      this.setBrightness(DEFAULT_BRIGHTNESS);
      return true;
    } catch (err) {
      this.device = null;
      return false;
    }
  }

  disconnect() {
    this.closed = true;
    if (this.device) {
      try {
        this.device.close();
      } catch {
        // ignore close errors
      }
      this.device = null;
    }
  }

  isConnected(): boolean {
    return this.device !== null && !this.closed;
  }

  setBrightness(brightness: number) {
    this.write(buildBrightnessCommand(brightness));
  }

  async sendImage(keyIndex: number, jpegData: Buffer) {
    if (!this.isConnected()) return;

    // Announce
    this.write(buildImageAnnounce(keyIndex, jpegData.length));
    await sleep(IMAGE_WRITE_DELAY_MS);

    // Send JPEG data chunks
    const chunks = buildImageDataChunks(jpegData);
    for (const chunk of chunks) {
      this.write(chunk);
      await sleep(IMAGE_WRITE_DELAY_MS);
    }

    // Flush and wait for ACK
    this.write(buildFlushCommand());
    await this.waitForAck();
  }

  async sendLcdStrip(jpegData: Buffer) {
    if (!this.isConnected()) return;
    console.log('[StreamDeck] sendLcdStrip:', jpegData.length, 'bytes');

    // Announce (v1: no size bytes)
    this.write(buildLogoAnnounce());
    await sleep(IMAGE_WRITE_DELAY_MS);

    // Send JPEG data chunks
    const chunks = buildImageDataChunks(jpegData);
    console.log('[StreamDeck] sendLcdStrip: sending', chunks.length, 'chunks');
    for (const chunk of chunks) {
      this.write(chunk);
      await sleep(IMAGE_WRITE_DELAY_MS);
    }

    // Flush and wait for ACK
    this.write(buildFlushCommand());
    await this.waitForAck();
    console.log('[StreamDeck] sendLcdStrip: done');
  }

  clearKey(keyIndex: number) {
    this.write(buildClearKeyCommand(keyIndex));
  }

  clearAll() {
    this.write(buildClearAllCommand());
  }

  private waitForAck(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.ackResolve = resolve;
      setTimeout(() => {
        if (this.ackResolve === resolve) {
          this.ackResolve = null;
          resolve(); // timeout — continue anyway
        }
      }, ACK_TIMEOUT_MS);
    });
  }

  private write(data: Buffer) {
    if (!this.device || this.closed) return;
    try {
      this.device.write([...data]);
    } catch (err) {
      this.handleError(err as Error);
    }
  }

  private startReadLoop() {
    if (!this.device) return;

    this.device.on('data', (data: Buffer) => {
      // Log first 16 bytes of every input report for debugging
      const hex = [...data.slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log('[StreamDeck] Raw input:', hex, 'len:', data.length);

      // Check for ACK — key events also come wrapped in ACK packets
      if (isAckResponse(data)) {
        // Resolve any pending ACK wait
        if (this.ackResolve) {
          const resolve = this.ackResolve;
          this.ackResolve = null;
          resolve();
        }

        // Check if this ACK also carries a key event (byte 9 non-zero)
        const keyByte = data.length > 9 ? data[9] : 0;
        if (keyByte > 0) {
          console.log('[StreamDeck] Key press in ACK, device key:', keyByte);
          const event = parseInputReport(data);
          if (event && this.onButtonPress) {
            console.log('[StreamDeck] Logical key:', event.keyIndex);
            this.onButtonPress(event.keyIndex);
          }
        }
        return;
      }

      // Parse standalone key event (fallback)
      const event = parseInputReport(data);
      if (!event) return;

      console.log('[StreamDeck] Standalone key event, logical:', event.keyIndex);
      if (this.onButtonPress) {
        this.onButtonPress(event.keyIndex);
      }
    });

    this.device.on('error', (err: Error) => {
      this.handleError(err);
    });
  }

  private handleError(err: Error) {
    if (this.closed) return;
    console.error('AjazzDevice error:', err.message);
    this.disconnect();
    if (this.onDisconnect) {
      this.onDisconnect();
    }
    if (this.onError) {
      this.onError(err);
    }
  }

  static isDeviceAvailable(): boolean {
    try {
      const nodeHid = require('node-hid') as typeof HID;
      const devices = nodeHid.devices();
      return devices.some(
        (d: HID.Device) => d.vendorId === AJAZZ_VENDOR_ID && d.productId === AJAZZ_PRODUCT_ID
      );
    } catch {
      return false;
    }
  }

  static listMatchingDevices(): void {
    try {
      const nodeHid = require('node-hid') as typeof HID;
      const devices = nodeHid.devices();
      const matching = devices.filter(
        (d: HID.Device) => d.vendorId === AJAZZ_VENDOR_ID && d.productId === AJAZZ_PRODUCT_ID
      );
      console.log('[StreamDeck] Found', matching.length, 'matching HID interfaces:');
      matching.forEach((d: HID.Device, i: number) => {
        console.log(`  [${i}] interface:${d.interface} usage:${d.usage} usagePage:${d.usagePage} path:${d.path}`);
      });
    } catch (err) {
      console.error('[StreamDeck] Failed to list devices:', err);
    }
  }
}
