export const MODIFIER_KEYS = ['Control', 'Shift', 'Alt', 'Meta'] as const;

export const NUMPAD_MAP: Record<string, string> = {
  '0': 'num0', '1': 'num1', '2': 'num2', '3': 'num3', '4': 'num4',
  '5': 'num5', '6': 'num6', '7': 'num7', '8': 'num8', '9': 'num9',
  'Add': 'numadd', 'Subtract': 'numsub', 'Multiply': 'nummult',
  'Divide': 'numdiv', 'Decimal': 'numdec', 'Enter': 'Enter',
};

export const SPECIAL_KEY_MAP: Record<string, string> = {
  'Space': 'Space',
  'ArrowUp': 'Up',
  'ArrowDown': 'Down',
  'ArrowLeft': 'Left',
  'ArrowRight': 'Right',
  'Enter': 'Return',
  'Escape': 'Escape',
  'Backspace': 'Backspace',
  'Delete': 'Delete',
  'Tab': 'Tab',
  'Home': 'Home',
  'End': 'End',
  'PageUp': 'PageUp',
  'PageDown': 'PageDown',
  'Insert': 'Insert',
  'Minus': '-',
  'Equal': '=',
  'BracketLeft': '[',
  'BracketRight': ']',
  'Backslash': '\\',
  'Semicolon': ';',
  'Quote': "'",
  'Comma': ',',
  'Period': '.',
  'Slash': '/',
  'Backquote': '`',
};

// Browser MouseEvent.button → label
// 0=left, 1=middle, 2=right, 3=back, 4=forward
export const MOUSE_BUTTON_LABELS: Record<number, string> = {
  0: 'Mouse1',
  1: 'Mouse3',
  2: 'Mouse2',
  3: 'Mouse4',
  4: 'Mouse5',
};

// Mouse1/Mouse2 require a modifier to avoid blocking normal clicks
export const MOUSE_BUTTONS_REQUIRING_MODIFIER = [0, 2] as const;

// Browser buttons that trigger back/forward navigation
export const MOUSE_NAV_BUTTONS = [3, 4] as const;

export function mapKey(e: KeyboardEvent): string {
  if (e.code.startsWith('Key') && e.code.length === 4) return e.code.slice(3);
  if (e.code.startsWith('Digit') && e.code.length === 6) return e.code.slice(5);
  if (e.code.startsWith('F') && e.code.length >= 2 && e.code.length <= 3) {
    const num = parseInt(e.code.slice(1));
    if (num >= 1 && num <= 24) return e.code;
  }
  if (e.code.startsWith('Numpad')) {
    const suffix = e.code.slice(6);
    return NUMPAD_MAP[suffix] ?? suffix;
  }
  if (SPECIAL_KEY_MAP[e.code]) return SPECIAL_KEY_MAP[e.code];
  return e.code;
}
