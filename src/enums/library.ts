export const LibraryStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  ERROR: 'error',
} as const;

export type LibraryStatusValue = (typeof LibraryStatus)[keyof typeof LibraryStatus];
export const libraryStatuses = Object.values(LibraryStatus);

export const BuiltInGroup = {
  ALL: 'all',
  FAVORITES: 'favorites',
} as const;

export type BuiltInGroupValue = (typeof BuiltInGroup)[keyof typeof BuiltInGroup];

export const LibraryViewMode = {
  LIST: 'list',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

export type LibraryViewModeValue = (typeof LibraryViewMode)[keyof typeof LibraryViewMode];

export const SoundCardMode = {
  BROWSE: 'browse',
  LIBRARY: 'library',
} as const;

export type SoundCardModeValue = (typeof SoundCardMode)[keyof typeof SoundCardMode];
export const soundCardModes = Object.values(SoundCardMode);
