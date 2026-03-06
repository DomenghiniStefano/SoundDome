export const StoreName = {
  BROWSE: 'browse',
  CONFIG: 'config',
  LIBRARY: 'library',
} as const;

export type StoreNameValue = (typeof StoreName)[keyof typeof StoreName];
