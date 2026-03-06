export const LibraryStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  ERROR: 'error',
} as const;

export type LibraryStatusValue = (typeof LibraryStatus)[keyof typeof LibraryStatus];
export const libraryStatuses = Object.values(LibraryStatus);

export const SoundCardMode = {
  BROWSE: 'browse',
  LIBRARY: 'library',
} as const;

export type SoundCardModeValue = (typeof SoundCardMode)[keyof typeof SoundCardMode];
export const soundCardModes = Object.values(SoundCardMode);
