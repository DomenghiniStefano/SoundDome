# Virtual Mic Dev Plan V4 — TODO

## PHASE 1: Bundle Virtual Audio Driver

### 1A — Research & Validation
- [x] Check Virtual-Audio-Driver license → **MIT**, can bundle freely
- [x] Identify installer format → **No EXE installer.** ZIP with .sys/.inf/.cat. Use `pnputil /add-driver VirtualAudioDriver.inf /install` (admin)
- [x] Confirm signing → **Yes**, SignPath Foundation, works on stock Windows
- [x] Identify device names → Speaker: `"Virtual Audio Driver by MTT"`, Mic: `"Virtual Mic Driver by MTT"`
- [ ] Manual testing: install driver, verify devices appear, test with SoundDome + Discord
- [ ] Measure latency compared to VB-CABLE

### 1B — Installer Integration
- [ ] Download release ZIP (`Virtual.Audio.Driver.Signed.-.25.7.14.zip`) and extract `.sys/.inf/.cat` to `build/driver/`
- [x] Create `build/installer.nsh` — `pnputil /add-driver` on install, PowerShell + `pnputil /delete-driver` on uninstall
- [x] Update electron-builder config: `extraResources` for driver files (win only), `nsis.include` for installer.nsh
- [x] Update `.gitignore` to exclude driver binaries from git
- [ ] Build + test installer on clean Windows (`npm run dist`)
- [ ] Verify driver installs silently during SoundDome setup (needs admin elevation)
- [ ] Verify driver uninstalls during SoundDome removal

### 1C — Device Detection Update
- [x] Add `VIRTUAL_MIC_KEYWORDS` to `src/enums/constants.ts`
- [x] Add exact device name keywords: `VIRTUAL_AUDIO_DRIVER_SPEAKER_KEYWORD`, `VIRTUAL_AUDIO_DRIVER_MIC_KEYWORD`
- [x] Create `isVirtualAudioDevice()` in `src/composables/useDevices.ts`
- [x] Update `enumerateInputDevices()` to filter all virtual devices
- [x] Update `SettingsPage.vue` auto-detection logic (`loadDevicesAndDetectVirtualMic`)
- [x] Update warning banner text (generalized, no VB-CABLE link)
- [x] Update i18n strings (en.ts + it.ts)
- [ ] Test backward compat with VB-CABLE
- [ ] Test with actual Virtual Audio Driver installed

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
Current phase: 1B code done, 1C done, 2A+2B+2C done (all code)
Build: ✅ passes (1004 tests green)
Research: ✅ MIT license, pnputil install, SignPath signed, device names confirmed
1B status: installer.nsh + package.json + .gitignore ready. User must download driver files to build/driver/
Next step: download driver → npm run dist → test installer on clean Windows
```
