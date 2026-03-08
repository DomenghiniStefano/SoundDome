/// <reference types="electron" />
const { ipcMain, BrowserWindow } = require('electron');

import { IpcChannel } from '../../src/enums/ipc';
import { getMainWindow, toggleWidget, closeWidget, isWidgetOpen } from '../windows';

function broadcastExcludingSender(channel: string, sender: Electron.WebContents, ...args: unknown[]) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.webContents !== sender) {
      win.webContents.send(channel, ...args);
    }
  }
}

export function registerWindowHandlers() {
  ipcMain.handle(IpcChannel.WINDOW_MINIMIZE, () => getMainWindow()?.minimize());

  ipcMain.handle(IpcChannel.WINDOW_MAXIMIZE, () => {
    const win = getMainWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle(IpcChannel.WINDOW_CLOSE, () => {
    getMainWindow()?.close();
  });

  ipcMain.handle(IpcChannel.WINDOW_IS_MAXIMIZED, () => getMainWindow()?.isMaximized() ?? false);

  ipcMain.handle(IpcChannel.WIDGET_TOGGLE, () => toggleWidget());
  ipcMain.handle(IpcChannel.WIDGET_CLOSE, () => closeWidget());
  ipcMain.handle(IpcChannel.WIDGET_IS_OPEN, () => isWidgetOpen());

  ipcMain.handle(IpcChannel.PLAYBACK_STARTED, (event: Electron.IpcMainInvokeEvent, data: { cardId: string; name: string }) => {
    broadcastExcludingSender(IpcChannel.PLAYBACK_STARTED, event.sender, data);
  });

  ipcMain.handle(IpcChannel.PLAYBACK_STOPPED, (event: Electron.IpcMainInvokeEvent) => {
    broadcastExcludingSender(IpcChannel.PLAYBACK_STOPPED, event.sender);
  });
}
