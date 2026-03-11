# SoundDome — Virtual Mic Development Plan V4

## Zero-Cost Blueprint for Eliminating VB-CABLE Dependency

**Constraint: everything in this plan must be 100% free. No certificates, no licenses, no paid SDKs.**

---

## Review of V3 Ultra Plan

### What V3 Gets Right
- The core goal is correct: eliminate VB-CABLE as a user-installable prerequisite
- The audio architecture diagrams are solid conceptually
- RNNoise integration is a legitimate quality improvement
- The compressor presets and dB utility functions are well-designed and reusable
- The ring buffer / shared memory design is textbook correct (but not needed for our approach)

### Critical Problems with V3

**1. It ignores the existing SoundDome codebase entirely**
V3 describes a brand new app with React + Zustand + Tailwind + webpack. SoundDome already exists with Vue 3 + Pinia + electron-vite + CSS custom properties. All UI components, stores, routing, i18n, etc. are already built and working. The plan must *extend* SoundDome, not rewrite it.

**2. Many features already exist in SoundDome**
- Digital mixer (`useMicMixer.ts`) — already mixes mic + soundboard audio via Web Audio API
- Gain control — already implemented with GainNode + volume ramping (`rampGain()`)
- Device selection UI — already in `SettingsPage.vue` with `DeviceSelect` component
- Mic passthrough — already working with `getUserMedia` + Web Audio API
- Dual output routing — already routes to speakers + virtual mic independently via `setSinkId()`

**3. The custom kernel driver path costs money**
- EV Code Signing Certificate: ~$280-580/year (mandatory for driver distribution)
- Without signing, users must enable Windows Test Mode (desktop watermark) — dealbreaker
- **This path is eliminated from this plan**

**4. The DSP pipeline adds massive scope**
RNNoise, compressor, VAD, sidechain attenuation, AudioWorklet — each is a significant feature. Adding all of them alongside a driver is scope creep. These should be separate milestones.

**5. The timeline was extremely optimistic**
13 weeks for a kernel driver + native bridge + DSP pipeline + installer is unrealistic without prior WDK experience.

---

## What Commercial Apps Actually Do

| App | Approach | Driver? | Cost to Dev |
|-----|----------|---------|-------------|
| **Voicemod** | Ships own signed WDM kernel driver | Yes | $$$ (EV cert + dev team) |
| **Soundpad** | Hooks into existing mic driver | No | Free (but fragile) |
| **Resanance** | Requires user to install VB-CABLE | No | Free |
| **EXP Soundboard** | Requires external virtual audio cable | No | Free |
| **SoundDome (current)** | Requires user to install VB-CABLE | No | Free |
| **SoundDome (this plan)** | Bundles free open-source driver (⚠️ signing blocker — error 52 on Win11) | Yes (bundled) | **Free** (but needs Microsoft attestation signing to work on stock Windows) |
| **SoundDome (Linux)** | PulseAudio/PipeWire module-null-sink at runtime | No (OS built-in) | **Free** |

---

## The Solution: Bundle VirtualDrivers/Virtual-Audio-Driver

**Repository:** [github.com/VirtualDrivers/Virtual-Audio-Driver](https://github.com/VirtualDrivers/Virtual-Audio-Driver)

### Why This Works

- **Free and open source** — no licensing fees
- **Claims signing via [SignPath Foundation](https://signpath.org/)** — however, the release tested (March 2026) was NOT recognized by Windows 11 (error code 52: `CM_PROB_UNSIGNED_DRIVER`). The device node is created and driver installed, but Windows refuses to load the unsigned `.sys`. Possible causes: signature expired, not attestation-signed by Microsoft (required since Windows 10 1607 for kernel-mode drivers), or the GitHub release is not the signed build. **This is currently a blocker** — VB-CABLE remains the working fallback.
- Creates both a **virtual speaker** and **virtual microphone** endpoint
- Supports Windows Sonic, Exclusive Mode, configurable sample rates (8kHz-192kHz)
- Compatible with Discord, OBS, Zoom, games, etc.
- Actively maintained (2024-2026)
- Can be installed/uninstalled silently via command line

### How It Replaces VB-CABLE

```
BEFORE (VB-CABLE — manual install):
  User downloads SoundDome → installs → sees "Install VB-CABLE" warning
  → goes to vb-audio.com → downloads → installs VB-CABLE → restarts SoundDome
  → configures audio device → finally works

AFTER (bundled driver — zero friction):
  User downloads SoundDome → installs (driver included) → works immediately
```

### Audio Flow After Integration

```
SORGENTI                    PROCESSING              DESTINAZIONI
──────────────────────────────────────────────────────────────────

Microfono fisico ──────►  Web Audio API    ──────┐
                          (getUserMedia)          │
                                                  │
                       ┌──────────────────────────┤
                       │      useMicMixer         │
Soundboard clip ───────►  (GainNode mixing)       │
(HTMLAudioElement)     │                          │
                       └──────────────────────────┤
                                                  │
                              Gain Control  ◄─────┘
                                   │
                    ┌──────────────┴───────────────┐
                    │                              │
                    ▼                              ▼
           Virtual Speaker               Speaker Output
           (Virtual-Audio-Driver)        (cuffie/speakers)
           via setSinkId()               via setSinkId()
                    │
                    ▼
           Virtual Microphone
           (same driver, paired endpoint)
                    │
                    ▼
          Discord / Zoom / Games
          (captures from Virtual Mic)
```

The key insight: Virtual-Audio-Driver creates a **paired** virtual speaker + virtual microphone. Audio sent to the virtual speaker automatically appears on the virtual microphone. This is the exact same model as VB-CABLE — so the existing `setSinkId()` routing in `useAudio.ts` works unchanged.

---

## Implementation Plan

### Phase 1: Bundle Virtual Audio Driver (Week 1-2)

**Goal:** SoundDome installs without requiring manual VB-CABLE setup. Zero cost.

#### 1.1 Evaluate and Test Driver

- [ ] Clone/download VirtualDrivers/Virtual-Audio-Driver releases
- [ ] Verify license is compatible (check for MIT/BSD/Apache)
- [ ] Install manually on Windows 10 and Windows 11
- [ ] Verify virtual devices appear in Sound Settings
- [ ] Test with Discord: select virtual mic as input, send audio through virtual speaker
- [ ] Test with SoundDome: route audio to virtual speaker via `setSinkId()`
- [ ] Measure latency (should be comparable to VB-CABLE)
- [ ] Test install/uninstall cycle — verify clean removal

#### 1.2 Integrate into NSIS Installer

The current build uses electron-builder with NSIS. Add driver installation to the installer script.

**Files to create/modify:**
- `build/installer.nsh` (NSIS custom include script for electron-builder)

```nsis
; build/installer.nsh
; Custom NSIS include for electron-builder

!macro customInstall
  ; Check if Virtual Audio Driver is already installed
  nsExec::ExecToLog 'sc query "VirtualAudioDriver"'
  Pop $0
  ${If} $0 != 0
    ; Install the Virtual Audio Driver silently
    DetailPrint "Installing Virtual Audio Driver..."
    SetOutPath "$INSTDIR\driver"
    File /r "${BUILD_RESOURCES_DIR}\driver\*.*"
    nsExec::ExecToLog '"$INSTDIR\driver\VirtualAudioDriver-Setup.exe" /S'
    Pop $0
    ${If} $0 != 0
      ; Driver install failed — not fatal, VB-CABLE fallback still works
      DetailPrint "Virtual Audio Driver installation skipped (code: $0)"
      MessageBox MB_OK|MB_ICONINFORMATION \
        "Virtual Audio Driver could not be installed.$\n\
        You can still use SoundDome with VB-CABLE."
    ${Else}
      DetailPrint "Virtual Audio Driver installed successfully"
    ${EndIf}
  ${Else}
    DetailPrint "Virtual Audio Driver already installed"
  ${EndIf}
!macroend

!macro customUnInstall
  ; Uninstall the Virtual Audio Driver
  ${If} ${FileExists} "$INSTDIR\driver\VirtualAudioDriver-Setup.exe"
    DetailPrint "Removing Virtual Audio Driver..."
    nsExec::ExecToLog '"$INSTDIR\driver\VirtualAudioDriver-Setup.exe" /S /uninstall'
    RMDir /r "$INSTDIR\driver"
  ${EndIf}
!macroend
```

**Note:** The exact installer executable name and flags depend on the Virtual-Audio-Driver release format. Adapt after testing.

**Implementation note (Phase 1B finding):** `pnputil /add-driver` alone is insufficient — it stages the INF into the driver store but does not create the device node, so no audio endpoints appear. The solution uses **nefconw.exe** from [nefarius/nefcon](https://github.com/nefarius/nefcon) to create the device node after driver staging:

```nsis
; Stage the driver INF
nsExec::ExecToLog '"$SYSDIR\pnputil.exe" /add-driver "$INSTDIR\driver\VirtualAudioDriver.inf" /install'
; Create the device node (nefconw.exe — nefarius/nefcon, MIT license)
nsExec::ExecToLog '"$INSTDIR\driver\nefconw.exe" --create-device-node --hardware-id "Root\VirtualAudioDriver" --class-name "MEDIA" --class-guid "{4d36e96c-e325-11ce-bfc1-08002be10318}"'
```

Without the `nefconw.exe` step, the driver is staged but the virtual audio endpoints never appear in the system.

#### 1.3 Update Device Detection

**File:** `src/enums/constants.ts`

Add detection keyword for the new driver alongside existing VB-CABLE keywords:

```typescript
// Existing VB-CABLE detection
export const VBCABLE_LABEL_KEYWORD = 'cable input';
export const VBCABLE_FILTER_KEYWORD = 'cable';

// New: Virtual Audio Driver detection
export const VIRTUAL_AUDIO_DRIVER_KEYWORD = 'virtual audio';

// Combined: any supported virtual audio device
export const VIRTUAL_MIC_KEYWORDS = ['cable input', 'virtual audio'] as const;
```

**File:** `src/composables/useDevices.ts`

Update to detect either VB-CABLE or Virtual-Audio-Driver:

```typescript
import { VIRTUAL_MIC_KEYWORDS, VBCABLE_FILTER_KEYWORD, VIRTUAL_AUDIO_DRIVER_KEYWORD } from '@/enums/constants';

export function isVirtualAudioDevice(device: MediaDeviceInfo): boolean {
  const label = device.label.toLowerCase();
  return _.some(VIRTUAL_MIC_KEYWORDS, keyword => label.includes(keyword));
}

// Filter input devices: exclude ALL virtual audio devices (not just VB-CABLE)
export async function enumerateInputDevices(): Promise<MediaDeviceInfo[]> {
  // ... existing getUserMedia for permissions ...
  const devices = await navigator.mediaDevices.enumerateDevices();
  return _(devices)
    .filter({ kind: 'audioinput' })
    .reject(d => isVirtualAudioDevice(d))
    .value();
}
```

**File:** `src/pages/SettingsPage.vue`

Update auto-detection logic in `loadDevicesAndDetectCable()`:

```typescript
// Detect any virtual audio device (VB-CABLE or Virtual Audio Driver)
const virtualDevice = _.find(outputDevices.value, d =>
  isVirtualAudioDevice(d)
);

if (virtualDevice) {
  config.virtualMicDeviceId = virtualDevice.deviceId;
  virtualMicDetected.value = true;
} else {
  virtualMicDetected.value = false;
}
```

Update warning banner: instead of "Install VB-CABLE", show "No virtual audio device detected".

#### 1.4 Update i18n Strings

**File:** `src/i18n/en.ts`

```typescript
// Replace VB-CABLE specific messages
settings: {
  // OLD: vbcableMissing: 'VB-CABLE not detected...'
  // NEW:
  virtualMicMissing: 'No virtual audio device detected. Reinstall SoundDome or install VB-CABLE manually.',
  virtualMicDetected: 'Virtual audio device: {deviceName}',
}
```

**File:** `src/i18n/it.ts` — same changes in Italian.

#### 1.5 Electron-Builder Config

**File:** `electron-builder.yml` or `package.json` build config

Add driver files to `extraResources`:

```yaml
extraResources:
  - from: "build/driver"
    to: "driver"
    filter:
      - "**/*"
```

#### 1.6 Test Matrix

```
INSTALLATION
[ ] Fresh install on Windows 10 (no VB-CABLE) → driver installs, SoundDome detects it
[ ] Fresh install on Windows 11 → same
[ ] Install on machine with VB-CABLE already present → uses VB-CABLE, skips driver
[ ] Install on machine with both → detects either one

AUDIO ROUTING
[ ] Sound plays to virtual speaker → appears on virtual mic → Discord receives it
[ ] Mic passthrough works through virtual audio device
[ ] Volume controls work correctly
[ ] Both speaker + virtual mic output simultaneously

UNINSTALL
[ ] Uninstall removes driver cleanly
[ ] No orphan devices in Sound Settings after uninstall
[ ] Reinstall works after uninstall

FALLBACK
[ ] If driver install fails → app still works with VB-CABLE warning
[ ] If no virtual device at all → warning banner shown, app still usable for local playback
```

---

### Phase 2: Audio Engine Improvements (Week 3-4)

**Goal:** Better audio quality. All free (Web Audio API built-in).

#### 2.1 DynamicsCompressorNode

Add a compressor before the virtual mic output to normalize volume spikes from soundboard clips.

**File:** `src/enums/constants.ts`

```typescript
// Compressor presets (from V3 plan — these are correct)
export const COMPRESSOR_PRESETS = {
  VOICE: {
    threshold: -20,
    knee: 8,
    ratio: 3,
    attack: 0.005,
    release: 0.3,
  },
  SOUNDBOARD: {
    threshold: -12,
    knee: 5,
    ratio: 6,
    attack: 0.001,
    release: 0.1,
  },
} as const;
```

**File:** `src/composables/useMicMixer.ts`

Insert compressor node in the audio chain:

```typescript
// After sbGain, before audioContext.destination
const compressor = audioContext.createDynamicsCompressor();
compressor.threshold.value = COMPRESSOR_PRESETS.SOUNDBOARD.threshold;
compressor.knee.value = COMPRESSOR_PRESETS.SOUNDBOARD.knee;
compressor.ratio.value = COMPRESSOR_PRESETS.SOUNDBOARD.ratio;
compressor.attack.value = COMPRESSOR_PRESETS.SOUNDBOARD.attack;
compressor.release.value = COMPRESSOR_PRESETS.SOUNDBOARD.release;

// Chain: sbGain → compressor → destination (instead of sbGain → destination)
sbGain.connect(compressor);
compressor.connect(audioContext.destination);

// micGain still connects directly (voice doesn't need heavy compression)
micGain.connect(audioContext.destination);
```

Add a config toggle (`enableCompressor`) so users can disable it.

#### 2.2 dB Logarithmic Volume Curve

The V3 plan's dB utilities are well-designed. Add them as a new file.

**File:** `src/utils/db.ts`

```typescript
/**
 * Converts dB to linear gain.
 * 0 dB = 1.0, -6 dB ≈ 0.5, -20 dB = 0.1, -60 dB ≈ silence
 */
export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function gainToDb(gain: number): number {
  if (gain <= 0) return -Infinity;
  return 20 * Math.log10(gain);
}

/**
 * Discord/Steam-style logarithmic slider curve.
 * Input: 0-100 (slider value)
 * Output: dB (-60 to 0)
 *
 * 0   → -60 dB (practical silence)
 * 50  → ~-15 dB (perceived half volume)
 * 100 → 0 dB (full volume)
 */
export function sliderToDb(sliderValue: number): number {
  const v = _.clamp(sliderValue, 0, 100);
  if (v === 0) return -60;
  const normalized = v / 100;
  return -60 * Math.pow(1 - normalized, 2);
}

export function dbToSlider(db: number): number {
  if (db <= -60) return 0;
  if (db >= 0) return 100;
  const normalized = 1 - Math.sqrt(-db / 60);
  return Math.round(normalized * 100);
}
```

This can be used optionally — add a toggle in settings to switch between linear and dB curve. The existing 0-100 sliders stay as-is, the dB conversion happens at the audio layer.

#### 2.3 AudioContext Latency Optimization

**File:** `src/composables/useMicMixer.ts`

```typescript
// Change from default to interactive latency hint
const audioContext = new AudioContext({
  sampleRate: AUDIO_SAMPLE_RATE,  // 48000 (already defined in constants)
  latencyHint: 'interactive',      // Request minimum buffer size
});
```

#### 2.4 Latency Indicator

**File:** `src/pages/SettingsPage.vue`

Add a small diagnostics section showing:

```typescript
const latencyMs = computed(() => {
  if (!mixer.audioContext) return null;
  return Math.round(mixer.audioContext.baseLatency * 1000);
});
```

Display: `Audio latency: 5ms` in the settings page.

#### 2.5 AudioBuffer Pre-Decoding (Instant Playback)

Currently, `useAudio.ts` creates a new `HTMLAudioElement` for each sound play. This adds decode latency on first play.

**Alternative:** Pre-decode frequently played sounds into `AudioBuffer` using `AudioContext.decodeAudioData()`, then use `AudioBufferSourceNode.start()` for instant playback.

```typescript
// Pre-decode a library item's audio file
async function preloadSound(filePath: string): Promise<AudioBuffer> {
  const response = await fetch(filePath);
  const arrayBuffer = await response.arrayBuffer();
  return audioContext.decodeAudioData(arrayBuffer);
}

// Play instantly from pre-decoded buffer
function playFromBuffer(buffer: AudioBuffer): AudioBufferSourceNode {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(sbGain);  // Route through existing gain chain
  source.start();
  return source;
}
```

**Note:** This is an enhancement, not a replacement. Keep `HTMLAudioElement` path for speaker output (needs `setSinkId()`). Use `AudioBufferSourceNode` only for the virtual mic path where audio goes through Web Audio API anyway.

---

### Phase 3: RNNoise Noise Suppression (Week 5-6)

**Goal:** Optional noise suppression on mic input. Free (open-source WASM).

**Cost:** $0 — `@shiguredo/rnnoise-wasm` is BSD-licensed.

#### 3.1 Install Dependency

```bash
npm install @shiguredo/rnnoise-wasm
```

#### 3.2 Frame Accumulator

Web Audio API processes 128 samples per callback. RNNoise needs 480 samples (10ms @ 48kHz). Need an accumulator to bridge the gap.

**File:** `src/audio/frame-accumulator.ts`

```typescript
/**
 * Accumulates small audio frames (128 samples from Web Audio)
 * into larger frames (480 samples for RNNoise).
 */
export class FrameAccumulator {
  private buffer: Float32Array;
  private writePos = 0;
  private readonly frameSize: number;

  constructor(frameSize = 480) {
    this.frameSize = frameSize;
    this.buffer = new Float32Array(frameSize);
  }

  /**
   * Push samples into the accumulator.
   * Returns complete frames when enough samples have been collected.
   * No allocation in the hot path (reuses internal buffer).
   */
  push(samples: Float32Array): Float32Array[] {
    const frames: Float32Array[] = [];
    let readPos = 0;

    while (readPos < samples.length) {
      const space = this.frameSize - this.writePos;
      const toWrite = Math.min(space, samples.length - readPos);

      this.buffer.set(
        samples.subarray(readPos, readPos + toWrite),
        this.writePos
      );

      this.writePos += toWrite;
      readPos += toWrite;

      if (this.writePos >= this.frameSize) {
        // Frame complete — copy out (RNNoise modifies in-place)
        const frame = new Float32Array(this.frameSize);
        frame.set(this.buffer);
        frames.push(frame);
        this.writePos = 0;
      }
    }

    return frames;
  }
}
```

#### 3.3 RNNoise Bridge

**File:** `src/composables/useRNNoise.ts`

```typescript
import { Rnnoise } from '@shiguredo/rnnoise-wasm';

let rnnoiseInstance: Rnnoise | null = null;

export async function initRNNoise(): Promise<void> {
  if (rnnoiseInstance) return;
  rnnoiseInstance = await Rnnoise.load();
}

/**
 * Process a 480-sample frame through RNNoise.
 * Returns the denoised frame.
 * If RNNoise is not initialized, returns input unchanged.
 */
export function processFrame(input: Float32Array): Float32Array {
  if (!rnnoiseInstance) return input;
  // RNNoise expects exactly 480 samples at 48kHz
  return rnnoiseInstance.processFrame(input);
}

export function destroyRNNoise(): void {
  if (rnnoiseInstance) {
    rnnoiseInstance.destroy();
    rnnoiseInstance = null;
  }
}
```

#### 3.4 Integration into Mic Mixer

**File:** `src/composables/useMicMixer.ts`

Insert RNNoise between mic capture and micGain:

```typescript
// Instead of: micSource → micGain → destination
// Now:        micSource → ScriptProcessor (RNNoise) → micGain → destination

// Note: ScriptProcessorNode is deprecated but simpler to integrate.
// Phase 4 (AudioWorklet) replaces this with a proper worklet.

if (config.enableNoiseSuppression) {
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const accumulator = new FrameAccumulator(480);

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const output = event.outputBuffer.getChannelData(0);

    const frames = accumulator.push(input);
    let outputPos = 0;

    for (const frame of frames) {
      const processed = processFrame(frame);
      const toCopy = Math.min(processed.length, output.length - outputPos);
      output.set(processed.subarray(0, toCopy), outputPos);
      outputPos += toCopy;
    }
  };

  micSource.connect(processor);
  processor.connect(micGain);
} else {
  micSource.connect(micGain);
}
```

#### 3.5 Settings UI

Add toggle in `SettingsPage.vue`:

```vue
<SettingActionRow :label="t('settings.noiseSuppression')">
  <SwitchToggle v-model="config.enableNoiseSuppression" />
</SettingActionRow>
```

**Config store:** add `enableNoiseSuppression: boolean` (default `false`).

---

### Phase 4: AudioWorklet Migration (Week 7-8)

**Goal:** Move audio processing to a dedicated audio thread. Replaces deprecated ScriptProcessorNode. Free.

#### 4.1 AudioWorklet Processor

**File:** `src/audio/main-processor.worklet.ts`

```typescript
// This file runs in a separate audio thread.
// No imports allowed — all utilities must be inline.

function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

function applySoftClipper(buffer: Float32Array): void {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.tanh(buffer[i]);
  }
}

class MainProcessor extends AudioWorkletProcessor {
  private gainValue = 1.0;
  private outputBuffer: Float32Array;

  constructor() {
    super();
    this.outputBuffer = new Float32Array(128); // Web Audio default frame size

    this.port.onmessage = (event) => {
      const { type, value } = event.data;
      if (type === 'SET_GAIN_DB') {
        this.gainValue = dbToGain(value);
      }
    };
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
  ): boolean {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (!input || !output) return true;

    // Apply gain
    for (let i = 0; i < input.length; i++) {
      output[i] = input[i] * this.gainValue;
    }

    // Soft clip to prevent distortion
    applySoftClipper(output);

    return true;
  }
}

registerProcessor('main-processor', MainProcessor);
```

#### 4.2 Worklet Registration

**File:** `src/composables/useAudioWorklet.ts`

```typescript
export async function createWorkletNode(
  ctx: AudioContext
): Promise<AudioWorkletNode> {
  // electron-vite must be configured to serve this file separately
  await ctx.audioWorklet.addModule(new URL('../audio/main-processor.worklet.ts', import.meta.url));
  return new AudioWorkletNode(ctx, 'main-processor');
}
```

#### 4.3 electron-vite Config

**File:** `electron.vite.config.ts`

Add worklet to the build config as a separate entry or use the `?worker&url` import pattern that Vite supports.

#### 4.4 RNNoise in AudioWorklet

Moving RNNoise into the worklet is the ideal setup but requires:
- Loading WASM inside the worklet (via `WebAssembly.instantiate` + MessagePort)
- SharedArrayBuffer for efficient data transfer
- Electron supports both, but requires `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers

This is the most complex part of Phase 4. If it proves too difficult, keep RNNoise on the main thread with ScriptProcessorNode (Phase 3 approach) — it works fine for SoundDome's use case.

---

## What Already Works (Don't Rebuild)

These features from V3's plan already exist in SoundDome:

| V3 Feature | SoundDome Status | Location |
|---|---|---|
| Digital mixer (mic + soundboard) | Done | `useMicMixer.ts` |
| Gain control with GainNode | Done | `useMicMixer.ts` (sbGain, micGain) |
| Volume ramping (smooth transitions) | Done | `rampGain()` in useMicMixer |
| Dual output routing (speakers + mic) | Done | `useAudio.ts` (routeToDevice) |
| Device selection UI | Done | `SettingsPage.vue` + `DeviceSelect.vue` |
| Mic passthrough | Done | `useMicMixer.ts` (startMic/stopMic) |
| Mic device change handling | Done | watchers in useMicMixer |
| VB-CABLE auto-detection | Done | SettingsPage + constants |
| Cross-window audio state sync | Done | broadcastToWindows + store listeners |
| i18n (EN + IT) | Done | `src/i18n/` |
| Library CRUD + groups | Done | library store + electron handlers |
| Audio trimming (FFmpeg) | Done | `electron/library.ts` |

---

## Features Priority (All Free)

### Phase 1 — Must Have (Week 1-2)
| Feature | Effort | Cost |
|---|---|---|
| Bundle Virtual-Audio-Driver in installer | 1-2 weeks | Free (open source, pre-signed) |
| Auto-detect new virtual device | 2-3 hours | Free |
| Update i18n + warning banner | 1 hour | Free |
| VB-CABLE fallback (backward compat) | Already done | Free |

### Phase 2 — Should Have (Week 3-4)
| Feature | Effort | Cost |
|---|---|---|
| DynamicsCompressorNode | 2-3 hours | Free (Web Audio built-in) |
| dB logarithmic volume curve | 1-2 hours | Free |
| Latency indicator | 1 hour | Free |
| AudioContext `latencyHint: 'interactive'` | 30 min | Free |

### Phase 3 — Nice to Have (Week 5-6)
| Feature | Effort | Cost |
|---|---|---|
| RNNoise noise suppression | 1-2 days | Free (BSD license, WASM) |
| AudioBuffer pre-decoding | 1 day | Free |

### Phase 4 — Future (Week 7-8)
| Feature | Effort | Cost |
|---|---|---|
| AudioWorklet migration | 1-2 weeks | Free |
| RNNoise in AudioWorklet | 2-3 days extra | Free |

### Explicitly NOT Doing (From V3)
| Feature | Reason |
|---|---|
| Custom SysVAD kernel driver | Costs $280+/yr for EV cert |
| Native C++ NAPI bridge | Only needed for custom driver |
| Shared memory ring buffer | Only needed for custom driver |
| Ring buffer writer/reader | Only needed for custom driver |
| Driver INF/signing/WHQL | Only needed for custom driver |
| React + Zustand rewrite | SoundDome already uses Vue + Pinia |
| Tailwind CSS | SoundDome uses CSS custom properties |
| webpack config | SoundDome uses electron-vite |
| VAD (Voice Activity Detection) | Not essential for soundboard |
| Sidechain attenuation | Discord already does this |

---

## Technical Notes

### Why setSinkId() is Sufficient
V3 implies `setSinkId()` is a limitation needing a shared memory bypass. In reality:
- `setSinkId()` works perfectly in Electron/Chromium
- Routes to any audio output device, including virtual ones
- Latency is acceptable for soundboard playback (~5-10ms)
- The current dual-element approach (one for speakers, one for virtual mic) is correct
- A shared memory ring buffer would only save ~2-3ms — not worth the kernel driver complexity

### Virtual-Audio-Driver vs VB-CABLE — Differences
| Aspect | VB-CABLE | Virtual-Audio-Driver |
|---|---|---|
| Cost | Free (donationware) | Free (open source) |
| Signed | Yes (VB-Audio cert) | Yes (SignPath Foundation) |
| Bundleable | Needs license agreement | Open source — check license |
| Device name | "CABLE Input" | "Virtual Audio Device" |
| Sample rates | 44.1-96 kHz | 8-192 kHz |
| Channels | Stereo | Configurable |
| Maintenance | VB-Audio (commercial) | Community (open source) |

### Fallback Strategy
```
Priority order for virtual mic detection:
1. Virtual-Audio-Driver (bundled with installer)
2. VB-CABLE (if user already has it installed)
3. Any other virtual audio device (by heuristic name matching)
4. No virtual device → show warning banner with instructions
```

### Linux Support

Linux uses **PulseAudio/PipeWire module-null-sink** created at runtime — no kernel driver needed and no installer step required.

Implementation: `electron/virtual-audio-linux.ts` runs `pactl load-module module-null-sink sink_name=SoundDome` (PulseAudio) or the PipeWire equivalent at app startup, then unloads the module on app exit. The resulting virtual sink exposes a monitor source that Discord/Zoom can capture as a microphone input — the same conceptual model as VB-CABLE and Virtual-Audio-Driver on Windows.

Because PulseAudio/PipeWire are present on all mainstream Linux desktop distributions, this approach is zero-dependency and zero-cost on Linux, while the Windows path uses the bundled Virtual-Audio-Driver and the macOS path uses a similar approach with Core Audio virtual devices.

### Driver Installation UX
```
Install flow:
1. User runs SoundDome-Setup.exe
2. NSIS checks if virtual audio device already present
3. If not → silently installs bundled Virtual-Audio-Driver (needs admin elevation)
4. SoundDome launches → auto-detects virtual audio device
5. User selects "Virtual Audio Device" as mic in Discord
6. Done — zero manual steps

Uninstall flow:
1. User runs uninstaller
2. NSIS silently uninstalls Virtual-Audio-Driver
3. Removes SoundDome files + shortcuts
4. Clean
```

---

## Summary

**Total cost: $0**

| Phase | What | When | Cost |
|---|---|---|---|
| Phase 1 | Bundle free signed driver, eliminate VB-CABLE requirement | Week 1-2 | Free |
| Phase 2 | Compressor + dB curve + latency optimization | Week 3-4 | Free |
| Phase 3 | RNNoise noise suppression | Week 5-6 | Free |
| Phase 4 | AudioWorklet for lower latency | Week 7-8 | Free |

All tools and libraries used:
- Virtual-Audio-Driver: free, open source, pre-signed
- Web Audio API: free, built into Chromium/Electron
- DynamicsCompressorNode: free, built into Web Audio API
- @shiguredo/rnnoise-wasm: free, BSD license
- AudioWorklet: free, built into Web Audio API
- NSIS installer: free, open source
- electron-builder: free, open source

---

## Session TODO List

Use this checklist to track progress across coding sessions. Mark items `[x]` as you complete them. Start each session by reading this section to know where you left off.

### PHASE 1: Bundle Virtual Audio Driver

#### 1A — Research & Validation
- [ ] Check Virtual-Audio-Driver license (must allow bundling/redistribution)
- [ ] Download latest release from GitHub
- [ ] Install driver manually on your machine, verify devices appear in Sound Settings
- [ ] Test with SoundDome: go to Settings, select virtual speaker as Virtual Mic output
- [ ] Test with Discord: select virtual mic as input, play a sound, confirm it's heard
- [ ] Measure latency compared to VB-CABLE (should be similar)
- [ ] Identify exact installer executable name and silent install flags (`/S`, `/quiet`, etc.)
- [ ] Test silent uninstall command

#### 1B — Installer Integration
- [x] Create `build/driver/` directory, add driver installer files
- [x] Create `build/installer.nsh` with `customInstall` and `customUnInstall` macros
- [x] Update `electron-builder` config to include `extraResources` for driver files
- [x] Build installer (`npm run dist`), test on clean Windows VM or second machine
- [x] Verify driver installs during SoundDome setup
- [x] Verify driver uninstalls during SoundDome removal

#### 1C — Device Detection Update
- [ ] Add `VIRTUAL_AUDIO_DRIVER_KEYWORD` to `src/enums/constants.ts`
- [ ] Add `VIRTUAL_MIC_KEYWORDS` array combining VB-CABLE + new driver keywords
- [ ] Create `isVirtualAudioDevice()` helper in `src/composables/useDevices.ts`
- [ ] Update `enumerateInputDevices()` to filter out all virtual devices (not just VB-CABLE)
- [ ] Update `SettingsPage.vue` auto-detection logic to find either driver
- [ ] Update warning banner: "No virtual audio device detected" instead of "Install VB-CABLE"
- [ ] Update `src/i18n/en.ts` and `src/i18n/it.ts` with new messages
- [ ] Test: SoundDome with only Virtual-Audio-Driver (no VB-CABLE) → should auto-detect
- [ ] Test: SoundDome with only VB-CABLE → should still work (backward compat)
- [ ] Test: SoundDome with neither → warning banner shows

### PHASE 2: Audio Engine Improvements

#### 2A — Compressor
- [ ] Add `COMPRESSOR_PRESETS` to `src/enums/constants.ts`
- [ ] Add `DynamicsCompressorNode` in `useMicMixer.ts` (sbGain → compressor → destination)
- [ ] Add `enableCompressor` to config store with default `true`
- [ ] Add compressor toggle in `SettingsPage.vue`
- [ ] Test: play loud sound → should be compressed, no clipping
- [ ] Test: toggle off → sound passes through uncompressed

#### 2B — dB Volume Curve
- [ ] Create `src/utils/db.ts` with `dbToGain`, `gainToDb`, `sliderToDb`, `dbToSlider`
- [ ] Integrate dB curve into volume conversion (at audio layer, not UI)
- [ ] Test: slider at 50% should sound like ~half volume (not quarter)

#### 2C — Latency Optimization
- [ ] Change AudioContext to `latencyHint: 'interactive'` in `useMicMixer.ts`
- [ ] Add latency display in Settings (show `audioContext.baseLatency * 1000` ms)
- [ ] Verify no audio glitches after the change

#### 2D — AudioBuffer Pre-Decoding
- [ ] Add pre-decode cache (`Map<string, AudioBuffer>`) in `useAudio.ts`
- [ ] Pre-decode library items on load (or on first play, then cache)
- [ ] Use `AudioBufferSourceNode` for virtual mic path playback
- [ ] Keep `HTMLAudioElement` path for speaker output (needs `setSinkId()`)
- [ ] Test: first play should feel instant (no decode delay)

### PHASE 3: RNNoise Noise Suppression

#### 3A — Setup
- [ ] `npm install @shiguredo/rnnoise-wasm`
- [ ] Verify WASM file loads correctly in Electron renderer
- [ ] Create `src/audio/frame-accumulator.ts`
- [ ] Create `src/composables/useRNNoise.ts`

#### 3B — Integration
- [ ] Insert RNNoise between mic source and micGain in `useMicMixer.ts`
- [ ] Use `ScriptProcessorNode` (deprecated but works) as initial approach
- [ ] Add `enableNoiseSuppression` to config store (default `false`)
- [ ] Add toggle in `SettingsPage.vue`
- [ ] Test: enable NS → speak with fan/keyboard noise → noise should be reduced
- [ ] Test: disable NS → audio passes through unchanged
- [ ] Test: toggle while mic is active → no crash or audio glitch
- [ ] Measure CPU usage with NS on (should be < 2% additional)

### PHASE 4: AudioWorklet Migration

#### 4A — Worklet Setup
- [ ] Create `src/audio/main-processor.worklet.ts`
- [ ] Configure electron-vite to bundle worklet separately
- [ ] Create `src/composables/useAudioWorklet.ts`
- [ ] Register worklet in AudioContext
- [ ] Test: basic audio pass-through works via worklet

#### 4B — Migrate Processing
- [ ] Move gain control into worklet (MessagePort for SET_GAIN_DB)
- [ ] Add soft clipper in worklet
- [ ] Replace ScriptProcessorNode with worklet in mic chain
- [ ] Test: all existing audio functionality works as before

#### 4C — RNNoise in Worklet (Optional)
- [ ] Load RNNoise WASM inside worklet via `WebAssembly.instantiate`
- [ ] Set up SharedArrayBuffer if needed (COOP/COEP headers in Electron)
- [ ] Move frame accumulator + RNNoise processing into worklet
- [ ] Test: NS works from worklet thread
- [ ] If too complex → keep RNNoise on main thread (Phase 3 approach is fine)

### Session Notes

```
Last session date: 2026-03-11
Current phase: Phase 1B — installer integration DONE, but driver signing blocks device loading
Blocked on: Virtual Audio Driver .sys not loading on Windows 11 (error 52 — unsigned driver).
            nefconw integration works (device node created, driver installed on it),
            but Windows refuses to load the .sys because it's not attestation-signed by Microsoft.
Next step: Either:
  (a) Contact VirtualDrivers/Virtual-Audio-Driver author to get a properly Microsoft-signed release
  (b) Fork the driver, obtain EV cert (~$300/yr), submit to Microsoft Partner Center for attestation signing
      - Bonus: same EV cert also signs SoundDome.exe (removes SmartScreen "Unknown Publisher")
  (c) Park the feature and keep VB-CABLE as default (already signed, works everywhere)
  (d) Investigate if a newer GitHub release has valid signing
Note on alternatives investigated:
  - No user-mode API exists on Windows to create virtual audio endpoints (kernel driver is mandatory)
  - VB-CABLE cannot be bundled/redistributed/renamed (donationware license, needs VB-Audio permission)
  - Current approach (detect VB-CABLE + banner + link to vb-audio.com) is legally safe and works
Linux support: DONE — PulseAudio null sink works, tested in electron/virtual-audio-linux.ts
```

---

*Plan V4 — March 2026*
*Based on review of V3 Ultra + analysis of existing SoundDome codebase + market research*
*Constraint: zero cost throughout*
