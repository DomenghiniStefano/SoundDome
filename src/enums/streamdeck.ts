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
  LAUNCH_APP: 'launchApp',
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

export const SYSTEM_STAT_LABELS: Record<string, string> = {
  cpu: 'CPU',
  ram: 'RAM',
  gpu: 'GPU',
  cpuTemp: 'CPU°',
  gpuTemp: 'GPU°',
  gpuVram: 'VRAM',
  disk: 'DISK',
  netUp: 'NET↑',
  netDown: 'NET↓',
  uptime: 'UP',
} as const;

export const STATS_POLL_INTERVAL_MS = 2000;

export const LCD_KEY_COUNT = 15;

export const MEDIA_ACTION_MAP: Record<string, string> = {
  [StreamDeckActionType.MEDIA_PLAY_PAUSE]: 'playPause',
  [StreamDeckActionType.MEDIA_NEXT]: 'nextTrack',
  [StreamDeckActionType.MEDIA_PREV]: 'prevTrack',
  [StreamDeckActionType.MEDIA_VOLUME_UP]: 'volumeUp',
  [StreamDeckActionType.MEDIA_VOLUME_DOWN]: 'volumeDown',
  [StreamDeckActionType.MEDIA_MUTE]: 'volumeMute',
};

export const STREAMDECK_AUTOSAVE_DELAY = 500;
