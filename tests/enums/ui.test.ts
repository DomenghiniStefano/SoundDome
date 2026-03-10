import { describe, it, expect } from 'vitest';
import { parseImage, isCustomImage, isFileImage, ImageType, ImagePrefix } from '../../src/enums/ui';

describe('parseImage', () => {
  describe('null/undefined/empty', () => {
    it('returns NONE for null', () => {
      const result = parseImage(null);
      expect(result.type).toBe(ImageType.NONE);
      expect(result.value).toBeNull();
    });

    it('returns NONE for undefined', () => {
      const result = parseImage(undefined);
      expect(result.type).toBe(ImageType.NONE);
      expect(result.value).toBeNull();
    });

    it('returns NONE for empty string', () => {
      const result = parseImage('');
      expect(result.type).toBe(ImageType.NONE);
      expect(result.value).toBeNull();
    });
  });

  describe('icon prefix', () => {
    it('parses "icon:music" correctly', () => {
      const result = parseImage('icon:music');
      expect(result.type).toBe(ImageType.ICON);
      expect(result.value).toBe('music');
    });

    it('parses "icon:headphones" correctly', () => {
      const result = parseImage('icon:headphones');
      expect(result.type).toBe(ImageType.ICON);
      expect(result.value).toBe('headphones');
    });

    it('handles empty icon value', () => {
      const result = parseImage('icon:');
      expect(result.type).toBe(ImageType.ICON);
      expect(result.value).toBe('');
    });
  });

  describe('emoji prefix', () => {
    it('parses emoji correctly', () => {
      const result = parseImage('emoji:🎵');
      expect(result.type).toBe(ImageType.EMOJI);
      expect(result.value).toBe('🎵');
    });

    it('parses multi-char emoji', () => {
      const result = parseImage('emoji:👍🏻');
      expect(result.type).toBe(ImageType.EMOJI);
      expect(result.value).toBe('👍🏻');
    });
  });

  describe('text prefix', () => {
    it('parses "text:Sound" correctly', () => {
      const result = parseImage('text:Sound');
      expect(result.type).toBe(ImageType.TEXT);
      expect(result.value).toBe('Sound');
    });

    it('parses text with spaces', () => {
      const result = parseImage('text:My Sound Effect');
      expect(result.type).toBe(ImageType.TEXT);
      expect(result.value).toBe('My Sound Effect');
    });
  });

  describe('file paths (no prefix)', () => {
    it('treats plain string as FILE', () => {
      const result = parseImage('/path/to/image.png');
      expect(result.type).toBe(ImageType.FILE);
      expect(result.value).toBe('/path/to/image.png');
    });

    it('treats filename as FILE', () => {
      const result = parseImage('abc123.png');
      expect(result.type).toBe(ImageType.FILE);
      expect(result.value).toBe('abc123.png');
    });

    it('does not match partial prefix "ico:" as icon', () => {
      const result = parseImage('ico:something');
      expect(result.type).toBe(ImageType.FILE);
    });
  });
});

describe('isCustomImage', () => {
  it('returns true for ICON type', () => {
    expect(isCustomImage(parseImage('icon:music'))).toBe(true);
  });

  it('returns true for EMOJI type', () => {
    expect(isCustomImage(parseImage('emoji:🎵'))).toBe(true);
  });

  it('returns true for TEXT type', () => {
    expect(isCustomImage(parseImage('text:Hello'))).toBe(true);
  });

  it('returns false for FILE type', () => {
    expect(isCustomImage(parseImage('image.png'))).toBe(false);
  });

  it('returns false for NONE type', () => {
    expect(isCustomImage(parseImage(null))).toBe(false);
  });
});

describe('isFileImage', () => {
  it('returns true for file paths', () => {
    expect(isFileImage('image.png')).toBe(true);
    expect(isFileImage('/path/to/file.jpg')).toBe(true);
  });

  it('returns false for icon prefix', () => {
    expect(isFileImage('icon:music')).toBe(false);
  });

  it('returns false for emoji prefix', () => {
    expect(isFileImage('emoji:🎵')).toBe(false);
  });

  it('returns false for text prefix', () => {
    expect(isFileImage('text:Hello')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isFileImage(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isFileImage(undefined)).toBe(false);
  });
});

describe('ImagePrefix constants', () => {
  it('ICON prefix ends with colon', () => {
    expect(ImagePrefix.ICON).toBe('icon:');
  });

  it('EMOJI prefix ends with colon', () => {
    expect(ImagePrefix.EMOJI).toBe('emoji:');
  });

  it('TEXT prefix ends with colon', () => {
    expect(ImagePrefix.TEXT).toBe('text:');
  });
});
