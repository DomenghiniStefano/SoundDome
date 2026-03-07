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
    editOrder: 'Edit order',
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
    virtualMic: {
      title: 'Virtual Mic (VB-CABLE)',
      tooltip: 'Audio sent to VB-CABLE, which Discord/Zoom picks up as your microphone input'
    },
    speakers: {
      title: 'Speakers',
      tooltip: 'Audio you hear locally through your speakers or headphones'
    },
    microphone: {
      title: 'Microphone',
      tooltip: 'Your real microphone mixed with soundboard audio on VB-CABLE, so others hear your voice + sounds'
    },
    testAudio: {
      title: 'Test Audio',
      tooltip: 'Play a test sound to verify your output configuration'
    },
    library: {
      title: 'Library',
      tooltip: 'Export, import or clear your saved sound collection',
      exportLabel: 'Export Library',
      exportHint: 'Save all sounds to a .sdlib file',
      exportAction: 'Export',
      importLabel: 'Import Library',
      importHint: 'Load sounds from a .sdlib file',
      importAction: 'Import',
      clearLabel: 'Clear Library',
      clearHint: 'Delete all sounds from the library',
      clearAction: 'Clear'
    },
    startup: {
      title: 'Startup',
      tooltip: 'Launch SoundDome automatically when your system starts',
      label: 'Start at login',
      hint: 'App starts minimized in the system tray'
    },
    settingsExport: {
      title: 'Settings Backup',
      exportLabel: 'Export Settings',
      exportHint: 'Save current settings to a .sdcfg file',
      exportAction: 'Export'
    },
    import: {
      title: 'Import',
      tooltip: 'Import a library (.sdlib) or settings (.sdcfg) file',
      label: 'Import File',
      hint: 'Accepts .sdlib (library) and .sdcfg (settings) files',
      action: 'Import',
      confirmLibrary: 'Import {newSounds} new sounds ({totalSounds} total in file, {sections} sections)?',
      confirmSettings: 'Import {count} settings? Current settings will be overwritten.',
      noNewSounds: 'No new sounds to import (all {totalSounds} already in library).'
    },
    reset: {
      title: 'Reset',
      label: 'Reset Settings',
      hint: 'Restore all settings to defaults (library is kept)',
      action: 'Reset'
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
    virtualMic: 'Virtual Mic'
  },
  sections: {
    all: 'All Sounds',
    favorites: 'Favorites',
    newSection: 'New Section',
    rename: 'Rename',
    delete: 'Delete Section',
    confirmDelete: 'Delete section "{name}"? Sounds will not be removed.',
    addTo: 'Add to section',
    removeFrom: 'Remove from section',
    emptySection: 'No sounds in this section',
    emptyFavorites: 'No favorites yet',
    favorite: 'Favorite',
    unfavorite: 'Unfavorite'
  },
  widget: {
    emptyLibrary: 'No sounds in library',
    preview: 'Preview locally',
    stopAll: 'Stop all',
    openMain: 'Open main app',
    close: 'Close widget'
  }
};
