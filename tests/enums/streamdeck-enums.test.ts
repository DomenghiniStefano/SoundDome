import { describe, it, expect } from 'vitest';
import {
  StreamDeckActionType,
  SystemStatType,
  MediaAction,
  SYSTEM_STAT_LABELS,
  STATS_POLL_INTERVAL_MS,
  LCD_KEY_COUNT,
} from '../../src/enums/streamdeck';

describe('StreamDeckActionType', () => {
  it('has 15 action types', () => {
    expect(Object.keys(StreamDeckActionType)).toHaveLength(15);
  });

  it('has all expected action types', () => {
    expect(StreamDeckActionType.SOUND).toBe('sound');
    expect(StreamDeckActionType.STOP_ALL).toBe('stopAll');
    expect(StreamDeckActionType.PAGE_NEXT).toBe('pageNext');
    expect(StreamDeckActionType.PAGE_PREV).toBe('pagePrev');
    expect(StreamDeckActionType.FOLDER).toBe('folder');
    expect(StreamDeckActionType.GO_BACK).toBe('goBack');
    expect(StreamDeckActionType.SHORTCUT).toBe('shortcut');
    expect(StreamDeckActionType.LAUNCH_APP).toBe('launchApp');
    expect(StreamDeckActionType.SYSTEM_STAT).toBe('systemStat');
  });

  it('has all 6 media action types', () => {
    expect(StreamDeckActionType.MEDIA_PLAY_PAUSE).toBe('mediaPlayPause');
    expect(StreamDeckActionType.MEDIA_NEXT).toBe('mediaNext');
    expect(StreamDeckActionType.MEDIA_PREV).toBe('mediaPrev');
    expect(StreamDeckActionType.MEDIA_VOLUME_UP).toBe('mediaVolumeUp');
    expect(StreamDeckActionType.MEDIA_VOLUME_DOWN).toBe('mediaVolumeDown');
    expect(StreamDeckActionType.MEDIA_MUTE).toBe('mediaMute');
  });

  it('has no duplicate values', () => {
    const values = Object.values(StreamDeckActionType);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('SystemStatType', () => {
  it('has 10 stat types', () => {
    expect(Object.keys(SystemStatType)).toHaveLength(10);
  });

  it('has all expected stat types', () => {
    expect(SystemStatType.CPU).toBe('cpu');
    expect(SystemStatType.RAM).toBe('ram');
    expect(SystemStatType.GPU).toBe('gpu');
    expect(SystemStatType.CPU_TEMP).toBe('cpuTemp');
    expect(SystemStatType.GPU_TEMP).toBe('gpuTemp');
    expect(SystemStatType.GPU_VRAM).toBe('gpuVram');
    expect(SystemStatType.DISK).toBe('disk');
    expect(SystemStatType.NET_UP).toBe('netUp');
    expect(SystemStatType.NET_DOWN).toBe('netDown');
    expect(SystemStatType.UPTIME).toBe('uptime');
  });
});

describe('MediaAction', () => {
  it('has 6 media actions', () => {
    expect(Object.keys(MediaAction)).toHaveLength(6);
  });

  it('has all expected actions', () => {
    expect(MediaAction.PLAY_PAUSE).toBe('playPause');
    expect(MediaAction.NEXT_TRACK).toBe('nextTrack');
    expect(MediaAction.PREV_TRACK).toBe('prevTrack');
    expect(MediaAction.VOLUME_UP).toBe('volumeUp');
    expect(MediaAction.VOLUME_DOWN).toBe('volumeDown');
    expect(MediaAction.VOLUME_MUTE).toBe('volumeMute');
  });
});

describe('SYSTEM_STAT_LABELS', () => {
  it('has a label for every SystemStatType value', () => {
    for (const statValue of Object.values(SystemStatType)) {
      expect(SYSTEM_STAT_LABELS[statValue]).toBeDefined();
      expect(typeof SYSTEM_STAT_LABELS[statValue]).toBe('string');
      expect(SYSTEM_STAT_LABELS[statValue].length).toBeGreaterThan(0);
    }
  });

  it('has no extra labels beyond SystemStatType values', () => {
    const statValues = Object.values(SystemStatType) as string[];
    const labelKeys = Object.keys(SYSTEM_STAT_LABELS);
    for (const key of labelKeys) {
      expect(statValues).toContain(key);
    }
  });

  it('has expected display labels', () => {
    expect(SYSTEM_STAT_LABELS['cpu']).toBe('CPU');
    expect(SYSTEM_STAT_LABELS['ram']).toBe('RAM');
    expect(SYSTEM_STAT_LABELS['gpu']).toBe('GPU');
    expect(SYSTEM_STAT_LABELS['disk']).toBe('DISK');
    expect(SYSTEM_STAT_LABELS['uptime']).toBe('UP');
  });
});

describe('constants', () => {
  it('STATS_POLL_INTERVAL_MS is 2 seconds', () => {
    expect(STATS_POLL_INTERVAL_MS).toBe(2000);
  });

  it('LCD_KEY_COUNT is 15', () => {
    expect(LCD_KEY_COUNT).toBe(15);
  });
});
