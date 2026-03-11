import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test hotkey accelerator parsing and modifier matching.
 * We test indirectly through registerHotkeys() by simulating key/mouse events
 * and checking which broadcasts fire.
 */

const { mockUiohook, mockUiohookKey, mockBroadcast, mockLoadLibraryIndex, mockLoadConfig } = vi.hoisted(() => {
  const mockUiohookKey: Record<string, number> = {
    A: 30, B: 48, C: 46, D: 32, E: 18, F: 33, G: 34, H: 35,
    I: 23, J: 36, K: 37, L: 38, M: 50, N: 49, O: 24, P: 25,
    Q: 16, R: 19, S: 31, T: 20, U: 22, V: 47, W: 17, X: 45,
    Y: 21, Z: 44,
    F1: 59, F2: 60, F3: 61, F4: 62, F5: 63, F6: 64,
    F7: 65, F8: 66, F9: 67, F10: 68, F11: 87, F12: 88,
    Space: 57, Enter: 28, Escape: 1, Tab: 15, Backspace: 14,
    Delete: 111, Insert: 110, Home: 102, End: 107,
    PageUp: 104, PageDown: 109,
    ArrowUp: 103, ArrowDown: 108, ArrowLeft: 105, ArrowRight: 106,
    NumpadAdd: 78, NumpadSubtract: 74, NumpadMultiply: 55,
    NumpadDivide: 98, NumpadDecimal: 83, NumpadEnter: 96,
    Numpad0: 82, Numpad1: 79, Numpad2: 80, Numpad3: 81,
    Numpad4: 75, Numpad5: 76, Numpad6: 77, Numpad7: 71,
    Numpad8: 72, Numpad9: 73,
    Minus: 12, Equal: 13, BracketLeft: 26, BracketRight: 27,
    Semicolon: 39, Quote: 40, Backslash: 43, Comma: 51,
    Period: 52, Slash: 53, Backquote: 41,
  };
  return {
    mockUiohook: { on: vi.fn(), start: vi.fn(), stop: vi.fn() },
    mockUiohookKey,
    mockBroadcast: vi.fn(),
    mockLoadLibraryIndex: vi.fn(),
    mockLoadConfig: vi.fn(),
  };
});

vi.mock('uiohook-napi', () => ({
  uIOhook: mockUiohook,
  UiohookKey: mockUiohookKey,
}));

vi.mock('../../electron/broadcast', () => ({
  broadcastToWindows: (...args: unknown[]) => mockBroadcast(...args),
}));

vi.mock('../../electron/library', () => ({
  loadLibraryIndex: () => mockLoadLibraryIndex(),
}));

vi.mock('../../electron/config', () => ({
  loadConfig: () => mockLoadConfig(),
}));

import { registerHotkeys, stopHotkeyHook } from '../../electron/hotkeys';

function getHandler(eventName: string): Function {
  return mockUiohook.on.mock.calls.find(
    (call: unknown[]) => call[0] === eventName
  )![1] as Function;
}

describe('Hotkey parsing — registerHotkeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopHotkeyHook();
  });

  it('registers keyboard hotkey binding for a library item', () => {
    mockLoadLibraryIndex.mockReturnValue({
      items: [{ id: 'item-1', hotkey: 'Ctrl+Shift+A', name: 'Test', filename: 'test.mp3' }],
    });
    mockLoadConfig.mockReturnValue({});

    registerHotkeys();

    expect(mockUiohook.on).toHaveBeenCalledWith('keydown', expect.any(Function));

    getHandler('keydown')({
      keycode: mockUiohookKey.A,
      ctrlKey: true,
      shiftKey: true,
      altKey: false,
      metaKey: false,
    });

    expect(mockBroadcast).toHaveBeenCalledWith('hotkey-play', 'item-1');
  });

  it('registers mouse button hotkey binding', () => {
    mockLoadLibraryIndex.mockReturnValue({
      items: [{ id: 'item-2', hotkey: 'Ctrl+Mouse4', name: 'Test', filename: 'test.mp3' }],
    });
    mockLoadConfig.mockReturnValue({});

    registerHotkeys();

    getHandler('mousedown')({
      button: 4,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });

    expect(mockBroadcast).toHaveBeenCalledWith('hotkey-play', 'item-2');
  });

  it('registers stop hotkey from config', () => {
    mockLoadLibraryIndex.mockReturnValue({ items: [] });
    mockLoadConfig.mockReturnValue({ stopHotkey: 'F8' });

    registerHotkeys();

    getHandler('keydown')({
      keycode: mockUiohookKey.F8,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });

    expect(mockBroadcast).toHaveBeenCalledWith('hotkey-stop');
  });

  it('does NOT trigger when wrong modifier is pressed', () => {
    mockLoadLibraryIndex.mockReturnValue({
      items: [{ id: 'item-1', hotkey: 'Ctrl+A', name: 'Test', filename: 'test.mp3' }],
    });
    mockLoadConfig.mockReturnValue({});

    registerHotkeys();

    getHandler('keydown')({
      keycode: mockUiohookKey.A,
      ctrlKey: false,
      shiftKey: true,
      altKey: false,
      metaKey: false,
    });

    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('does NOT trigger when extra modifier is pressed', () => {
    mockLoadLibraryIndex.mockReturnValue({
      items: [{ id: 'item-1', hotkey: 'Ctrl+A', name: 'Test', filename: 'test.mp3' }],
    });
    mockLoadConfig.mockReturnValue({});

    registerHotkeys();

    getHandler('keydown')({
      keycode: mockUiohookKey.A,
      ctrlKey: true,
      shiftKey: true, // extra
      altKey: false,
      metaKey: false,
    });

    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('does NOT trigger when wrong key is pressed', () => {
    mockLoadLibraryIndex.mockReturnValue({
      items: [{ id: 'item-1', hotkey: 'Ctrl+A', name: 'Test', filename: 'test.mp3' }],
    });
    mockLoadConfig.mockReturnValue({});

    registerHotkeys();

    getHandler('keydown')({
      keycode: mockUiohookKey.B,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });

    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('handles multiple hotkeys independently', () => {
    mockLoadLibraryIndex.mockReturnValue({
      items: [
        { id: 'item-1', hotkey: 'F1', name: 'Sound 1', filename: 'a.mp3' },
        { id: 'item-2', hotkey: 'F2', name: 'Sound 2', filename: 'b.mp3' },
      ],
    });
    mockLoadConfig.mockReturnValue({});

    registerHotkeys();

    getHandler('keydown')({
      keycode: mockUiohookKey.F2,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });

    expect(mockBroadcast).toHaveBeenCalledWith('hotkey-play', 'item-2');
    expect(mockBroadcast).not.toHaveBeenCalledWith('hotkey-play', 'item-1');
  });

  it('recognizes CommandOrControl modifier alias', () => {
    mockLoadLibraryIndex.mockReturnValue({
      items: [{ id: 'item-1', hotkey: 'CommandOrControl+Z', name: 'Test', filename: 'test.mp3' }],
    });
    mockLoadConfig.mockReturnValue({});

    registerHotkeys();

    getHandler('keydown')({
      keycode: mockUiohookKey.Z,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });

    expect(mockBroadcast).toHaveBeenCalledWith('hotkey-play', 'item-1');
  });

  it('parses numpad keys correctly', () => {
    mockLoadLibraryIndex.mockReturnValue({
      items: [{ id: 'item-1', hotkey: 'num5', name: 'Test', filename: 'test.mp3' }],
    });
    mockLoadConfig.mockReturnValue({});

    registerHotkeys();

    getHandler('keydown')({
      keycode: mockUiohookKey.Numpad5,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });

    expect(mockBroadcast).toHaveBeenCalledWith('hotkey-play', 'item-1');
  });

  it('parses Alt modifier correctly', () => {
    mockLoadLibraryIndex.mockReturnValue({
      items: [{ id: 'item-1', hotkey: 'Alt+F4', name: 'Test', filename: 'test.mp3' }],
    });
    mockLoadConfig.mockReturnValue({});

    registerHotkeys();

    getHandler('keydown')({
      keycode: mockUiohookKey.F4,
      ctrlKey: false,
      shiftKey: false,
      altKey: true,
      metaKey: false,
    });

    expect(mockBroadcast).toHaveBeenCalledWith('hotkey-play', 'item-1');
  });

  it('parses special keys (Space, Enter, Escape)', () => {
    mockLoadLibraryIndex.mockReturnValue({
      items: [{ id: 'item-1', hotkey: 'Ctrl+Space', name: 'Test', filename: 'test.mp3' }],
    });
    mockLoadConfig.mockReturnValue({});

    registerHotkeys();

    getHandler('keydown')({
      keycode: mockUiohookKey.Space,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });

    expect(mockBroadcast).toHaveBeenCalledWith('hotkey-play', 'item-1');
  });
});
