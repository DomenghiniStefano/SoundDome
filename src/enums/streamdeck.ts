export const StreamDeckActionType = {
  SOUND: 'sound',
  STOP_ALL: 'stopAll',
  PAGE_NEXT: 'pageNext',
  PAGE_PREV: 'pagePrev',
  FOLDER: 'folder',
  GO_BACK: 'goBack',
  MEDIA_PLAY_PAUSE: 'mediaPlayPause',
  MEDIA_NEXT: 'mediaNext',
  MEDIA_PREV: 'mediaPrev',
  MEDIA_VOLUME_UP: 'mediaVolumeUp',
  MEDIA_VOLUME_DOWN: 'mediaVolumeDown',
  MEDIA_MUTE: 'mediaMute',
  SHORTCUT: 'shortcut',
  SYSTEM_STAT: 'systemStat',
} as const;

export type StreamDeckActionTypeValue = (typeof StreamDeckActionType)[keyof typeof StreamDeckActionType];

export const SystemStatType = {
  CPU: 'cpu',
  RAM: 'ram',
  GPU: 'gpu',
  CPU_TEMP: 'cpuTemp',
  GPU_TEMP: 'gpuTemp',
  GPU_VRAM: 'gpuVram',
  DISK: 'disk',
  NET_UP: 'netUp',
  NET_DOWN: 'netDown',
  UPTIME: 'uptime',
} as const;

export type SystemStatTypeValue = (typeof SystemStatType)[keyof typeof SystemStatType];

// Media action sub-types for the MEDIA_* actions
export const MediaAction = {
  PLAY_PAUSE: 'playPause',
  NEXT_TRACK: 'nextTrack',
  PREV_TRACK: 'prevTrack',
  VOLUME_UP: 'volumeUp',
  VOLUME_DOWN: 'volumeDown',
  VOLUME_MUTE: 'volumeMute',
} as const;

export type MediaActionValue = (typeof MediaAction)[keyof typeof MediaAction];
