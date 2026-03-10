import { describe, it, expect } from 'vitest';
import { RoutePath, RouteName } from '../../src/enums/routes';

describe('RoutePath', () => {
  it('ROOT is /', () => {
    expect(RoutePath.ROOT).toBe('/');
  });

  it('all paths start with /', () => {
    for (const path of Object.values(RoutePath)) {
      expect(path.startsWith('/')).toBe(true);
    }
  });

  it('no duplicate paths', () => {
    const values = Object.values(RoutePath);
    expect(new Set(values).size).toBe(values.length);
  });

  it('EDIT_SOUND has :id param', () => {
    expect(RoutePath.EDIT_SOUND).toBe('/library/edit/:id');
  });

  it('EDIT_SOUND is nested under LIBRARY', () => {
    expect(RoutePath.EDIT_SOUND.startsWith(RoutePath.LIBRARY)).toBe(true);
  });

  it('has all expected routes', () => {
    expect(RoutePath.SPLASH).toBe('/splash');
    expect(RoutePath.BROWSE).toBe('/browse');
    expect(RoutePath.LIBRARY).toBe('/library');
    expect(RoutePath.STREAM_DECK).toBe('/streamdeck');
    expect(RoutePath.SETTINGS).toBe('/settings');
    expect(RoutePath.WIDGET).toBe('/widget');
  });
});

describe('RouteName', () => {
  it('no duplicate names', () => {
    const values = Object.values(RouteName);
    expect(new Set(values).size).toBe(values.length);
  });

  it('all names are lowercase kebab-case or single word', () => {
    for (const name of Object.values(RouteName)) {
      expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('has all expected names', () => {
    expect(RouteName.SPLASH).toBe('splash');
    expect(RouteName.BROWSE).toBe('browse');
    expect(RouteName.LIBRARY).toBe('library');
    expect(RouteName.EDIT_SOUND).toBe('edit-sound');
    expect(RouteName.STREAM_DECK).toBe('streamdeck');
    expect(RouteName.SETTINGS).toBe('settings');
    expect(RouteName.WIDGET).toBe('widget');
  });
});
