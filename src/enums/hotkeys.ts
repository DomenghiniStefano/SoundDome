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
