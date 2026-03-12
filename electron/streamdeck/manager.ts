import { IpcChannel } from '../../src/enums/ipc';
import { broadcastToWindows } from '../broadcast';
import { AjazzDevice } from './device';
import { loadMappings, getPageButtons, getFolderPageButtons } from './mappings';
import { refreshAllKeys, refreshStatKeys, prebuildImageCache } from './display';
import { sendMediaKey, executeShortcut } from './media-keys';
import { shell } from 'electron';
import { getSystemStats, startGpuPolling, stopGpuPolling } from './system-info';
import {
  POLL_INTERVAL_MS,
  LCD_KEY_COUNT,
  DEFAULT_BRIGHTNESS,
  STAT_REFRESH_INTERVAL_MS,
} from './constants';
import { StreamDeckActionType } from '../../src/enums/streamdeck';
import { log } from '../logger';

let device: AjazzDevice | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let statTimer: ReturnType<typeof setInterval> | null = null;
let currentPage = 0;
let currentFolder: number | null = null; // null = top-level, number = folder index
let returnPage = 0; // page to return to when exiting folder
let brightness = DEFAULT_BRIGHTNESS;

export function getDevice(): AjazzDevice | null {
  return device;
}

export function isDeviceConnected(): boolean {
  return device !== null && device.isConnected();
}

export function getCurrentPage(): number {
  return currentPage;
}

export function getCurrentFolder(): number | null {
  return currentFolder;
}

export function setCurrentPage(page: number) {
  currentPage = Math.max(0, page);
}

export function getBrightness(): number {
  return brightness;
}

export function setDeviceBrightness(value: number) {
  brightness = Math.max(0, Math.min(100, value));
  if (device && device.isConnected()) {
    device.setBrightness(brightness);
  }
}

function isInsideFolder(): boolean {
  return currentFolder !== null;
}

// Get buttons for the current context (top-level page or folder page)
function getCurrentButtons() {
  const mappings = loadMappings();
  if (currentFolder !== null) {
    return getFolderPageButtons(mappings, currentFolder, currentPage);
  }
  return getPageButtons(mappings, currentPage);
}

// Get page count for current context
function getPageCount(): number {
  const mappings = loadMappings();
  if (currentFolder !== null) {
    const folder = mappings.folders[currentFolder];
    return folder ? folder.pages.length : 0;
  }
  return mappings.pages.length;
}

function enterFolder(folderIndex: number) {
  const mappings = loadMappings();
  if (folderIndex < 0 || folderIndex >= mappings.folders.length) return;
  const folder = mappings.folders[folderIndex];
  if (folder.pages.length === 0) return;

  returnPage = currentPage;
  currentFolder = folderIndex;
  currentPage = 0;
  broadcastToWindows(IpcChannel.STREAMDECK_PAGE_CHANGE, { page: currentPage, folder: currentFolder });
  refreshAllKeys().catch(err => log.error('Failed to refresh keys on folder enter:', err));
}

function exitFolder() {
  if (currentFolder === null) return;
  currentFolder = null;
  currentPage = returnPage;
  broadcastToWindows(IpcChannel.STREAMDECK_PAGE_CHANGE, { page: currentPage, folder: null });
  refreshAllKeys().catch(err => log.error('Failed to refresh keys on folder exit:', err));
}

function navigatePage(delta: number) {
  const count = getPageCount();
  if (count <= 1) return;
  const newPage = (currentPage + delta + count) % count;
  if (newPage === currentPage) return;
  currentPage = newPage;
  broadcastToWindows(IpcChannel.STREAMDECK_PAGE_CHANGE, { page: currentPage, folder: currentFolder });
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
    const folder = currentFolder !== null ? mappings.folders[currentFolder] : null;
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
      if (device && device.isConnected()) {
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
  if (device && device.isConnected()) {
    if (hasStatMappings()) {
      startStatRefresh();
    } else {
      stopStatRefresh();
    }
  }
}

function tryConnect(): boolean {
  if (device && device.isConnected()) return true;
  if (!AjazzDevice.isDeviceAvailable()) return false;

  device = new AjazzDevice();

  device.onButtonPress = handleButtonPress;
  device.onDisconnect = () => {
    log.info('Stream Deck disconnected');
    broadcastToWindows(IpcChannel.STREAMDECK_DISCONNECT);
    device = null;
    stopStatRefresh();
  };

  const connected = device.connect();
  if (connected) {
    log.info('Stream Deck connected');
    device.clearAll();
    device.setBrightness(brightness);
    broadcastToWindows(IpcChannel.STREAMDECK_CONNECT);
    prebuildImageCache()
      .catch(err => log.error('Failed to refresh keys on connect:', err));
    startStatRefresh();
    return true;
  }

  device = null;
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
    brightness = savedMappings.brightness;
  }

  AjazzDevice.listMatchingDevices();
  tryConnect();

  pollTimer = setInterval(() => {
    if (!device || !device.isConnected()) {
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
  if (device) {
    device.disconnect();
    device = null;
  }
}
