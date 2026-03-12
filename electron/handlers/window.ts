/// <reference types="electron" />

import { IpcChannel } from '../../src/enums/ipc';
import { getMainWindow, toggleWidget, closeWidget, isWidgetOpen } from '../windows';
import { broadcastExcludingSender } from '../broadcast';
import { safeHandle } from '../logger';

export function registerWindowHandlers() {
  safeHandle(IpcChannel.WINDOW_MINIMIZE, () => getMainWindow()?.minimize());

  safeHandle(IpcChannel.WINDOW_MAXIMIZE, () => {
    const win = getMainWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  safeHandle(IpcChannel.WINDOW_CLOSE, () => {
    getMainWindow()?.close();
  });

  safeHandle(IpcChannel.WINDOW_IS_MAXIMIZED, () => getMainWindow()?.isMaximized() ?? false);

  safeHandle(IpcChannel.WIDGET_TOGGLE, () => toggleWidget());
  safeHandle(IpcChannel.WIDGET_CLOSE, () => closeWidget());
  safeHandle(IpcChannel.WIDGET_IS_OPEN, () => isWidgetOpen());

  safeHandle(IpcChannel.PLAYBACK_STARTED, (event: Electron.IpcMainInvokeEvent, data: { cardId: string; name: string }) => {
    broadcastExcludingSender(IpcChannel.PLAYBACK_STARTED, event.sender, data);
  });

  safeHandle(IpcChannel.PLAYBACK_STOPPED, (event: Electron.IpcMainInvokeEvent) => {
    broadcastExcludingSender(IpcChannel.PLAYBACK_STOPPED, event.sender);
  });
}
