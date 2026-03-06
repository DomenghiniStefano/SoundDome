/// <reference types="electron" />
const { ipcMain } = require('electron');

import { IpcChannel } from '../../src/enums/ipc';
import { getMainWindow, toggleWidget, closeWidget, isWidgetOpen } from '../windows';

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
}
