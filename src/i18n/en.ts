export default {
  sidebar: {
    browse: 'Browse',
    library: 'My Library',
    settings: 'Settings'
  },
  browse: {
    title: 'Browse',
    subtitle: 'Search sounds from MyInstants',
    searchPlaceholder: 'Search sounds...',
    searching: 'Searching...',
    noResults: 'No sounds found',
    typeToSearch: 'Type something to search',
    loadMore: 'Load more'
  },
  library: {
    title: 'My Library',
    subtitle: 'Your saved sounds',
    emptyTitle: 'Your library is empty',
    searchPlaceholder: 'Search sounds...',
    noResults: 'No sounds found',
    delete: 'Delete',
    deleteTitle: 'Delete "{name}" from library',
    confirmDelete: 'Are you sure you want to delete "{name}" from library? The file will be permanently removed.',
    upload: 'Upload',
    editOrder: 'Edit order',
    viewList: 'List',
    viewSmall: 'Small icons',
    viewMedium: 'Medium icons',
    viewLarge: 'Large icons',
    hideNames: 'Hide names',
    showNames: 'Show names',
    trim: 'Trim',
    trimStart: 'Start',
    trimEnd: 'End',
    trimDuration: 'Duration',
    trimTest: 'Test',
    trimSave: 'Trim & Save',
    trimSaving: 'Trimming...'
  },
  settings: {
    title: 'Settings',
    subtitle: 'Audio routing and device configuration',
    vbcableMissing: {
      title: 'VB-CABLE not detected!',
      description: 'To use the Virtual Mic, install VB-CABLE:',
      restart: 'After installation, restart the app.'
    },
    output: {
      title: 'Output',
      tooltip: 'Configure where soundboard audio is sent'
    },
    virtualMic: {
      title: 'Virtual Mic (VB-CABLE)',
    },
    speakers: {
      title: 'Speakers',
    },
    input: {
      title: 'Input',
      tooltip: 'Your real microphone mixed with soundboard audio on VB-CABLE, so others hear your voice + sounds'
    },
    testAudio: {
      title: 'Test Audio',
      tooltip: 'Play a test sound to verify your output configuration'
    },
    backup: {
      title: 'Backup & Restore',
      tooltip: 'Export, import or restore your data',
      exportLibraryLabel: 'Export Library',
      exportLibraryHint: 'Save all sounds to a .sdlib file',
      exportSettingsLabel: 'Export Settings',
      exportSettingsHint: 'Save current settings to a .sdcfg file',
      exportAction: 'Export',
      importLabel: 'Import File',
      importHint: 'Accepts .sdlib (library) and .sdcfg (settings) files',
      importAction: 'Import'
    },
    dangerZone: {
      title: 'Danger Zone',
      tooltip: 'Destructive actions that cannot be undone',
      clearLabel: 'Clear Library',
      clearHint: 'Delete all sounds from the library',
      clearAction: 'Clear',
      resetLabel: 'Reset Settings',
      resetHint: 'Restore all settings to defaults (library is kept)',
      resetAction: 'Reset'
    },
    startup: {
      title: 'Startup',
      tooltip: 'Launch SoundDome automatically when your system starts',
      label: 'Start at login',
      hint: 'App starts minimized in the system tray'
    },
    import: {
      title: 'Import',
      confirmLibrary: 'Import {newSounds} new sounds ({totalSounds} total in file, {groups} groups)?',
      confirmSettings: 'Import {count} settings? Current settings will be overwritten.',
      noNewSounds: 'No new sounds to import (all {totalSounds} already in library).'
    },
    language: {
      title: 'Language',
      label: 'Language'
    }
  },
  common: {
    volume: 'Volume',
    device: 'Device',
    cancel: 'Cancel',
    confirm: 'Confirm',
    remove: 'Remove',
    listenLocal: 'Listen (local only)',
    saveToLibrary: 'Save to library'
  },
  toast: {
    exported: 'Exported {count} sounds',
    exportFailed: 'Export failed',
    deleted: 'Deleted {count} sounds',
    clearFailed: 'Clear failed',
    resetDone: 'Settings reset to defaults',
    uploaded: 'Uploaded {count} sound | Uploaded {count} sounds',
    uploadFailed: 'Upload failed',
    imported: 'Imported {added} new sounds ({total} total)',
    importFailed: 'Import failed',
    trimSuccess: 'Sound trimmed successfully',
    trimError: 'Trim failed',
    saved: 'Changes saved',
    settingsExported: 'Settings exported',
    settingsExportFailed: 'Settings export failed',
    settingsImported: 'Settings imported',
    settingsImportFailed: 'Settings import failed'
  },
  confirm: {
    clearLibrary: {
      title: 'Clear Library',
      message: 'All sounds will be permanently deleted. Continue?'
    },
    resetSettings: {
      title: 'Reset Settings',
      message: 'Restore all settings to defaults? The library will not be affected.'
    },
    unsavedChanges: {
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to leave?'
    },
    includeBackups: {
      title: 'Include Backups',
      message: 'Include original (pre-trim) backup files in the export?',
      include: 'Include',
      exclude: 'Exclude'
    },
    deleteBackup: {
      title: 'Delete Backup',
      message: 'Delete backup of "{name}" from {date}? This cannot be undone.'
    },
    deleteAllBackups: {
      title: 'Delete All Backups',
      message: 'Delete all backups of "{name}"? This cannot be undone.'
    }
  },
  hotkey: {
    title: 'Hotkey',
    pressKeys: 'Press a key combination...',
    noHotkey: 'Click to set a hotkey',
    conflict: 'Already used by "{name}"',
    remove: 'Remove',
    record: 'Record',
    save: 'Save'
  },
  settingsHotkeys: {
    title: 'Hotkeys',
    tooltip: 'Global keyboard shortcuts that work even when the app is in background',
    stopLabel: 'Stop audio',
    stopHint: 'Stop the currently playing sound',
    none: 'None'
  },
  editSound: {
    edit: 'Edit',
    subtitle: 'Edit sound settings',
    notFound: 'Sound not found',
    backToLibrary: 'Back to Library',
    test: 'Test',
    stopTest: 'Stop',
    play: 'Play',
    save: 'Save',
    saving: 'Saving...',
    backups: 'Backups',
    noBackups: 'No backups yet',
    useBackup: 'Restore',
    restoring: 'Restoring...',
    deleteAllBackups: 'Delete all backups',
    backupOnTrim: 'Backup on trim',
    saveAndExit: 'Save & Exit',
    preview: 'Preview',
    image: 'Icon',
    addImage: 'Add image',
    changeImage: 'Change image',
    uploadImage: 'Upload photo',
    removeImage: 'Remove',
    openEmojiPicker: 'Open emoji picker',
    icons: 'Icons',
    textPlaceholder: 'Label...'
  },
  audio: {
    enableOneOutput: 'Enable at least one output',
    playingTo: 'Playing to: {targets}',
    playbackFailed: 'Playback failed',
    speakers: 'Speakers',
    virtualMic: 'Virtual Mic',
    testSound: 'Test Sound'
  },
  groups: {
    all: 'All Sounds',
    favorites: 'Favorites',
    newGroup: 'New Group',
    rename: 'Rename',
    delete: 'Delete Group',
    confirmDelete: 'Delete group "{name}"? Sounds will not be removed.',
    addTo: 'Add to group',
    removeFrom: 'Remove from group',
    emptyGroup: 'No sounds in this group',
    emptyFavorites: 'No favorites yet',
    favorite: 'Favorite',
    unfavorite: 'Unfavorite',
    title: 'Member of groups',
    noGroups: 'No groups created yet. Create groups from the library page.'
  },
  widget: {
    emptyLibrary: 'No sounds in library',
    preview: 'Preview locally',
    stopAll: 'Stop all',
    openMain: 'Open main app',
    close: 'Close widget'
  }
};
