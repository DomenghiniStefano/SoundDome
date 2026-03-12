// Windows media key and keyboard shortcut simulation via koffi (Win32 FFI)
import { log } from '../logger';

let keybd_event: ((bVk: number, bScan: number, dwFlags: number, dwExtraInfo: number) => void) | null = null;

function getKeybdEvent() {
  if (!keybd_event) {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    keybd_event = user32.func('void __stdcall keybd_event(uint8 bVk, uint8 bScan, uint32 dwFlags, uintptr_t dwExtraInfo)');
  }
  return keybd_event!;
}

const KEYEVENTF_KEYUP = 0x0002;

// Virtual key codes
export const VK = {
  // Media keys
  MEDIA_PLAY_PAUSE: 0xB3,
  MEDIA_NEXT_TRACK: 0xB0,
  MEDIA_PREV_TRACK: 0xB1,
  VOLUME_UP: 0xAF,
  VOLUME_DOWN: 0xAE,
  VOLUME_MUTE: 0xAD,

  // Modifier keys
  SHIFT: 0x10,
  CONTROL: 0x11,
  ALT: 0x12,
  LWIN: 0x5B,

  // Common keys
  ENTER: 0x0D,
  ESCAPE: 0x1B,
  SPACE: 0x20,
  TAB: 0x09,
  BACKSPACE: 0x08,
  DELETE: 0x2E,
  HOME: 0x24,
  END: 0x23,
  PAGE_UP: 0x21,
  PAGE_DOWN: 0x22,
  UP: 0x26,
  DOWN: 0x28,
  LEFT: 0x25,
  RIGHT: 0x27,
  PRINT_SCREEN: 0x2C,

  // F-keys
  F1: 0x70, F2: 0x71, F3: 0x72, F4: 0x73,
  F5: 0x74, F6: 0x75, F7: 0x76, F8: 0x77,
  F9: 0x78, F10: 0x79, F11: 0x7A, F12: 0x7B,
} as const;

// Map friendly names to VK codes for letters/numbers/symbols
function charToVk(char: string): number | null {
  const c = char.toUpperCase();
  // A-Z
  if (c.length === 1 && c >= 'A' && c <= 'Z') return c.charCodeAt(0);
  // 0-9
  if (c.length === 1 && c >= '0' && c <= '9') return c.charCodeAt(0);
  return null;
}

export function pressKey(vk: number) {
  const fn = getKeybdEvent();
  fn(vk, 0, 0, 0);
  fn(vk, 0, KEYEVENTF_KEYUP, 0);
}

export function sendMediaKey(action: string) {
  switch (action) {
    case 'playPause': pressKey(VK.MEDIA_PLAY_PAUSE); break;
    case 'nextTrack': pressKey(VK.MEDIA_NEXT_TRACK); break;
    case 'prevTrack': pressKey(VK.MEDIA_PREV_TRACK); break;
    case 'volumeUp': pressKey(VK.VOLUME_UP); break;
    case 'volumeDown': pressKey(VK.VOLUME_DOWN); break;
    case 'volumeMute': pressKey(VK.VOLUME_MUTE); break;
    default:
      log.warn('[MediaKeys] Unknown action:', action);
  }
}

// Parse a shortcut string like "Ctrl+Shift+A" and execute it
export function executeShortcut(shortcut: string) {
  const parts = shortcut.split('+').map(s => s.trim().toLowerCase());
  const modifiers: number[] = [];
  let mainKey: number | null = null;

  for (const part of parts) {
    switch (part) {
      case 'ctrl': case 'control': modifiers.push(VK.CONTROL); break;
      case 'shift': modifiers.push(VK.SHIFT); break;
      case 'alt': modifiers.push(VK.ALT); break;
      case 'win': case 'super': case 'meta': modifiers.push(VK.LWIN); break;
      case 'enter': mainKey = VK.ENTER; break;
      case 'esc': case 'escape': mainKey = VK.ESCAPE; break;
      case 'space': mainKey = VK.SPACE; break;
      case 'tab': mainKey = VK.TAB; break;
      case 'backspace': mainKey = VK.BACKSPACE; break;
      case 'delete': case 'del': mainKey = VK.DELETE; break;
      case 'home': mainKey = VK.HOME; break;
      case 'end': mainKey = VK.END; break;
      case 'pageup': mainKey = VK.PAGE_UP; break;
      case 'pagedown': mainKey = VK.PAGE_DOWN; break;
      case 'up': mainKey = VK.UP; break;
      case 'down': mainKey = VK.DOWN; break;
      case 'left': mainKey = VK.LEFT; break;
      case 'right': mainKey = VK.RIGHT; break;
      case 'printscreen': case 'prtsc': mainKey = VK.PRINT_SCREEN; break;
      case 'f1': mainKey = VK.F1; break;
      case 'f2': mainKey = VK.F2; break;
      case 'f3': mainKey = VK.F3; break;
      case 'f4': mainKey = VK.F4; break;
      case 'f5': mainKey = VK.F5; break;
      case 'f6': mainKey = VK.F6; break;
      case 'f7': mainKey = VK.F7; break;
      case 'f8': mainKey = VK.F8; break;
      case 'f9': mainKey = VK.F9; break;
      case 'f10': mainKey = VK.F10; break;
      case 'f11': mainKey = VK.F11; break;
      case 'f12': mainKey = VK.F12; break;
      default: {
        const vk = charToVk(part);
        if (vk) mainKey = vk;
        else log.warn('[MediaKeys] Unknown key:', part);
      }
    }
  }

  if (mainKey === null && modifiers.length === 0) return;

  const fn = getKeybdEvent();

  // Press modifiers
  for (const mod of modifiers) {
    fn(mod, 0, 0, 0);
  }

  // Press and release main key
  if (mainKey !== null) {
    fn(mainKey, 0, 0, 0);
    fn(mainKey, 0, KEYEVENTF_KEYUP, 0);
  }

  // Release modifiers in reverse
  for (let i = modifiers.length - 1; i >= 0; i--) {
    fn(modifiers[i], 0, KEYEVENTF_KEYUP, 0);
  }
}
