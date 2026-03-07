import _ from 'lodash';
import { uIOhook, UiohookKey } from 'uiohook-napi';
import { IpcChannel } from '../src/enums/ipc';
import { loadLibraryIndex, type LibraryItem } from './library';
import { loadConfig } from './config';
import { broadcastToWindows } from './broadcast';

interface Modifiers {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

interface KeyBinding {
  type: 'key';
  modifiers: Modifiers;
  keyCode: number;
  callback: () => void;
}

interface MouseBinding {
  type: 'mouse';
  modifiers: Modifiers;
  button: number;
  callback: () => void;
}

type HotkeyBinding = KeyBinding | MouseBinding;

const KEY_MAP: Record<string, number> = {
  // Letters
  a: UiohookKey.A, b: UiohookKey.B, c: UiohookKey.C, d: UiohookKey.D,
  e: UiohookKey.E, f: UiohookKey.F, g: UiohookKey.G, h: UiohookKey.H,
  i: UiohookKey.I, j: UiohookKey.J, k: UiohookKey.K, l: UiohookKey.L,
  m: UiohookKey.M, n: UiohookKey.N, o: UiohookKey.O, p: UiohookKey.P,
  q: UiohookKey.Q, r: UiohookKey.R, s: UiohookKey.S, t: UiohookKey.T,
  u: UiohookKey.U, v: UiohookKey.V, w: UiohookKey.W, x: UiohookKey.X,
  y: UiohookKey.Y, z: UiohookKey.Z,
  // Numbers (raw scancodes: 0=11, 1=2, 2=3, ..., 9=10)
  '0': 11, '1': 2, '2': 3, '3': 4, '4': 5,
  '5': 6, '6': 7, '7': 8, '8': 9, '9': 10,
  // Function keys
  f1: UiohookKey.F1, f2: UiohookKey.F2, f3: UiohookKey.F3, f4: UiohookKey.F4,
  f5: UiohookKey.F5, f6: UiohookKey.F6, f7: UiohookKey.F7, f8: UiohookKey.F8,
  f9: UiohookKey.F9, f10: UiohookKey.F10, f11: UiohookKey.F11, f12: UiohookKey.F12,
  // Special keys
  space: UiohookKey.Space, enter: UiohookKey.Enter, return: UiohookKey.Enter,
  escape: UiohookKey.Escape, esc: UiohookKey.Escape,
  tab: UiohookKey.Tab, backspace: UiohookKey.Backspace,
  delete: UiohookKey.Delete, insert: UiohookKey.Insert,
  home: UiohookKey.Home, end: UiohookKey.End,
  pageup: UiohookKey.PageUp, pagedown: UiohookKey.PageDown,
  up: UiohookKey.ArrowUp, down: UiohookKey.ArrowDown,
  left: UiohookKey.ArrowLeft, right: UiohookKey.ArrowRight,
  // Numpad
  numadd: UiohookKey.NumpadAdd, numsub: UiohookKey.NumpadSubtract,
  nummult: UiohookKey.NumpadMultiply, numdiv: UiohookKey.NumpadDivide,
  numdec: UiohookKey.NumpadDecimal, numenter: UiohookKey.NumpadEnter,
  num0: UiohookKey.Numpad0, num1: UiohookKey.Numpad1, num2: UiohookKey.Numpad2,
  num3: UiohookKey.Numpad3, num4: UiohookKey.Numpad4, num5: UiohookKey.Numpad5,
  num6: UiohookKey.Numpad6, num7: UiohookKey.Numpad7, num8: UiohookKey.Numpad8,
  num9: UiohookKey.Numpad9,
  // Symbols
  '-': UiohookKey.Minus, '=': UiohookKey.Equal,
  '[': UiohookKey.BracketLeft, ']': UiohookKey.BracketRight,
  ';': UiohookKey.Semicolon, "'": UiohookKey.Quote,
  '\\': UiohookKey.Backslash, ',': UiohookKey.Comma,
  '.': UiohookKey.Period, '/': UiohookKey.Slash,
  '`': UiohookKey.Backquote,
  minus: UiohookKey.Minus, plus: UiohookKey.Equal, equal: UiohookKey.Equal,
};

// Accelerator label → uiohook button value
// uiohook: 1=left, 2=right, 3=middle, 4=X1(back), 5=X2(forward)
const MOUSE_BUTTON_MAP: Record<string, number> = {
  mouse1: 1,
  mouse2: 2,
  mouse3: 3,
  mouse4: 4,
  mouse5: 5,
};

let bindings: HotkeyBinding[] = [];
let started = false;
let suspended = false;

export function setSuspended(value: boolean) {
  suspended = value;
}

function parseModifiers(parts: string[]): Modifiers {
  const modifiers: Modifiers = { ctrl: false, shift: false, alt: false, meta: false };
  for (const part of parts) {
    const mod = part.trim();
    if (mod === 'ctrl' || mod === 'control' || mod === 'commandorcontrol' || mod === 'cmdorctrl') {
      modifiers.ctrl = true;
    } else if (mod === 'shift') {
      modifiers.shift = true;
    } else if (mod === 'alt') {
      modifiers.alt = true;
    } else if (mod === 'meta' || mod === 'super' || mod === 'cmd' || mod === 'command') {
      modifiers.meta = true;
    }
  }
  return modifiers;
}

function parseAccelerator(accelerator: string): Omit<KeyBinding, 'callback'> | Omit<MouseBinding, 'callback'> | null {
  const parts = accelerator.toLowerCase().split('+');
  const key = _.last(parts)!.trim();
  const modifiers = parseModifiers(parts.slice(0, -1));

  const mouseButton = MOUSE_BUTTON_MAP[key];
  if (mouseButton != null) {
    return { type: 'mouse', modifiers, button: mouseButton };
  }

  const keyCode = KEY_MAP[key];
  if (!keyCode) {
    console.error(`Unknown hotkey key: "${key}" in accelerator "${accelerator}"`);
    return null;
  }

  return { type: 'key', modifiers, keyCode };
}

function matchModifiers(event: { ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }, modifiers: Modifiers): boolean {
  return (
    !!event.ctrlKey === modifiers.ctrl &&
    !!event.shiftKey === modifiers.shift &&
    !!event.altKey === modifiers.alt &&
    !!event.metaKey === modifiers.meta
  );
}

export function registerHotkeys() {
  bindings = [];

  const { items } = loadLibraryIndex();
  _.filter(items, 'hotkey').forEach((item: LibraryItem) => {
    const parsed = parseAccelerator(item.hotkey as string);
    if (parsed) {
      bindings.push({
        ...parsed,
        callback: () => broadcastToWindows(IpcChannel.HOTKEY_PLAY, item.id),
      } as HotkeyBinding);
    }
  });

  const config = loadConfig();
  if (config.stopHotkey) {
    const parsed = parseAccelerator(config.stopHotkey as string);
    if (parsed) {
      bindings.push({
        ...parsed,
        callback: () => broadcastToWindows(IpcChannel.HOTKEY_STOP),
      } as HotkeyBinding);
    }
  }

  if (!started && !_.isEmpty(bindings)) {
    uIOhook.on('keydown', (e) => {
      if (suspended) return;
      for (const binding of bindings) {
        if (binding.type === 'key' && e.keycode === binding.keyCode && matchModifiers(e, binding.modifiers)) {
          binding.callback();
        }
      }
    });

    uIOhook.on('mousedown', (e) => {
      if (suspended) return;
      for (const binding of bindings) {
        if (binding.type === 'mouse' && (e.button as number) === binding.button && matchModifiers(e, binding.modifiers)) {
          binding.callback();
        }
      }
    });

    uIOhook.start();
    started = true;
  }
}

export function stopHotkeyHook() {
  bindings = [];
  if (started) {
    uIOhook.stop();
    started = false;
  }
}
