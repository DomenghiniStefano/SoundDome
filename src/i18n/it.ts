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
    loadMore: 'Carica altri',
    play: 'Riproduci',
    test: 'Test',
    resetOriginal: 'Ripristina originale'
  },
  library: {
    title: 'La mia Libreria',
    subtitle: 'I tuoi suoni salvati',
    emptyTitle: 'La libreria è vuota',
    searchPlaceholder: 'Cerca suoni...',
    noResults: 'Nessun suono trovato',
    delete: 'Elimina',
    deleteTitle: 'Elimina "{name}" dalla libreria',
    confirmDelete: 'Sei sicuro di voler eliminare "{name}" dalla libreria? Il file verrà cancellato.',
    upload: 'Carica',
    editOrder: 'Modifica ordine',
    viewList: 'Lista',
    viewSmall: 'Icone piccole',
    viewMedium: 'Icone medie',
    viewLarge: 'Icone grandi',
    hideNames: 'Nascondi nomi',
    showNames: 'Mostra nomi',
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
    output: {
      title: 'Output',
      tooltip: 'Configura dove viene inviato l\'audio della soundboard'
    },
    virtualMic: {
      title: 'Virtual Mic (VB-CABLE)',
    },
    speakers: {
      title: 'Altoparlanti',
    },
    input: {
      title: 'Input',
      tooltip: 'Il tuo microfono reale mixato con la soundboard su VB-CABLE, così gli altri sentono la tua voce + i suoni'
    },
    testAudio: {
      title: 'Test Audio',
      tooltip: 'Riproduci un suono di test per verificare la configurazione di uscita'
    },
    backup: {
      title: 'Backup & Ripristino',
      tooltip: 'Esporta, importa o ripristina i tuoi dati',
      exportLibraryLabel: 'Esporta Libreria',
      exportLibraryHint: 'Salva tutti i suoni in un file .sdlib',
      exportSettingsLabel: 'Esporta Impostazioni',
      exportSettingsHint: 'Salva le impostazioni correnti in un file .sdcfg',
      exportAction: 'Esporta',
      importLabel: 'Importa File',
      importHint: 'Accetta file .sdlib (libreria) e .sdcfg (impostazioni)',
      importAction: 'Importa'
    },
    dangerZone: {
      title: 'Zona Pericolosa',
      tooltip: 'Azioni distruttive che non possono essere annullate',
      clearLabel: 'Svuota Libreria',
      clearHint: 'Elimina tutti i suoni dalla libreria',
      clearAction: 'Svuota',
      resetLabel: 'Ripristina Impostazioni',
      resetHint: 'Ripristina tutte le impostazioni ai valori predefiniti (la libreria non viene toccata)',
      resetAction: 'Ripristina'
    },
    startup: {
      title: 'Avvio',
      tooltip: "Avvia SoundDome automaticamente all'avvio del sistema",
      label: 'Avvia al login',
      hint: "L'app si avvia minimizzata nella system tray"
    },
    import: {
      title: 'Importa',
      confirmLibrary: 'Importare {newSounds} nuovi suoni ({totalSounds} totali nel file, {groups} gruppi)?',
      confirmSettings: 'Importare {count} impostazioni? Le impostazioni attuali verranno sovrascritte.',
      noNewSounds: 'Nessun nuovo suono da importare (tutti i {totalSounds} sono già in libreria).'
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
    uploaded: '{count} suono caricato | {count} suoni caricati',
    uploadFailed: 'Caricamento fallito',
    imported: '{added} nuovi suoni importati ({total} totali)',
    importFailed: 'Importazione fallita',
    trimSuccess: 'Suono tagliato con successo',
    trimError: 'Taglio fallito',
    saved: 'Modifiche salvate',
    settingsExported: 'Impostazioni esportate',
    settingsExportFailed: 'Esportazione impostazioni fallita',
    settingsImported: 'Impostazioni importate',
    settingsImportFailed: 'Importazione impostazioni fallita',
    redownloaded: 'Riscaricato da MyInstants',
    redownloadFailed: 'Riscaricamento fallito'
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
      message: 'Includere i file di backup originali (pre-taglio) nell\'esportazione?',
      include: 'Includi',
      exclude: 'Escludi'
    },
    deleteBackup: {
      title: 'Elimina Backup',
      message: 'Eliminare il backup di "{name}" del {date}? L\'operazione non può essere annullata.'
    },
    redownload: {
      title: 'Riscarica da MyInstants',
      message: 'Il file audio attuale verrà sostituito con l\'originale da MyInstants. Eventuali tagli o modifiche andranno persi.'
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
    redownload: 'Riscarica',
    saveAndExit: 'Salva ed Esci',
    preview: 'Anteprima',
    image: 'Icona',
    addImage: 'Aggiungi immagine',
    changeImage: 'Cambia immagine',
    uploadImage: 'Carica foto',
    removeImage: 'Rimuovi',
    openEmojiPicker: 'Apri selettore emoji',
    icons: 'Icone',
    textPlaceholder: 'Etichetta...'
  },
  audio: {
    enableOneOutput: "Attiva almeno un'uscita",
    playingTo: 'Riproduzione su: {targets}',
    playbackFailed: 'Riproduzione fallita',
    speakers: 'Altoparlanti',
    virtualMic: 'Virtual Mic',
    testSound: 'Suono di test'
  },
  groups: {
    all: 'Tutti i suoni',
    favorites: 'Preferiti',
    newGroup: 'Nuovo gruppo',
    rename: 'Rinomina',
    delete: 'Elimina gruppo',
    confirmDelete: 'Eliminare il gruppo "{name}"? I suoni non verranno rimossi.',
    addTo: 'Aggiungi a gruppo',
    removeFrom: 'Rimuovi da gruppo',
    emptyGroup: 'Nessun suono in questo gruppo',
    emptyFavorites: 'Nessun preferito',
    favorite: 'Preferito',
    unfavorite: 'Rimuovi preferito',
    title: 'Presente nei gruppi',
    noGroups: 'Nessun gruppo creato. Crea gruppi dalla pagina libreria.'
  },
  splash: {
    checking: 'Controllo aggiornamenti...',
    downloading: 'Download aggiornamento ({percent}%)...',
    installing: 'Installazione aggiornamento...',
    upToDate: 'Pronto!',
    error: 'Impossibile controllare gli aggiornamenti',
    devSkip: 'Controllo aggiornamenti saltato (modalità dev)'
  },
  update: {
    title: 'Aggiornamenti',
    tooltip: 'Controlla nuove versioni su GitHub',
    checkLabel: 'Controlla aggiornamenti',
    checkHint: 'Versione attuale: {version}',
    checkAction: 'Controlla',
    checking: 'Controllo...',
    available: 'Versione {version} disponibile',
    downloading: 'Download... {percent}%',
    ready: 'Versione {version} pronta per l\'installazione',
    install: 'Riavvia e Aggiorna',
    upToDate: 'Sei aggiornato',
    error: 'Controllo aggiornamenti fallito'
  },
  widget: {
    emptyLibrary: 'Nessun suono nella libreria',
    preview: 'Anteprima locale',
    stopAll: 'Ferma tutto',
    openMain: 'Apri app principale',
    close: 'Chiudi widget'
  },
  streamDeck: {
    title: 'Stream Deck',
    tooltip: 'Configurazione stream deck Ajazz AKP153E',
    connected: 'Connesso',
    disconnected: 'Disconnesso',
    brightness: 'Luminosità',
    lcdKeys: 'Tasti LCD',
    functionKeys: 'Tasti Funzione',
    page: 'Pagina {page}',
    assignButton: 'Assegna Pulsante',
    actionType: 'Tipo di azione',
    defaultAction: 'Predefinito (auto)',
    sound: 'Suono',
    stopAll: 'Ferma Tutto',
    pageNext: 'Pagina Succ.',
    pagePrev: 'Pagina Prec.',
    searchSound: 'Cerca suoni...',
    noSounds: 'Nessun suono trovato',
    unknownSound: 'Suono sconosciuto',
    mediaPlayPause: 'Play/Pausa',
    mediaNext: 'Traccia Succ.',
    mediaPrev: 'Traccia Prec.',
    mediaVolumeUp: 'Volume Su',
    mediaVolumeDown: 'Volume Giu',
    mediaMute: 'Muto',
    shortcut: 'Scorciatoia Tastiera',
    shortcutPlaceholder: 'es. Ctrl+Shift+M',
    systemStat: 'Monitor Sistema',
    statCpu: 'Utilizzo CPU',
    statRam: 'Utilizzo RAM',
    statGpu: 'Utilizzo GPU',
    statCpuTemp: 'Temperatura CPU',
    statGpuTemp: 'Temperatura GPU',
    statGpuVram: 'VRAM GPU',
    statDisk: 'Utilizzo Disco',
    statNetUp: 'Upload Rete',
    statNetDown: 'Download Rete',
    statUptime: 'Tempo Attivo',
    statType: 'Tipo statistica',
    shortcutLabel: 'Tasti scorciatoia',
    customLabel: 'Etichetta (opzionale)',
    launchApp: 'Apri App',
    appPath: 'Percorso applicazione',
    appPathPlaceholder: "Seleziona un'applicazione...",
    browse: 'Sfoglia',
    buttonImage: 'Immagine pulsante (opzionale)',
    noImage: 'Predefinita',
    folder: 'Cartella',
    goBack: 'Indietro',
    targetFolder: 'Cartella destinazione',
    folderIcon: 'Icona cartella',
    pages: 'Pagine',
    folders: 'Cartelle',
    addPage: 'Aggiungi Pagina',
    deletePage: 'Elimina Pagina',
    renamePage: 'Rinomina Pagina',
    newPageName: 'Nome nuova pagina',
    pageNamePlaceholder: 'Nome pagina',
    confirmDeletePage: 'Eliminare la pagina "{name}"?',
    addFolder: 'Aggiungi Cartella',
    deleteFolder: 'Elimina Cartella',
    renameFolder: 'Rinomina Cartella',
    newFolderName: 'Nome nuova cartella',
    confirmDeleteFolder: 'Eliminare la cartella "{name}" e tutte le sue pagine?',
    noFolders: 'Nessuna cartella',
    folderDragHint: 'Trascina i pulsanti dalla griglia principale o verso di essa',
    closeAfterAction: 'Chiudi dopo azione',
    closeButtonKey: 'Posizione pulsante chiudi',
    none: 'Nessuno'
  }
};
