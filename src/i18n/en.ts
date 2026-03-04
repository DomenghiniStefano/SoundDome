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
    delete: 'Delete',
    deleteTitle: 'Delete "{name}" from library',
    confirmDelete: 'Are you sure you want to delete "{name}" from library? The file will be permanently removed.'
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
      exportHint: 'Save all sounds to a .sounddome file',
      exportAction: 'Export',
      importLabel: 'Import Library',
      importHint: 'Load sounds from a .sounddome file',
      importAction: 'Import',
      clearLabel: 'Clear Library',
      clearHint: 'Delete all sounds from the library',
      clearAction: 'Clear'
    },
    startup: {
      title: 'Startup',
      tooltip: 'Launch SoundDome automatically when Windows starts',
      label: 'Start with Windows',
      hint: 'App starts minimized in the system tray'
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
    importFailed: 'Import failed'
  },
  confirm: {
    clearLibrary: {
      title: 'Clear Library',
      message: 'All sounds will be permanently deleted. Continue?'
    },
    resetSettings: {
      title: 'Reset Settings',
      message: 'Restore all settings to defaults? The library will not be affected.'
    }
  },
  audio: {
    enableOneOutput: 'Enable at least one output',
    playingTo: 'Playing to: {targets}',
    playbackFailed: 'Playback failed',
    speakers: 'Speakers',
    virtualMic: 'Virtual Mic'
  }
};
