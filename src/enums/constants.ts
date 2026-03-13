// Volume defaults
export const VOLUME_SOUNDBOARD_DEFAULT = 80;
export const VOLUME_MONITOR_DEFAULT = 50;
export const VOLUME_MIC_DEFAULT = 80;
export const VOLUME_ITEM_DEFAULT = 100;
export const VOLUME_ITEM_MAX = 200;
export const VOLUME_DIVISOR = 100;

// Audio
export const AUDIO_SAMPLE_RATE = 48000;
export const GAIN_RAMP_DURATION = 0.05;
export const AUDIO_BITRATE = '192k';

// Timing
export const DEBOUNCE_DELAY_DEFAULT = 400;
export const TOAST_DURATION_DEFAULT = 3000;
export const TOAST_RESET_DELAY = 10;
export const SPLASH_MIN_DURATION = 1500;
export const SPLASH_TRANSITION_DELAY = 500;

// Device detection
export const VBCABLE_LABEL_KEYWORD = 'cable input';
export const VBCABLE_FILTER_KEYWORD = 'cable';

// Virtual Audio Driver detection (device names: "Virtual Audio Driver by MTT", "Virtual Mic Driver by MTT")
export const VIRTUAL_AUDIO_DRIVER_SPEAKER_KEYWORD = 'virtual audio driver by mtt';
export const VIRTUAL_AUDIO_DRIVER_MIC_KEYWORD = 'virtual mic driver by mtt';

// Linux null sink (PulseAudio/PipeWire module-null-sink)
export const LINUX_NULL_SINK_NAME = 'SoundDome';
export const LINUX_NULL_SINK_DESCRIPTION = 'SoundDome Virtual Mic';
export const LINUX_NULL_SINK_OUTPUT_KEYWORD = 'sounddome virtual mic';
export const LINUX_NULL_SINK_MONITOR_KEYWORD = 'monitor of sounddome';

// All virtual audio device keywords (for output device detection — matches speaker endpoints)
export const VIRTUAL_MIC_KEYWORDS = [
  VBCABLE_LABEL_KEYWORD,
  VIRTUAL_AUDIO_DRIVER_SPEAKER_KEYWORD,
  LINUX_NULL_SINK_OUTPUT_KEYWORD,
] as const;

// All virtual audio device filter keywords (for input device filtering — excludes virtual mic from real mic list)
export const VIRTUAL_DEVICE_FILTER_KEYWORDS = [
  VBCABLE_FILTER_KEYWORD,
  VIRTUAL_AUDIO_DRIVER_MIC_KEYWORD,
  LINUX_NULL_SINK_MONITOR_KEYWORD,
] as const;

// Drag interaction
export const DRAG_THRESHOLD = 3;

// CLI arguments
export const CLI_ARG_HIDDEN = '--hidden';

// Window dimensions
export const MAIN_WINDOW_WIDTH = 1024;
export const MAIN_WINDOW_HEIGHT = 700;
export const MAIN_WINDOW_MIN_WIDTH = 800;
export const MAIN_WINDOW_MIN_HEIGHT = 500;
export const WIDGET_WINDOW_WIDTH = 320;
export const WIDGET_WINDOW_HEIGHT = 500;
export const WIDGET_WINDOW_MIN_WIDTH = 240;
export const WIDGET_WINDOW_MIN_HEIGHT = 300;
export const WIDGET_OFFSET_X = 340;
export const WIDGET_OFFSET_Y = 40;
export const SIDEBAR_AUTO_COLLAPSE_WIDTH = 900;

// Browse pagination
export const BROWSE_MIN_CARD_WIDTH = 220;
export const BROWSE_ESTIMATED_CARD_HEIGHT = 110;
export const BROWSE_MIN_PAGE_SIZE = 10;

// File system
export const BACKUP_SUFFIX = '.bak.';
export const AUDIO_EXTENSION = '.mp3';
export const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'webm', 'aac', 'wma'];
export const LIBRARY_DIR_NAME = 'library';
export const LIBRARY_INDEX_FILENAME = 'index.json';
export const CONFIG_FILENAME = 'config.json';
export const EXPORT_DEFAULT_FILENAME = 'sounddome-library.sdlib';
export const EXPORT_FILE_EXTENSION = 'sdlib';
export const SETTINGS_EXPORT_DEFAULT_FILENAME = 'sounddome-settings.sdcfg';
export const SETTINGS_EXPORT_FILE_EXTENSION = 'sdcfg';
export const THEME_EXPORT_FILE_EXTENSION = 'sdtheme';
export const THEME_FORMAT_ID = 'sounddome-theme';
export const THEME_FORMAT_VERSION = 1;
export const NOTIFICATION_SOUND = 'notification.mp3';
export const IMAGE_EXTENSION = '.png';
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
export const STREAMDECK_EXPORT_DEFAULT_FILENAME = 'sounddome-streamdeck.sddk';
export const STREAMDECK_EXPORT_FILE_EXTENSION = 'sddk';

// Import/export types
export const ImportType = {
  LIBRARY: 'library',
  SETTINGS: 'settings',
  THEME: 'theme',
  STREAMDECK: 'streamdeck',
} as const;
export type ImportTypeValue = (typeof ImportType)[keyof typeof ImportType];

// RNNoise noise suppression
export const RNNOISE_BUFFER_SIZE = 4096;
export const RNNOISE_PCM_SCALE = 32768;

// Compressor presets for DynamicsCompressorNode
export const COMPRESSOR_PRESETS = {
  light: {
    threshold: -8,
    knee: 10,
    ratio: 3,
    attack: 0.005,
    release: 0.2,
  },
  medium: {
    threshold: -15,
    knee: 6,
    ratio: 5,
    attack: 0.003,
    release: 0.15,
  },
  heavy: {
    threshold: -24,
    knee: 3,
    ratio: 8,
    attack: 0.001,
    release: 0.08,
  },
} as const;

// Theme fields
export const THEME_FIELDS = [
  'name', 'base', 'accent', 'bgPrimary', 'bgCard', 'textPrimary',
  'bgSecondary', 'textSecondary', 'borderDefault', 'colorError', 'colorWarning', 'colorInfo',
] as const;

export const THEME_REQUIRED_COLOR_FIELDS = ['base', 'accent', 'bgPrimary', 'bgCard', 'textPrimary'] as const;
