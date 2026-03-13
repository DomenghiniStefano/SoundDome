import { IpcChannel } from '../../src/enums/ipc';
import { broadcastToWindows } from '../broadcast';
import { AjazzDevice } from './device';
import { loadMappings } from './mappings';
import { refreshAllKeys, refreshStatKeys, prebuildImageCache } from './display';
import { sendMediaKey, executeShortcut } from './media-keys';
import { shell } from 'electron';
import { startGpuPolling, stopGpuPolling } from './system-info';
import {
  POLL_INTERVAL_MS,
  STAT_REFRESH_INTERVAL_MS,
} from './constants';
import { StreamDeckActionType } from '../../src/enums/streamdeck';
import { log } from '../logger';
import {
  getDevice,
  setDevice,
  isDeviceConnected,
  getCurrentPage,
  setCurrentPage,
  getCurrentFolder,
  setCurrentFolder,
  getReturnPage,
  setReturnPage,
  getBrightness,
  setDeviceBrightness,
  isInsideFolder,
  getCurrentButtons,
  getPageCount,
} from './state';

// Re-export state getters for external consumers (handlers/streamdeck.ts)
export {
  getDevice,
  isDeviceConnected,
  getCurrentPage,
  setCurrentPage,
  getBrightness,
  setDeviceBrightness,
} from './state';

let pollTimer: ReturnType<typeof setInterval> | null = null;
let statTimer: ReturnType<typeof setInterval> | null = null;

function enterFolder(folderIndex: number) {
  const mappings = loadMappings();
  if (folderIndex < 0 || folderIndex >= mappings.folders.length) return;
  const folder = mappings.folders[folderIndex];
  if (folder.pages.length === 0) return;

  setReturnPage(getCurrentPage());
  setCurrentFolder(folderIndex);
  setCurrentPage(0);
  broadcastToWindows(IpcChannel.STREAMDECK_PAGE_CHANGE, { page: getCurrentPage(), folder: getCurrentFolder() });
  refreshAllKeys().catch(err => log.error('Failed to refresh keys on folder enter:', err));
}

function exitFolder() {
  if (getCurrentFolder() === null) return;
  setCurrentFolder(null);
  setCurrentPage(getReturnPage());
  broadcastToWindows(IpcChannel.STREAMDECK_PAGE_CHANGE, { page: getCurrentPage(), folder: null });
  refreshAllKeys().catch(err => log.error('Failed to refresh keys on folder exit:', err));
}

function navigatePage(delta: number) {
  const count = getPageCount();
  if (count <= 1) return;
  const curPage = getCurrentPage();
  const newPage = (curPage + delta + count) % count;
  if (newPage === curPage) return;
  setCurrentPage(newPage);
  broadcastToWindows(IpcChannel.STREAMDECK_PAGE_CHANGE, { page: getCurrentPage(), folder: getCurrentFolder() });
  refreshAllKeys().catch(err => log.error('Failed to refresh keys on page change:', err));
}

function handleButtonPress(keyIndex: number) {
  const buttons = getCurrentButtons();
  const mapping = buttons[String(keyIndex)];

  if (!mapping) return;
  const insideFolder = isInsideFolder();

  switch (mapping.type) {
    case StreamDeckActionType.SOUND:
      if (mapping.itemId) {
        broadcastToWindows(IpcChannel.STREAMDECK_BUTTON_PRESS, mapping.itemId);
      }
      break;
    case StreamDeckActionType.STOP_ALL:
      broadcastToWindows(IpcChannel.HOTKEY_STOP);
      break;
    case StreamDeckActionType.PAGE_NEXT:
      navigatePage(1);
      return; // Stay in folder
    case StreamDeckActionType.PAGE_PREV:
      navigatePage(-1);
      return; // Stay in folder
    case StreamDeckActionType.FOLDER:
      if (mapping.folderIndex !== undefined) {
        enterFolder(mapping.folderIndex);
      }
      return;
    case StreamDeckActionType.GO_BACK:
      exitFolder();
      return;
    case StreamDeckActionType.MEDIA_PLAY_PAUSE:
      sendMediaKey('playPause');
      break;
    case StreamDeckActionType.MEDIA_NEXT:
      sendMediaKey('nextTrack');
      break;
    case StreamDeckActionType.MEDIA_PREV:
      sendMediaKey('prevTrack');
      break;
    case StreamDeckActionType.MEDIA_VOLUME_UP:
      sendMediaKey('volumeUp');
      break;
    case StreamDeckActionType.MEDIA_VOLUME_DOWN:
      sendMediaKey('volumeDown');
      break;
    case StreamDeckActionType.MEDIA_MUTE:
      sendMediaKey('volumeMute');
      break;
    case StreamDeckActionType.SHORTCUT:
      if (mapping.shortcut) {
        executeShortcut(mapping.shortcut);
      }
      break;
    case StreamDeckActionType.LAUNCH_APP:
      if (mapping.appPath) {
        shell.openPath(mapping.appPath);
      }
      break;
    case StreamDeckActionType.SYSTEM_STAT:
      return; // Display-only, don't auto-close
  }

  // Auto-close folder after action if configured
  if (insideFolder) {
    const mappings = loadMappings();
    const folder = getCurrentFolder() !== null ? mappings.folders[getCurrentFolder()!] : null;
    if (folder && folder.closeAfterAction === true) {
      exitFolder();
    }
  }
}

function hasStatMappings(): boolean {
  const buttons = getCurrentButtons();
  return Object.values(buttons).some(
    (m) => m.type === StreamDeckActionType.SYSTEM_STAT
  );
}

function startStatRefresh() {
  stopStatRefresh();
  if (hasStatMappings()) {
    startGpuPolling();
    statTimer = setInterval(() => {
      if (isDeviceConnected()) {
        refreshStatKeys().catch(err => log.error('Stat refresh error:', err));
      }
    }, STAT_REFRESH_INTERVAL_MS);
    log.info('[StreamDeck] Stat refresh started');
  }
}

function stopStatRefresh() {
  if (statTimer) {
    clearInterval(statTimer);
    statTimer = null;
    stopGpuPolling();
    log.info('[StreamDeck] Stat refresh stopped');
  }
}

export function onMappingsChanged() {
  if (isDeviceConnected()) {
    if (hasStatMappings()) {
      startStatRefresh();
    } else {
      stopStatRefresh();
    }
  }
}

function tryConnect(): boolean {
  if (isDeviceConnected()) return true;
  if (!AjazzDevice.isDeviceAvailable()) return false;

  const newDevice = new AjazzDevice();

  newDevice.onButtonPress = handleButtonPress;
  newDevice.onDisconnect = () => {
    log.info('Stream Deck disconnected');
    broadcastToWindows(IpcChannel.STREAMDECK_DISCONNECT);
    setDevice(null);
    stopStatRefresh();
  };

  const connected = newDevice.connect();
  if (connected) {
    log.info('Stream Deck connected');
    setDevice(newDevice);
    newDevice.clearAll();
    newDevice.setBrightness(getBrightness());
    broadcastToWindows(IpcChannel.STREAMDECK_CONNECT);
    prebuildImageCache()
      .catch(err => log.error('Failed to refresh keys on connect:', err));
    startStatRefresh();
    return true;
  }

  return false;
}

export function startStreamDeckManager() {
  try {
    require('node-hid');
  } catch {
    log.info('node-hid not available, Stream Deck support disabled');
    return;
  }

  const savedMappings = loadMappings();
  if (savedMappings.brightness) {
    setDeviceBrightness(savedMappings.brightness);
  }

  AjazzDevice.listMatchingDevices();
  tryConnect();

  pollTimer = setInterval(() => {
    if (!isDeviceConnected()) {
      tryConnect();
    }
  }, POLL_INTERVAL_MS);
}

export function stopStreamDeckManager() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  stopStatRefresh();
  const dev = getDevice();
  if (dev) {
    dev.disconnect();
    setDevice(null);
  }
}
