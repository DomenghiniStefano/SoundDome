/// <reference types="electron" />
const { BrowserWindow } = require('electron');

/**
 * Send an IPC message to all open BrowserWindows.
 * Silently skips destroyed windows.
 */
export function broadcastToWindows(channel: string, ...args: unknown[]) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  }
}
