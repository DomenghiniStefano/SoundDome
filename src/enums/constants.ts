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
export const VBCABLE_DOWNLOAD_URL = 'https://vb-audio.com/Cable/';

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
export const NOTIFICATION_SOUND = 'notification.mp3';
export const IMAGE_EXTENSION = '.png';
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
