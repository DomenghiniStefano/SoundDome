import { describe, it, expect } from 'vitest';
import enModule from '../../src/i18n/en';
import itModule from '../../src/i18n/it';

// Handle both default export shapes
const enLocale = (enModule as any).default ?? enModule;
const itLocale = (itModule as any).default ?? itModule;

/**
 * Recursively extract all keys from a nested object as dot-separated paths.
 * e.g. { a: { b: 'x', c: 'y' } } → ['a.b', 'a.c']
 */
function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Extract interpolation parameters from a string (e.g. "{name}" → ["name"])
 */
function extractParams(str: string): string[] {
  const matches = str.match(/\{(\w+)\}/g);
  if (!matches) return [];
  return matches.map(m => m.slice(1, -1)).sort();
}

/**
 * Get a nested value by dot-separated path
 */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

const enKeys = getAllKeys(enLocale as Record<string, unknown>);
const itKeys = getAllKeys(itLocale as Record<string, unknown>);

describe('i18n locale parity', () => {
  describe('structural parity', () => {
    it('English and Italian have the same number of keys', () => {
      expect(enKeys.length).toBe(itKeys.length);
    });

    it('every English key exists in Italian', () => {
      const missingInIt = enKeys.filter(k => !itKeys.includes(k));
      expect(missingInIt).toEqual([]);
    });

    it('every Italian key exists in English', () => {
      const missingInEn = itKeys.filter(k => !enKeys.includes(k));
      expect(missingInEn).toEqual([]);
    });
  });

  describe('top-level sections match', () => {
    it('both locales have the same top-level keys', () => {
      const enTopKeys = Object.keys(enLocale).sort();
      const itTopKeys = Object.keys(itLocale).sort();
      expect(enTopKeys).toEqual(itTopKeys);
    });
  });

  describe('interpolation parameters match', () => {
    // For every key that has {param} placeholders in English,
    // the Italian translation should have the exact same parameters
    const keysWithParams = enKeys.filter(k => {
      const val = getByPath(enLocale as Record<string, unknown>, k);
      return typeof val === 'string' && val.includes('{');
    });

    for (const key of keysWithParams) {
      it(`"${key}" has matching parameters in both locales`, () => {
        const enVal = getByPath(enLocale as Record<string, unknown>, key) as string;
        const itVal = getByPath(itLocale as Record<string, unknown>, key) as string;
        expect(typeof itVal).toBe('string');
        expect(extractParams(itVal)).toEqual(extractParams(enVal));
      });
    }
  });

  describe('no empty translations', () => {
    for (const key of enKeys) {
      it(`en."${key}" is not empty`, () => {
        const val = getByPath(enLocale as Record<string, unknown>, key);
        expect(typeof val).toBe('string');
        expect((val as string).length).toBeGreaterThan(0);
      });
    }

    for (const key of itKeys) {
      it(`it."${key}" is not empty`, () => {
        const val = getByPath(itLocale as Record<string, unknown>, key);
        expect(typeof val).toBe('string');
        expect((val as string).length).toBeGreaterThan(0);
      });
    }
  });

  describe('pluralization parity', () => {
    // vue-i18n uses "|" for pluralization
    const pluralizedKeys = enKeys.filter(k => {
      const val = getByPath(enLocale as Record<string, unknown>, k);
      return typeof val === 'string' && val.includes(' | ');
    });

    for (const key of pluralizedKeys) {
      it(`"${key}" has same number of plural forms in both locales`, () => {
        const enVal = getByPath(enLocale as Record<string, unknown>, key) as string;
        const itVal = getByPath(itLocale as Record<string, unknown>, key) as string;
        const enForms = enVal.split(' | ').length;
        const itForms = itVal.split(' | ').length;
        expect(itForms).toBe(enForms);
      });
    }
  });
});
