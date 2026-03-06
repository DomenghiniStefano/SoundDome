export const PlaybackType = {
  ROUTED: 'routed',
  PREVIEW: 'preview',
} as const;

export type PlaybackTypeValue = (typeof PlaybackType)[keyof typeof PlaybackType];
export const playbackTypes = Object.values(PlaybackType);
