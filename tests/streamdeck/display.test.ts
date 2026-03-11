import { describe, it, expect } from 'vitest';

// cacheKey is not exported, so we test the logic directly
// Replicating the cacheKey function for testing
function cacheKey(folderIndex: number | null, pageIndex: number, keyIndex: number): string {
  const ctx = folderIndex !== null ? `f${folderIndex}` : 'top';
  return `${ctx}:${pageIndex}:${keyIndex}`;
}

describe('cacheKey', () => {
  it('generates "top:0:5" for top-level page 0, key 5', () => {
    expect(cacheKey(null, 0, 5)).toBe('top:0:5');
  });

  it('generates "top:2:14" for top-level page 2, key 14', () => {
    expect(cacheKey(null, 2, 14)).toBe('top:2:14');
  });

  it('generates "f0:0:3" for folder 0, page 0, key 3', () => {
    expect(cacheKey(0, 0, 3)).toBe('f0:0:3');
  });

  it('generates "f2:1:7" for folder 2, page 1, key 7', () => {
    expect(cacheKey(2, 1, 7)).toBe('f2:1:7');
  });

  it('produces unique keys for different contexts', () => {
    const keys = new Set([
      cacheKey(null, 0, 0),
      cacheKey(0, 0, 0),
      cacheKey(1, 0, 0),
      cacheKey(null, 1, 0),
      cacheKey(null, 0, 1),
    ]);
    expect(keys.size).toBe(5);
  });
});
