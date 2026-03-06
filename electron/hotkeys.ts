/// <reference types="electron" />
const { globalShortcut } = require('electron');

import _ from 'lodash';
import { IpcChannel } from '../src/enums/ipc';
import { loadLibraryIndex } from './library';
import { loadConfig } from './config';
import { broadcastToWindows } from './broadcast';

function safeRegister(accelerator: string, callback: () => void, label: string) {
  try {
    globalShortcut.register(accelerator, callback);
  } catch (err) {
    console.error(`Failed to register hotkey "${accelerator}" for "${label}":`, err);
  }
}

export function registerHotkeys() {
  globalShortcut.unregisterAll();

  const index = loadLibraryIndex();
  _.filter(index, 'hotkey').forEach((item: Record<string, unknown>) => {
    safeRegister(item.hotkey as string, () => {
      broadcastToWindows(IpcChannel.HOTKEY_PLAY, item.id);
    }, item.name as string);
  });

  const config = loadConfig();
  if (config.stopHotkey) {
    safeRegister(config.stopHotkey as string, () => {
      broadcastToWindows(IpcChannel.HOTKEY_STOP);
    }, 'stop');
  }
}
