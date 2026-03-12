/// <reference types="electron" />
const { ipcMain } = require('electron');
import log from 'electron-log/main';

const LOG_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Configure file transport
log.transports.file.maxSize = LOG_MAX_SIZE;
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
log.transports.file.fileName = 'main.log';

// Initialize renderer → file IPC transport (injects preload automatically)
try {
  log.initialize();
} catch {
  // Silently ignore in non-Electron environments (vitest)
}

/**
 * Wraps an IPC handler with try/catch logging.
 * Errors are logged and re-thrown so the renderer still receives them.
 */
export function safeHandle<T extends unknown[]>(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: T) => unknown
): void {
  ipcMain.handle(channel, async (event: Electron.IpcMainInvokeEvent, ...args: T) => {
    try {
      return await handler(event, ...args);
    } catch (err) {
      log.error(`[IPC] ${channel} failed:`, err);
      throw err;
    }
  });
}

export { log };
