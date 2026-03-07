export default {
  sidebar: {
    browse: 'Esplora',
    library: 'La mia Libreria',
    settings: 'Impostazioni'
  },
  browse: {
    title: 'Esplora',
    subtitle: 'Cerca suoni da MyInstants',
    searchPlaceholder: 'Cerca suoni...',
    searching: 'Ricerca in corso...',
    noResults: 'Nessun suono trovato',
    typeToSearch: 'Scrivi qualcosa per cercare',
    loadMore: 'Carica altri'
  },
  library: {
    title: 'La mia Libreria',
    subtitle: 'I tuoi suoni salvati',
    emptyTitle: 'La libreria è vuota',
    delete: 'Elimina',
    deleteTitle: 'Elimina "{name}" dalla libreria',
    confirmDelete: 'Sei sicuro di voler eliminare "{name}" dalla libreria? Il file verrà cancellato.',
    editOrder: 'Modifica ordine',
    trim: 'Taglia',
    trimStart: 'Inizio',
    trimEnd: 'Fine',
    trimDuration: 'Durata',
    trimTest: 'Test',
    trimSave: 'Taglia e Salva',
    trimSaving: 'Taglio in corso...'
  },
  settings: {
    title: 'Impostazioni',
    subtitle: 'Routing audio e configurazione dispositivi',
    vbcableMissing: {
      title: 'VB-CABLE non rilevato!',
      description: 'Per usare il Virtual Mic, installa VB-CABLE:',
      restart: "Dopo l'installazione, riavvia l'app."
    },
    virtualMic: {
      title: 'Virtual Mic (VB-CABLE)',
      tooltip: 'Audio inviato a VB-CABLE, che Discord/Zoom utilizza come ingresso microfono'
    },
    speakers: {
      title: 'Altoparlanti',
      tooltip: 'Audio che ascolti localmente tramite altoparlanti o cuffie'
    },
    microphone: {
      title: 'Microfono',
      tooltip: 'Il tuo microfono reale mixato con la soundboard su VB-CABLE, così gli altri sentono la tua voce + i suoni'
    },
    testAudio: {
      title: 'Test Audio',
      tooltip: 'Riproduci un suono di test per verificare la configurazione di uscita'
    },
    library: {
      title: 'Libreria',
      tooltip: 'Esporta, importa o cancella la tua collezione di suoni salvati',
      exportLabel: 'Esporta Libreria',
      exportHint: 'Salva tutti i suoni in un file .sounddome',
      exportAction: 'Esporta',
      importLabel: 'Importa Libreria',
      importHint: 'Carica suoni da un file .sounddome',
      importAction: 'Importa',
      clearLabel: 'Svuota Libreria',
      clearHint: 'Elimina tutti i suoni dalla libreria',
      clearAction: 'Svuota'
    },
    startup: {
      title: 'Avvio',
      tooltip: "Avvia SoundDome automaticamente all'avvio di Windows",
      label: 'Avvia con Windows',
      hint: "L'app si avvia minimizzata nella system tray"
    },
    reset: {
      title: 'Reset',
      label: 'Ripristina Impostazioni',
      hint: 'Ripristina tutte le impostazioni ai valori predefiniti (la libreria non viene toccata)',
      action: 'Ripristina'
    },
    language: {
      title: 'Lingua',
      label: 'Lingua'
    }
  },
  common: {
    volume: 'Volume',
    device: 'Dispositivo',
    cancel: 'Annulla',
    confirm: 'Conferma',
    remove: 'Rimuovi',
    listenLocal: 'Ascolta (solo locale)',
    saveToLibrary: 'Salva in libreria'
  },
  toast: {
    exported: '{count} suoni esportati',
    exportFailed: 'Esportazione fallita',
    deleted: '{count} suoni eliminati',
    clearFailed: 'Svuotamento fallito',
    resetDone: 'Impostazioni ripristinate ai valori predefiniti',
    imported: '{added} nuovi suoni importati ({total} totali)',
    importFailed: 'Importazione fallita',
    trimSuccess: 'Suono tagliato con successo',
    trimError: 'Taglio fallito',
    saved: 'Modifiche salvate'
  },
  confirm: {
    clearLibrary: {
      title: 'Svuota Libreria',
      message: 'Tutti i suoni verranno eliminati permanentemente. Continuare?'
    },
    resetSettings: {
      title: 'Ripristina Impostazioni',
      message: 'Ripristinare tutte le impostazioni ai valori predefiniti? La libreria non verrà toccata.'
    },
    unsavedChanges: {
      title: 'Modifiche non salvate',
      message: 'Ci sono modifiche non salvate. Vuoi uscire senza salvare?'
    },
    includeBackups: {
      title: 'Includi Backup',
      message: 'Includere i file di backup originali (pre-taglio) nell\'esportazione?'
    },
    deleteBackup: {
      title: 'Elimina Backup',
      message: 'Eliminare il backup di "{name}" del {date}? L\'operazione non può essere annullata.'
    },
    deleteAllBackups: {
      title: 'Elimina Tutti i Backup',
      message: 'Eliminare tutti i backup di "{name}"? L\'operazione non può essere annullata.'
    }
  },
  hotkey: {
    title: 'Hotkey',
    pressKeys: 'Premi una combinazione di tasti...',
    noHotkey: 'Clicca per impostare una hotkey',
    conflict: 'Già usata da "{name}"',
    remove: 'Rimuovi',
    record: 'Registra',
    save: 'Salva'
  },
  settingsHotkeys: {
    title: 'Hotkeys',
    tooltip: 'Scorciatoie da tastiera globali che funzionano anche con app in background',
    stopLabel: 'Stop audio',
    stopHint: 'Ferma il suono attualmente in riproduzione',
    none: 'Nessuna'
  },
  editSound: {
    edit: 'Modifica',
    subtitle: 'Modifica impostazioni suono',
    notFound: 'Suono non trovato',
    backToLibrary: 'Torna alla Libreria',
    test: 'Test',
    stopTest: 'Stop',
    play: 'Riproduci',
    save: 'Salva',
    saving: 'Salvataggio...',
    backups: 'Backup',
    noBackups: 'Nessun backup',
    useBackup: 'Ripristina',
    restoring: 'Ripristino...',
    deleteAllBackups: 'Elimina tutti i backup',
    backupOnTrim: 'Backup al taglio',
    saveAndExit: 'Salva ed Esci',
    image: 'Immagine',
    addImage: 'Aggiungi immagine',
    changeImage: 'Cambia immagine',
    uploadImage: 'Carica foto',
    removeImage: 'Rimuovi',
    openEmojiPicker: 'Apri selettore emoji',
    textPlaceholder: 'Etichetta...'
  },
  audio: {
    enableOneOutput: "Attiva almeno un'uscita",
    playingTo: 'Riproduzione su: {targets}',
    playbackFailed: 'Riproduzione fallita',
    speakers: 'Altoparlanti',
    virtualMic: 'Virtual Mic'
  },
  widget: {
    emptyLibrary: 'Nessun suono nella libreria',
    preview: 'Anteprima locale',
    stopAll: 'Ferma tutto',
    openMain: 'Apri app principale',
    close: 'Chiudi widget'
  }
};
