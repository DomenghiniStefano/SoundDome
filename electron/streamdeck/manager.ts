import { IpcChannel } from '../../src/enums/ipc';
import { broadcastToWindows } from '../broadcast';
import { AjazzDevice } from './device';
import { loadMappings, getPageButtons } from './mappings';
import { refreshAllKeys, refreshStatKeys, prebuildImageCache } from './display';
import { sendMediaKey, executeShortcut } from './media-keys';
import { getSystemStats, startGpuPolling, stopGpuPolling } from './system-info';
import {
  POLL_INTERVAL_MS,
  LCD_KEY_COUNT,
  DEFAULT_BRIGHTNESS,
  STAT_REFRESH_INTERVAL_MS,
} from './constants';
import { StreamDeckActionType } from '../../src/enums/streamdeck';

let device: AjazzDevice | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let statTimer: ReturnType<typeof setInterval> | null = null;
let currentPage = 0;
let pageHistory: number[] = []; // Stack for go-back navigation
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

export function setCurrentPage(page: number) {
  const mappings = loadMappings();
  const maxPage = Math.max(0, mappings.pages.length - 1);
  currentPage = Math.max(0, Math.min(page, maxPage));
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

function navigateToPage(pageIndex: number) {
  const mappings = loadMappings();
  if (pageIndex < 0 || pageIndex >= mappings.pages.length) return;
  if (pageIndex === currentPage) return;

  pageHistory.push(currentPage);
  currentPage = pageIndex;
  broadcastToWindows(IpcChannel.STREAMDECK_PAGE_CHANGE, currentPage);
  refreshAllKeys().catch(err => console.error('Failed to refresh keys on page change:', err));
}

function navigateBack() {
  if (pageHistory.length === 0) return;
  currentPage = pageHistory.pop()!;
  broadcastToWindows(IpcChannel.STREAMDECK_PAGE_CHANGE, currentPage);
  refreshAllKeys().catch(err => console.error('Failed to refresh keys on go-back:', err));
}

function handleButtonPress(keyIndex: number) {
  console.log('[StreamDeck] Button press, logical key:', keyIndex, 'page:', currentPage);
  const mappings = loadMappings();
  const buttons = getPageButtons(mappings, currentPage);
  const mapping = buttons[String(keyIndex)];

  if (!mapping) {
    // No mapping = no action (blank key)
    return;
  }

  // Track whether we're inside a folder (entered via navigateToPage)
  const insideFolder = pageHistory.length > 0;

  switch (mapping.type) {
    case StreamDeckActionType.SOUND:
      if (mapping.itemId) {
        broadcastToWindows(IpcChannel.STREAMDECK_BUTTON_PRESS, mapping.itemId);
      }
      break;
    case StreamDeckActionType.STOP_ALL:
      broadcastToWindows(IpcChannel.HOTKEY_STOP);
      break;
    case StreamDeckActionType.PAGE_NEXT: {
      const nextPage = (currentPage + 1) % mappings.pages.length;
      navigateToPage(nextPage);
      return; // Navigation action — don't auto-close folder
    }
    case StreamDeckActionType.PAGE_PREV: {
      const prevPage = (currentPage - 1 + mappings.pages.length) % mappings.pages.length;
      navigateToPage(prevPage);
      return; // Navigation action — don't auto-close folder
    }
    case StreamDeckActionType.FOLDER:
      if (mapping.pageIndex !== undefined) {
        navigateToPage(mapping.pageIndex);
      }
      return; // Navigation action — don't auto-close folder
    case StreamDeckActionType.GO_BACK:
      navigateBack();
      return; // Navigation action — don't auto-close folder
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
    case StreamDeckActionType.SYSTEM_STAT:
      // Stats are display-only, no action on press
      return; // Don't auto-close folder for stat keys
  }

  // Auto-close folder: if we got here via a folder, go back after the action
  if (insideFolder) {
    navigateBack();
  }
}

function hasStatMappings(): boolean {
  const mappings = loadMappings();
  const buttons = getPageButtons(mappings, currentPage);
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
        refreshStatKeys().catch(err => console.error('Stat refresh error:', err));
      }
    }, STAT_REFRESH_INTERVAL_MS);
    console.log('[StreamDeck] Stat refresh started');
  }
}

function stopStatRefresh() {
  if (statTimer) {
    clearInterval(statTimer);
    statTimer = null;
    stopGpuPolling();
    console.log('[StreamDeck] Stat refresh stopped');
  }
}

// Called when mappings change to start/stop stat timer as needed
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
    console.log('Stream Deck disconnected');
    broadcastToWindows(IpcChannel.STREAMDECK_DISCONNECT);
    device = null;
    stopStatRefresh();
  };

  const connected = device.connect();
  if (connected) {
    console.log('Stream Deck connected');
    device.clearAll();
    device.setBrightness(brightness);
    broadcastToWindows(IpcChannel.STREAMDECK_CONNECT);
    prebuildImageCache()
      .catch(err => console.error('Failed to refresh keys on connect:', err));
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
    console.log('node-hid not available, Stream Deck support disabled');
    return;
  }

  // Load saved brightness
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
