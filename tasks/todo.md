# Virtual Mic Dev Plan V4 — TODO

## PHASE 1: Bundle Virtual Audio Driver

### 1A — Research & Validation
- [x] Check Virtual-Audio-Driver license → **MIT**, can bundle freely
- [x] Identify installer format → **No EXE installer.** ZIP with .sys/.inf/.cat. Use `pnputil /add-driver VirtualAudioDriver.inf /install` (admin)
- [x] Confirm signing → ⚠️ **Claims SignPath, but NOT recognized by Windows 11** (error 52: CM_PROB_UNSIGNED_DRIVER)
- [x] Identify device names → Speaker: `"Virtual Audio Driver by MTT"`, Mic: `"Virtual Mic Driver by MTT"`
- [x] Manual testing: install driver → device node created via nefconw, but driver won't load (unsigned)
- [ ] Measure latency compared to VB-CABLE (blocked — driver won't load)

### 1B — Installer Integration (PARKED — driver signing blocker)
- [x] Create `build/installer.nsh` — tested with nefconw (works), now disabled (empty macros)
- [x] Update electron-builder config: `nsis.include`, `perMachine`
- [x] Update `.gitignore` to exclude driver binaries from git
- [x] Build + test installer on Windows (`npm run dist`) — builds OK
- [x] Tested nefconw install: device node created, driver installed, but Windows refuses to load unsigned .sys
- ❌ Driver signing blocker: needs EV cert (~$300/yr) + Microsoft attestation signing
- Driver files kept in `build/driver/` for future use, NOT bundled in installer

### 1C — Device Detection Update
- [x] Add `VIRTUAL_MIC_KEYWORDS` to `src/enums/constants.ts`
- [x] Add exact device name keywords: `VIRTUAL_AUDIO_DRIVER_SPEAKER_KEYWORD`, `VIRTUAL_AUDIO_DRIVER_MIC_KEYWORD`
- [x] Add Linux null sink keywords: `LINUX_NULL_SINK_OUTPUT_KEYWORD`, `LINUX_NULL_SINK_MONITOR_KEYWORD`
- [x] Create `isVirtualAudioDevice()` in `src/composables/useDevices.ts`
- [x] Update `enumerateInputDevices()` to filter all virtual devices
- [x] Update `SettingsPage.vue` auto-detection logic (`loadDevicesAndDetectVirtualMic`)
- [x] Update warning banner text (covers Windows + Linux)
- [x] Update i18n strings (en.ts + it.ts)
- [ ] Test backward compat with VB-CABLE
- [ ] Test with actual Virtual Audio Driver installed (blocked — driver unsigned)

### 1D — Linux Virtual Audio (DONE)
- [x] Create `electron/virtual-audio-linux.ts` — PulseAudio/PipeWire null sink
- [x] Wire lifecycle in `electron/index.ts` (load before createWindow, unload on before-quit)
- [x] Add Linux keywords to `VIRTUAL_MIC_KEYWORDS` and `VIRTUAL_DEVICE_FILTER_KEYWORDS`
- [x] Update i18n messages for Linux
- [x] Write tests (8 tests pass): no-op on Win/Mac, skip without pactl, load/reuse/unload
- [ ] Test on actual Linux machine with PulseAudio/PipeWire

---

## PHASE 2: Audio Engine Improvements

### 2A — Compressor
- [x] Add `COMPRESSOR_PRESETS` to `src/enums/constants.ts`
- [x] Add `DynamicsCompressorNode` in `useMicMixer.ts` (sbGain → compressor → destination)
- [x] Bypass via ratio=1 when disabled, preset ratio when enabled
- [x] Add `enableCompressor` to config store + defaults (default: true)
- [x] Add compressor toggle in `SettingsPage.vue`
- [x] Add i18n strings for compressor (EN + IT)
- [ ] Test: play loud sound → should be compressed, no clipping
- [ ] Test: toggle off → sound passes through uncompressed

### 2B — dB Volume Curve
- [x] Create `src/utils/db.ts` with `dbToGain`, `gainToDb`, `sliderToDb`, `dbToSlider`, `sliderToGain`
- [x] Integrate dB curve into `useMicMixer.ts` (GainNode initial values + rampGain)
- [x] Integrate dB curve into `useAudio.ts` (HTMLAudioElement.volume for all channels)
- [x] Keep item volume (0-200) as linear multiplier
- [ ] Test perceived volume linearity

### 2C — Latency Optimization
- [x] Change AudioContext to `latencyHint: 'interactive'`
- [x] Add latency display in Settings page
- [x] Add i18n strings for latency display (EN + IT)
- [ ] Verify no audio glitches after the change

### 2D — AudioBuffer Pre-Decoding
- [ ] Add pre-decode cache in `useAudio.ts`
- [ ] Use `AudioBufferSourceNode` for virtual mic path
- [ ] Keep `HTMLAudioElement` for speaker output
- [ ] Test instant playback

---

## PHASE 3: RNNoise Noise Suppression
- [ ] Install `@shiguredo/rnnoise-wasm`
- [ ] Create `src/audio/frame-accumulator.ts`
- [ ] Create `src/composables/useRNNoise.ts`
- [ ] Integrate into `useMicMixer.ts` with ScriptProcessorNode
- [ ] Add `enableNoiseSuppression` to config + UI toggle
- [ ] Test noise reduction quality + CPU impact

---

## PHASE 4: AudioWorklet Migration
- [ ] Create worklet processor file
- [ ] Configure electron-vite for worklet bundling
- [ ] Migrate gain + soft clipper to worklet
- [ ] Optionally move RNNoise into worklet

---

## Progress Notes

```
Started: 2026-03-09
Current phase: 1B parked (driver unsigned), 1C done, 1D done (Linux), 2A+2B+2C done
Build: ✅ passes (1028 tests green)
Windows driver: ❌ BLOCKED — unsigned driver error 52. nefconw works but .sys not loaded.
  Options: (a) get driver signed, (b) buy EV cert ~$300/yr, (c) keep VB-CABLE
Linux audio: ✅ DONE — PulseAudio null sink at runtime, no driver needed
VB-CABLE: remains the working virtual audio solution on Windows
```
