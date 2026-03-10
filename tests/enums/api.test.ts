import { describe, it, expect } from 'vitest';
import { MYINSTANTS_API_URL, MYINSTANTS_BASE_URL } from '../../src/enums/api';

describe('API URLs', () => {
  describe('MYINSTANTS_API_URL', () => {
    it('uses HTTPS', () => {
      expect(MYINSTANTS_API_URL.startsWith('https://')).toBe(true);
    });

    it('points to myinstants.com', () => {
      expect(MYINSTANTS_API_URL).toContain('myinstants.com');
    });

    it('includes API v1 path', () => {
      expect(MYINSTANTS_API_URL).toContain('/api/v1/');
    });

    it('ends with instants/ endpoint', () => {
      expect(MYINSTANTS_API_URL.endsWith('/instants/')).toBe(true);
    });
  });

  describe('MYINSTANTS_BASE_URL', () => {
    it('uses HTTPS', () => {
      expect(MYINSTANTS_BASE_URL.startsWith('https://')).toBe(true);
    });

    it('points to myinstants.com', () => {
      expect(MYINSTANTS_BASE_URL).toContain('myinstants.com');
    });

    it('does not have trailing slash', () => {
      expect(MYINSTANTS_BASE_URL.endsWith('/')).toBe(false);
    });

    it('API URL starts with BASE URL', () => {
      expect(MYINSTANTS_API_URL.startsWith(MYINSTANTS_BASE_URL)).toBe(true);
    });
  });
});
