export const StoreName = {
  BROWSE: 'browse',
  CONFIG: 'config',
  LIBRARY: 'library',
  STREAMDECK: 'streamdeck',
} as const;

export type StoreNameValue = (typeof StoreName)[keyof typeof StoreName];
