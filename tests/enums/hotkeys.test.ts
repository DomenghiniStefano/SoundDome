import { describe, it, expect } from 'vitest';
import { mapKey, NUMPAD_MAP, SPECIAL_KEY_MAP, MOUSE_BUTTON_LABELS, MOUSE_BUTTONS_REQUIRING_MODIFIER, MOUSE_NAV_BUTTONS, MODIFIER_KEYS } from '../../src/enums/hotkeys';

function mockKeyEvent(code: string): KeyboardEvent {
  return { code } as KeyboardEvent;
}

describe('mapKey', () => {
  describe('letter keys', () => {
    it('maps KeyA to A', () => {
      expect(mapKey(mockKeyEvent('KeyA'))).toBe('A');
    });

    it('maps KeyZ to Z', () => {
      expect(mapKey(mockKeyEvent('KeyZ'))).toBe('Z');
    });

    it('maps KeyM to M', () => {
      expect(mapKey(mockKeyEvent('KeyM'))).toBe('M');
    });
  });

  describe('digit keys', () => {
    it('maps Digit0 to 0', () => {
      expect(mapKey(mockKeyEvent('Digit0'))).toBe('0');
    });

    it('maps Digit9 to 9', () => {
      expect(mapKey(mockKeyEvent('Digit9'))).toBe('9');
    });

    it('maps Digit5 to 5', () => {
      expect(mapKey(mockKeyEvent('Digit5'))).toBe('5');
    });
  });

  describe('function keys', () => {
    it('maps F1', () => {
      expect(mapKey(mockKeyEvent('F1'))).toBe('F1');
    });

    it('maps F12', () => {
      expect(mapKey(mockKeyEvent('F12'))).toBe('F12');
    });

    it('maps F24', () => {
      expect(mapKey(mockKeyEvent('F24'))).toBe('F24');
    });

    it('falls through to raw code for F0 (not a valid function key)', () => {
      // F0 has length 2, starts with F, but parseInt("0")=0 fails >=1 check
      // Falls through to return e.code as-is
      expect(mapKey(mockKeyEvent('F0'))).toBe('F0');
    });

    it('falls through to raw code for F25 (out of F1-F24 range)', () => {
      // F25 has length 3, starts with F, but 25 > 24 fails <=24 check
      expect(mapKey(mockKeyEvent('F25'))).toBe('F25');
    });
  });

  describe('numpad keys', () => {
    it('maps Numpad5 to num5', () => {
      expect(mapKey(mockKeyEvent('Numpad5'))).toBe('num5');
    });

    it('maps NumpadAdd to numadd', () => {
      expect(mapKey(mockKeyEvent('NumpadAdd'))).toBe('numadd');
    });

    it('maps NumpadEnter to Enter', () => {
      expect(mapKey(mockKeyEvent('NumpadEnter'))).toBe('Enter');
    });

    it('maps NumpadDecimal to numdec', () => {
      expect(mapKey(mockKeyEvent('NumpadDecimal'))).toBe('numdec');
    });
  });

  describe('special keys', () => {
    it('maps Space to Space', () => {
      expect(mapKey(mockKeyEvent('Space'))).toBe('Space');
    });

    it('maps ArrowUp to Up', () => {
      expect(mapKey(mockKeyEvent('ArrowUp'))).toBe('Up');
    });

    it('maps ArrowDown to Down', () => {
      expect(mapKey(mockKeyEvent('ArrowDown'))).toBe('Down');
    });

    it('maps Enter to Return', () => {
      expect(mapKey(mockKeyEvent('Enter'))).toBe('Return');
    });

    it('maps Escape to Escape', () => {
      expect(mapKey(mockKeyEvent('Escape'))).toBe('Escape');
    });

    it('maps Backspace to Backspace', () => {
      expect(mapKey(mockKeyEvent('Backspace'))).toBe('Backspace');
    });

    it('maps Tab to Tab', () => {
      expect(mapKey(mockKeyEvent('Tab'))).toBe('Tab');
    });
  });

  describe('symbol keys', () => {
    it('maps Minus to -', () => {
      expect(mapKey(mockKeyEvent('Minus'))).toBe('-');
    });

    it('maps Equal to =', () => {
      expect(mapKey(mockKeyEvent('Equal'))).toBe('=');
    });

    it('maps BracketLeft to [', () => {
      expect(mapKey(mockKeyEvent('BracketLeft'))).toBe('[');
    });

    it('maps Slash to /', () => {
      expect(mapKey(mockKeyEvent('Slash'))).toBe('/');
    });
  });

  describe('unknown keys', () => {
    it('returns raw code for unrecognized keys', () => {
      expect(mapKey(mockKeyEvent('SomeUnknownKey'))).toBe('SomeUnknownKey');
    });
  });
});

describe('NUMPAD_MAP', () => {
  it('has all digit keys 0-9', () => {
    for (let i = 0; i <= 9; i++) {
      expect(NUMPAD_MAP[String(i)]).toBe(`num${i}`);
    }
  });

  it('has arithmetic operators', () => {
    expect(NUMPAD_MAP['Add']).toBe('numadd');
    expect(NUMPAD_MAP['Subtract']).toBe('numsub');
    expect(NUMPAD_MAP['Multiply']).toBe('nummult');
    expect(NUMPAD_MAP['Divide']).toBe('numdiv');
  });
});

describe('SPECIAL_KEY_MAP', () => {
  it('has arrow keys', () => {
    expect(SPECIAL_KEY_MAP['ArrowUp']).toBe('Up');
    expect(SPECIAL_KEY_MAP['ArrowDown']).toBe('Down');
    expect(SPECIAL_KEY_MAP['ArrowLeft']).toBe('Left');
    expect(SPECIAL_KEY_MAP['ArrowRight']).toBe('Right');
  });

  it('has navigation keys', () => {
    expect(SPECIAL_KEY_MAP['Home']).toBe('Home');
    expect(SPECIAL_KEY_MAP['End']).toBe('End');
    expect(SPECIAL_KEY_MAP['PageUp']).toBe('PageUp');
    expect(SPECIAL_KEY_MAP['PageDown']).toBe('PageDown');
  });
});

describe('MOUSE_BUTTON_LABELS', () => {
  it('maps browser button 0 (left) to Mouse1', () => {
    expect(MOUSE_BUTTON_LABELS[0]).toBe('Mouse1');
  });

  it('maps browser button 1 (middle) to Mouse3', () => {
    expect(MOUSE_BUTTON_LABELS[1]).toBe('Mouse3');
  });

  it('maps browser button 2 (right) to Mouse2', () => {
    expect(MOUSE_BUTTON_LABELS[2]).toBe('Mouse2');
  });

  it('maps browser button 3 (back) to Mouse4', () => {
    expect(MOUSE_BUTTON_LABELS[3]).toBe('Mouse4');
  });

  it('maps browser button 4 (forward) to Mouse5', () => {
    expect(MOUSE_BUTTON_LABELS[4]).toBe('Mouse5');
  });
});

describe('MOUSE_BUTTONS_REQUIRING_MODIFIER', () => {
  it('includes left click (0) and right click (2)', () => {
    expect(MOUSE_BUTTONS_REQUIRING_MODIFIER).toContain(0);
    expect(MOUSE_BUTTONS_REQUIRING_MODIFIER).toContain(2);
  });

  it('does not include middle/back/forward buttons', () => {
    expect(MOUSE_BUTTONS_REQUIRING_MODIFIER).not.toContain(1);
    expect(MOUSE_BUTTONS_REQUIRING_MODIFIER).not.toContain(3);
    expect(MOUSE_BUTTONS_REQUIRING_MODIFIER).not.toContain(4);
  });
});

describe('MOUSE_NAV_BUTTONS', () => {
  it('includes back (3) and forward (4)', () => {
    expect(MOUSE_NAV_BUTTONS).toContain(3);
    expect(MOUSE_NAV_BUTTONS).toContain(4);
  });
});

describe('MODIFIER_KEYS', () => {
  it('contains exactly 4 modifiers', () => {
    expect(MODIFIER_KEYS).toHaveLength(4);
  });

  it('contains Control, Shift, Alt, Meta', () => {
    expect(MODIFIER_KEYS).toContain('Control');
    expect(MODIFIER_KEYS).toContain('Shift');
    expect(MODIFIER_KEYS).toContain('Alt');
    expect(MODIFIER_KEYS).toContain('Meta');
  });
});
