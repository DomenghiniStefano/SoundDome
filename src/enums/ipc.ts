export const IpcChannel = {
  // Config
  LOAD_CONFIG: 'load-config',
  SAVE_CONFIG: 'save-config',
  CONFIG_CHANGED: 'config-changed',
  GET_SOUND_PATH: 'get-sound-path',
  OPEN_EXTERNAL: 'open-external',

  // Library
  LIBRARY_SAVE: 'library-save',
  LIBRARY_RESET: 'library-reset',
  LIBRARY_UPLOAD: 'library-upload',
  LIBRARY_LIST: 'library-list',
  LIBRARY_UPDATE: 'library-update',
  LIBRARY_GET_PATH: 'library-get-path',
  LIBRARY_DELETE: 'library-delete',
  LIBRARY_REORDER: 'library-reorder',
  LIBRARY_TRIM: 'library-trim',
  LIBRARY_HAS_BACKUPS: 'library-has-backups',
  LIBRARY_LIST_BACKUPS: 'library-list-backups',
  LIBRARY_RESTORE_BACKUP: 'library-restore-backup',
  LIBRARY_DELETE_BACKUP: 'library-delete-backup',
  LIBRARY_DELETE_ALL_BACKUPS: 'library-delete-all-backups',
  LIBRARY_EXPORT: 'library-export',
  LIBRARY_IMPORT: 'library-import',
  LIBRARY_SET_IMAGE: 'library-set-image',
  LIBRARY_REMOVE_IMAGE: 'library-remove-image',
  LIBRARY_CHANGED: 'library-changed',
  GROUP_CREATE: 'group-create',
  GROUP_UPDATE: 'group-update',
  GROUP_DELETE: 'group-delete',
  GROUP_REORDER: 'group-reorder',

  CONFIG_EXPORT: 'config-export',
  CONFIG_IMPORT: 'config-import',
  THEME_EXPORT: 'theme-export',
  THEME_IMPORT: 'theme-import',
  IMPORT_INSPECT: 'import-inspect',
  IMPORT_EXECUTE: 'import-execute',

  // Auto-launch
  GET_AUTO_LAUNCH: 'get-auto-launch',
  SET_AUTO_LAUNCH: 'set-auto-launch',

  // Hotkeys
  HOTKEY_PLAY: 'hotkey-play',
  HOTKEY_STOP: 'hotkey-stop',
  HOTKEY_SUSPEND: 'hotkey-suspend',

  // Audio
  GET_VBCABLE_SAMPLE_RATE: 'get-vbcable-sample-rate',

  // System UI
  IS_HIDDEN_START: 'is-hidden-start',

  // Window
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_MAXIMIZE: 'window-maximize',
  WINDOW_CLOSE: 'window-close',
  WINDOW_IS_MAXIMIZED: 'window-is-maximized',
  WINDOW_MAXIMIZE_CHANGE: 'window-maximize-change',

  // Playback sync
  PLAYBACK_STARTED: 'playback-started',
  PLAYBACK_STOPPED: 'playback-stopped',

  // Updater
  UPDATE_CHECK: 'update-check',
  UPDATE_AVAILABLE: 'update-available',
  UPDATE_NOT_AVAILABLE: 'update-not-available',
  UPDATE_DOWNLOADED: 'update-downloaded',
  UPDATE_ERROR: 'update-error',
  UPDATE_PROGRESS: 'update-progress',
  UPDATE_INSTALL: 'update-install',

  // Widget
  WIDGET_TOGGLE: 'widget-toggle',
  WIDGET_CLOSE: 'widget-close',
  WIDGET_IS_OPEN: 'widget-is-open',
  WIDGET_STATE_CHANGE: 'widget-state-change',

  // File picker
  PICK_EXECUTABLE: 'pick-executable',
  PICK_BUTTON_IMAGE: 'pick-button-image',

  // Stream Deck
  STREAMDECK_STATUS: 'streamdeck-status',
  STREAMDECK_BUTTON_PRESS: 'streamdeck-button-press',
  STREAMDECK_CONNECT: 'streamdeck-connect',
  STREAMDECK_DISCONNECT: 'streamdeck-disconnect',
  STREAMDECK_LOAD_MAPPINGS: 'streamdeck-load-mappings',
  STREAMDECK_SAVE_MAPPINGS: 'streamdeck-save-mappings',
  STREAMDECK_SET_BRIGHTNESS: 'streamdeck-set-brightness',
  STREAMDECK_REFRESH_IMAGES: 'streamdeck-refresh-images',
  STREAMDECK_PAGE_CHANGE: 'streamdeck-page-change',
  STREAMDECK_SYSTEM_STATS: 'streamdeck-system-stats',
  STREAMDECK_EXPORT_MAPPINGS: 'streamdeck-export-mappings',
  STREAMDECK_IMPORT_MAPPINGS: 'streamdeck-import-mappings',
  STREAMDECK_RESET_MAPPINGS: 'streamdeck-reset-mappings',
} as const;

export type IpcChannelValue = (typeof IpcChannel)[keyof typeof IpcChannel];
