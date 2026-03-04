// Sidebar navigation
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const target = item.dataset.page;

    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');

    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${target}`).classList.add('active');
  });
});

// Settings elements
const toggleSpeakers = document.getElementById('toggleSpeakers');
const toggleVirtualMic = document.getElementById('toggleVirtualMic');
const speakerDeviceSelect = document.getElementById('speakerDevice');
const virtualMicDeviceSelect = document.getElementById('virtualMicDevice');
const playBtn = document.getElementById('playBtn');
const statusEl = document.getElementById('status');
const vbcableBanner = document.getElementById('vbcableBanner');
const vbcableLink = document.getElementById('vbcableLink');
const outputVolume = document.getElementById('outputVolume');
const outputVolumeValue = document.getElementById('outputVolumeValue');
const monitorVolume = document.getElementById('monitorVolume');
const monitorVolumeValue = document.getElementById('monitorVolumeValue');

// Browse elements
const searchInput = document.getElementById('searchInput');
const soundGrid = document.getElementById('soundGrid');
const browseStatus = document.getElementById('browseStatus');
const loadMoreBtn = document.getElementById('loadMoreBtn');

let soundPath = '';
let activeAudios = [];
let activeBrowseAudio = null;
let activeCard = null;

// ── Browse: MyInstants search ──

let searchTimeout = null;
let browseNextUrl = null;

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const query = searchInput.value.trim();

  if (!query) {
    soundGrid.innerHTML = '';
    browseStatus.textContent = 'Type something to search';
    browseStatus.style.display = '';
    loadMoreBtn.style.display = 'none';
    return;
  }

  searchTimeout = setTimeout(() => searchMyInstants(query), 400);
});

async function searchMyInstants(query) {
  browseStatus.textContent = 'Searching...';
  browseStatus.className = 'browse-status';
  browseStatus.style.display = '';
  soundGrid.innerHTML = '';
  loadMoreBtn.style.display = 'none';

  const url = `https://www.myinstants.com/api/v1/instants/?format=json&name=${encodeURIComponent(query)}`;
  await fetchAndRender(url, false);
}

async function fetchAndRender(url, append) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    browseNextUrl = data.next;

    if (!append) soundGrid.innerHTML = '';

    if (data.results.length === 0 && !append) {
      browseStatus.textContent = 'No sounds found';
      browseStatus.style.display = '';
      loadMoreBtn.style.display = 'none';
      return;
    }

    browseStatus.style.display = 'none';

    for (const item of data.results) {
      const soundUrl = item.sound.startsWith('http')
        ? item.sound
        : `https://www.myinstants.com${item.sound}`;

      const card = document.createElement('div');
      card.className = 'sound-card';
      card.innerHTML = `
        <button class="sound-card-btn">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="sound-card-name">${escapeHtml(item.name)}</div>
        <div class="sound-card-actions">
          <button class="sound-card-preview" title="Listen (local only)">
            <svg viewBox="0 0 24 24"><path d="M12 1C7.03 1 3 5.03 3 10v6c0 1.66 1.34 3 3 3h1v-7H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-2v7h1c1.66 0 3-1.34 3-3v-6c0-4.97-4.03-9-9-9zM7 14v4H6c-.55 0-1-.45-1-1v-3h2zm12 3c0 .55-.45 1-1 1h-1v-4h2v3z"/></svg>
          </button>
          <button class="sound-card-save" title="Save to library">
            <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </button>
        </div>
      `;

      const playArea = card.querySelector('.sound-card-btn');
      playArea.addEventListener('click', (e) => {
        e.stopPropagation();
        playBrowseSound(soundUrl, card);
      });

      card.querySelector('.sound-card-preview').addEventListener('click', (e) => {
        e.stopPropagation();
        previewSound(soundUrl);
      });

      const saveBtn = card.querySelector('.sound-card-save');
      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveToLibrary(item.name, soundUrl, saveBtn);
      });

      card.addEventListener('click', () => playBrowseSound(soundUrl, card));
      soundGrid.appendChild(card);
    }

    loadMoreBtn.style.display = browseNextUrl ? '' : 'none';
  } catch (err) {
    browseStatus.textContent = 'Error: ' + err.message;
    browseStatus.className = 'browse-status error';
    browseStatus.style.display = '';
  }
}

loadMoreBtn.addEventListener('click', () => {
  if (browseNextUrl) {
    loadMoreBtn.disabled = true;
    fetchAndRender(browseNextUrl, true).then(() => {
      loadMoreBtn.disabled = false;
    });
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function playBrowseSound(url, card) {
  // Stop previous browse audio
  if (activeBrowseAudio) {
    activeBrowseAudio.pause();
    activeBrowseAudio.currentTime = 0;
    activeBrowseAudio = null;
  }
  if (activeCard) {
    activeCard.classList.remove('active');
  }

  // Stop settings test audio too
  stopAll();

  card.classList.add('active');
  activeCard = card;

  const toSpeakers = toggleSpeakers.checked;
  const toVirtualMic = toggleVirtualMic.checked;

  if (!toSpeakers && !toVirtualMic) {
    // Default: play to speakers at monitor volume
    const audio = new Audio(url);
    audio.volume = monitorVolume.value / 100;
    try {
      await audio.play();
      activeBrowseAudio = audio;
      audio.addEventListener('ended', () => {
        card.classList.remove('active');
        activeCard = null;
      });
    } catch (err) {
      card.classList.remove('active');
      activeCard = null;
    }
    return;
  }

  const audios = [];

  if (toVirtualMic) {
    const audio = new Audio(url);
    audio.volume = outputVolume.value / 100;
    try {
      if (typeof audio.setSinkId === 'function') {
        await audio.setSinkId(virtualMicDeviceSelect.value);
      }
      await audio.play();
      audios.push(audio);
    } catch (err) {
      console.error('Error playing to Virtual Mic:', err);
    }
  }

  if (toSpeakers) {
    const audio = new Audio(url);
    audio.volume = monitorVolume.value / 100;
    try {
      if (typeof audio.setSinkId === 'function') {
        await audio.setSinkId(speakerDeviceSelect.value);
      }
      await audio.play();
      audios.push(audio);
    } catch (err) {
      console.error('Error playing to Speakers:', err);
    }
  }

  if (audios.length > 0) {
    activeBrowseAudio = audios[0];
    audios.forEach(a => {
      a.addEventListener('ended', () => {
        const allDone = audios.every(x => x.ended || x.paused);
        if (allDone) {
          card.classList.remove('active');
          activeCard = null;
        }
      });
    });
  } else {
    card.classList.remove('active');
    activeCard = null;
  }
}

// ── Preview (local-only playback) ──

let previewAudio = null;

function previewSound(url) {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio.currentTime = 0;
  }
  previewAudio = new Audio(url);
  previewAudio.volume = monitorVolume.value / 100;
  previewAudio.play().catch(() => {});
}

// ── Library ──

const libraryGrid = document.getElementById('libraryGrid');
const libraryEmpty = document.getElementById('libraryEmpty');

async function saveToLibrary(name, url, btn) {
  btn.classList.add('saved');
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>';

  try {
    await window.api.librarySave(name, url);
  } catch (err) {
    console.error('Error saving to library:', err);
    btn.classList.remove('saved');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>';
  }
}

async function loadLibrary() {
  const items = await window.api.libraryList();
  libraryGrid.innerHTML = '';

  if (items.length === 0) {
    libraryEmpty.style.display = '';
    return;
  }

  libraryEmpty.style.display = 'none';

  for (const item of items) {
    const filePath = await window.api.libraryGetPath(item.filename);
    const fileUrl = `file://${filePath}`;

    const card = document.createElement('div');
    card.className = 'library-card';
    card.innerHTML = `
      <button class="library-card-delete" title="Remove">
        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
      </button>
      <button class="sound-card-btn">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <div class="sound-card-name">${escapeHtml(item.name)}</div>
    `;

    card.querySelector('.sound-card-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      playBrowseSound(fileUrl, card);
    });

    card.addEventListener('click', () => playBrowseSound(fileUrl, card));

    card.querySelector('.library-card-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.api.libraryDelete(item.id);
      card.remove();
      const remaining = libraryGrid.children.length;
      if (remaining === 0) libraryEmpty.style.display = '';
    });

    libraryGrid.appendChild(card);
  }
}

// Reload library when navigating to it
navItems.forEach(item => {
  item.addEventListener('click', () => {
    if (item.dataset.page === 'library') loadLibrary();
  });
});

// ── Settings: status & devices ──

function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = type;
}

async function enumerateDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter(d => d.kind === 'audiooutput');

    speakerDeviceSelect.innerHTML = '';
    virtualMicDeviceSelect.innerHTML = '';

    for (const device of outputs) {
      const label = device.label || `Device ${device.deviceId.substring(0, 8)}`;

      const opt1 = document.createElement('option');
      opt1.value = device.deviceId;
      opt1.textContent = label;
      speakerDeviceSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = device.deviceId;
      opt2.textContent = label;
      virtualMicDeviceSelect.appendChild(opt2);
    }

    // Check if VB-CABLE is installed
    const cableDevice = outputs.find(d => d.label.toLowerCase().includes('cable input'));
    if (cableDevice) {
      virtualMicDeviceSelect.value = cableDevice.deviceId;
      vbcableBanner.classList.remove('visible');
    } else {
      vbcableBanner.classList.add('visible');
    }

    setStatus(`${outputs.length} audio output devices found`, 'success');
  } catch (err) {
    setStatus('Error enumerating devices: ' + err.message, 'error');
  }
}

// ── Settings: test play ──

async function playSoundToDevice(url, deviceId, label, isMonitor) {
  const audio = new Audio(url);
  audio.volume = (isMonitor ? monitorVolume.value : outputVolume.value) / 100;

  try {
    if (deviceId && typeof audio.setSinkId === 'function') {
      await audio.setSinkId(deviceId);
    }
    await audio.play();
    activeAudios.push(audio);
    return audio;
  } catch (err) {
    setStatus(`Error playing to ${label}: ${err.message}`, 'error');
    return null;
  }
}

function stopAll() {
  for (const audio of activeAudios) {
    audio.pause();
    audio.currentTime = 0;
  }
  activeAudios = [];
  playBtn.classList.remove('playing');
}

async function handlePlay() {
  stopAll();

  const toSpeakers = toggleSpeakers.checked;
  const toVirtualMic = toggleVirtualMic.checked;

  if (!toSpeakers && !toVirtualMic) {
    setStatus('Enable at least one output', 'error');
    return;
  }

  const soundUrl = `file://${soundPath}`;
  playBtn.classList.add('playing');
  const targets = [];

  if (toSpeakers) {
    targets.push(playSoundToDevice(soundUrl, speakerDeviceSelect.value, 'Speakers', true));
  }
  if (toVirtualMic) {
    targets.push(playSoundToDevice(soundUrl, virtualMicDeviceSelect.value, 'Virtual Mic', false));
  }

  const results = await Promise.all(targets);
  const successCount = results.filter(Boolean).length;

  if (successCount > 0) {
    const labels = [];
    if (toSpeakers) labels.push('Speakers');
    if (toVirtualMic) labels.push('Virtual Mic');
    setStatus(`Playing to: ${labels.join(' + ')}`, 'success');

    for (const audio of activeAudios) {
      audio.addEventListener('ended', () => {
        const allEnded = activeAudios.every(a => a.ended || a.paused);
        if (allEnded) {
          playBtn.classList.remove('playing');
          setStatus('Ready', '');
        }
      });
    }
  } else {
    playBtn.classList.remove('playing');
  }
}

// ── Config persistence ──

async function loadSavedConfig() {
  try {
    const config = await window.api.loadConfig();
    toggleSpeakers.checked = config.sendToSpeakers;
    toggleVirtualMic.checked = config.sendToVirtualMic;

    if (config.outputVolume !== undefined) {
      outputVolume.value = config.outputVolume;
      outputVolumeValue.textContent = config.outputVolume + '%';
    }
    if (config.monitorVolume !== undefined) {
      monitorVolume.value = config.monitorVolume;
      monitorVolumeValue.textContent = config.monitorVolume + '%';
    }

    if (config.speakerDeviceId) {
      speakerDeviceSelect.value = config.speakerDeviceId;
    }
    if (config.virtualMicDeviceId) {
      virtualMicDeviceSelect.value = config.virtualMicDeviceId;
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

function saveCurrentConfig() {
  window.api.saveConfig({
    sendToSpeakers: toggleSpeakers.checked,
    sendToVirtualMic: toggleVirtualMic.checked,
    speakerDeviceId: speakerDeviceSelect.value,
    virtualMicDeviceId: virtualMicDeviceSelect.value,
    outputVolume: parseInt(outputVolume.value, 10),
    monitorVolume: parseInt(monitorVolume.value, 10)
  });
}

// ── Event listeners ──

outputVolume.addEventListener('input', () => {
  outputVolumeValue.textContent = outputVolume.value + '%';
});
monitorVolume.addEventListener('input', () => {
  monitorVolumeValue.textContent = monitorVolume.value + '%';
});

toggleSpeakers.addEventListener('change', saveCurrentConfig);
toggleVirtualMic.addEventListener('change', saveCurrentConfig);
speakerDeviceSelect.addEventListener('change', saveCurrentConfig);
virtualMicDeviceSelect.addEventListener('change', saveCurrentConfig);
outputVolume.addEventListener('change', saveCurrentConfig);
monitorVolume.addEventListener('change', saveCurrentConfig);

playBtn.addEventListener('click', handlePlay);

vbcableLink.addEventListener('click', (e) => {
  e.preventDefault();
  window.api.openExternal('https://vb-audio.com/Cable/');
});

// ── Library export/import ──

const exportLibraryBtn = document.getElementById('exportLibraryBtn');
const importLibraryBtn = document.getElementById('importLibraryBtn');
const libraryStatusEl = document.getElementById('libraryStatus');

function setLibraryStatus(msg, type = '') {
  libraryStatusEl.textContent = msg;
  libraryStatusEl.className = 'library-status' + (type ? ' ' + type : '');
}

exportLibraryBtn.addEventListener('click', async () => {
  exportLibraryBtn.disabled = true;
  setLibraryStatus('Exporting...');
  try {
    const result = await window.api.libraryExport();
    if (result.canceled) {
      setLibraryStatus('');
    } else if (result.success) {
      setLibraryStatus(`Exported ${result.count} sounds`, 'success');
    } else {
      setLibraryStatus(result.error || 'Export failed', 'error');
    }
  } catch (err) {
    setLibraryStatus('Export failed: ' + err.message, 'error');
  }
  exportLibraryBtn.disabled = false;
});

importLibraryBtn.addEventListener('click', async () => {
  importLibraryBtn.disabled = true;
  setLibraryStatus('Importing...');
  try {
    const result = await window.api.libraryImport();
    if (result.canceled) {
      setLibraryStatus('');
    } else if (result.success) {
      setLibraryStatus(`Imported ${result.added} new sounds (${result.total} total)`, 'success');
    } else {
      setLibraryStatus(result.error || 'Import failed', 'error');
    }
  } catch (err) {
    setLibraryStatus('Import failed: ' + err.message, 'error');
  }
  importLibraryBtn.disabled = false;
});

// ── Init ──
(async () => {
  soundPath = await window.api.getSoundPath();
  await enumerateDevices();
  await loadSavedConfig();
  setStatus('Ready', '');
})();
