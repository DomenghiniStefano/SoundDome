# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoundDome is a cross-platform desktop soundboard built with Electron + Vue 3 + TypeScript. It plays sounds from MyInstants or a local library, routing audio to speakers and/or a virtual microphone (VB-CABLE) for use in Discord/Zoom. Supports Ajazz AKP153E stream deck integration for hardware button control. Builds for Windows, macOS, and Linux (VB-CABLE required for virtual mic routing; `setSinkId()` required for device selection).

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Launch dev server with HMR
npm run build  # Production build
npm run dist   # Build + package Windows installer (NSIS) into release/
npm start      # Alias for npm run dev
npm run release              # Release: bump minor, merge to master, tag, push (pipeline builds)
npm run release -- patch     # Release: bump patch
npm run release -- major     # Release: bump major
```

## Release Process

Releases are automated via GitHub Actions (`.github/workflows/release.yml`). The pipeline builds for Windows, macOS, and Linux.

**To release from `develop`:** run `npm run release` (or `-- patch`/`-- major`). The script (`scripts/release.js`) creates a release branch, bumps the version, merges into `master`, tags, merges back to `develop`, and pushes. The tag push triggers the GitHub Actions pipeline.

**Pipeline architecture** (`.github/workflows/release.yml`):
- **Separate build jobs** per platform (`build-windows`, `build-macos`, `build-linux`) — each builds with `--publish never` and uploads artifacts
- **`publish` job** — downloads all artifacts, generates a release body with direct download links organized by platform, and creates the GitHub Release via `softprops/action-gh-release`
- Tags **without** `v` prefix (e.g. `0.8.0`), workflow matches `[0-9]+.[0-9]+.[0-9]+`
- If one platform fails, the others still build and publish (publish job requires at least one success)

**Build targets:**
- Windows: NSIS installer (`.exe`)
- macOS: DMG for both `arm64` and `x64`
- Linux: AppImage, `.deb` (Debian/Ubuntu), `.pacman` (Arch)

**Native modules** (`uiohook-napi`, `node-hid`, `sharp`, `koffi`):
- Must be listed in `rollupOptions.external` in `electron.vite.config.ts` (not bundled by Vite) — also includes non-native Node modules that use CJS or need fs access (`adm-zip`, `fluent-ffmpeg`, `ffmpeg-static`, `electron-log`, `electron-updater`)
- Must be in `asarUnpack` in `package.json` (extracted from asar archive at runtime)
- `npmRebuild: false` — all native modules ship N-API prebuilds, no compilation needed

## Architecture

Electron app with context isolation (main window + detachable widget). Built with **electron-vite** (Vite + Electron integration), **Vue 3** (Composition API + `<script setup>`), **Pinia** (state management), **Vue Router** (hash-based navigation).

### Directory Structure

```
electron/
  index.ts          — Main process entry: app.whenReady, registers all IPC handlers
  preload.ts        — Context bridge: window.api.* methods
  windows.ts        — Window creation (main + widget), system tray
  config.ts         — Config file read/write
  logger.ts         — electron-log configuration
  theme.ts          — Native theme handling
  library/          — Library file operations (modularized)
    core.ts, audio-ops.ts, backup-ops.ts, export-import.ts, unified-import.ts, image-ops.ts, helpers.ts
  hotkeys.ts        — Global hotkey registration (uiohook-napi)
  broadcast.ts      — broadcastToWindows() helper for multi-window IPC
  paths.ts          — Resolved paths for assets, preload, library
  updater.ts        — Auto-update via electron-updater (checks GitHub Releases, fails silently)
  virtual-audio-linux.ts   — PulseAudio/PipeWire null sink for Linux virtual mic
  virtual-audio-windows.ts — Windows virtual audio device detection (VB-CABLE)
  handlers/         — IPC handler registration, one file per domain
    config.ts, library.ts, window.ts, system.ts, streamdeck.ts, sync.ts
  streamdeck/       — Ajazz AKP153E stream deck integration
    constants.ts    — Device constants (VID/PID, grid size, image dimensions)
    device.ts       — USB HID communication (open, close, send images)
    display.ts      — Render key images (labels, icons, gauges) and push to device
    images.ts       — Image generation and caching (sharp-based)
    manager.ts      — High-level manager: connect, pages, folders, button actions
    mappings.ts     — Button mapping persistence (save/load page layouts)
    media-keys.ts   — Media key simulation (play/pause, volume, etc.)
    protocol.ts     — HID protocol: packet framing, image transfer commands
    system-info.ts  — System stats (CPU, RAM, GPU VRAM, disk, network, uptime)
src/
  audio/            — Audio processing modules
    rnnoise-processor.ts          — Main-thread API: loads WASM, creates AudioWorkletNode
    rnnoise-worklet-processor.js  — AudioWorklet: runs RNNoise WASM on audio thread
  main.ts           — Vue app entry: createApp, router, pinia
  App.vue           — Shell: sidebar + router-view
  env.d.ts          — Global TypeScript types (LibraryItem, ConfigData, ElectronAPI, etc.)
  components/       — Reusable UI components, organized by domain
    layout/         — App shell: AppSidebar, PageHeader, NowPlaying, TitleBar
    cards/          — Sound cards: SoundCard, VolumeModal, HotkeyModal
    edit/           — Edit sound page: VolumeSection, TrimSection, HotkeySection, BackupSection, ImageSection, GroupsSection
    library/        — GroupTabs (group pill tabs with CRUD)
    audio-editor/   — WaveformEditor (wavesurfer.js)
    settings/       — Settings page: SettingSection, SettingActionRow, DeviceSelect, VolumeSlider
                      StreamDeckSection, StreamDeckButtonModal (stream deck config UI)
    widget/         — WidgetGrid, WidgetCard, WidgetTitleBar (detachable widget window)
    ui/             — Generic primitives: AppIcon, SwitchToggle, ConfirmModal, ToastNotification, etc.
  directives/       — Custom Vue directives (tooltip.ts)
  utils/            — Pure utility functions (audio.ts, color.ts, db.ts, logger.ts, streamdeck.ts, time.ts)
  pages/            — Route pages
    BrowsePage, LibraryPage, EditSoundPage, SettingsPage, WidgetPage, StreamDeckPage, SplashPage
  composables/      — Shared logic
    useAudio.ts (playback + routing), useMicMixer.ts (mic passthrough via Web Audio API),
    useDebounce.ts, useDevices.ts, useDraggable.ts, useConfirmDialog.ts,
    useHotkeyCapture.ts, useHotkeyListener.ts, useUsedHotkeys.ts,
    useStreamDeckListener.ts (stream deck event handling in renderer)
  stores/           — Pinia stores
    config.ts (audio settings), library.ts (CRUD + export/import), browse.ts (MyInstants search),
    streamdeck.ts (stream deck page/button mappings, folders)
  enums/            — Constants and shared values (no magic numbers/strings)
    ipc.ts (shared between electron/ and src/), routes.ts, constants.ts, config-defaults.ts,
    api.ts, audio.ts, hotkeys.ts, icons.ts, library.ts, playback.ts, stores.ts, ui.ts,
    streamdeck.ts (action types, button types, folder constants)
  services/
    api.ts          — Typed wrapper for window.api (renderer → main process calls)
  i18n/
    index.ts, en.ts, it.ts — vue-i18n setup with English and Italian locales
  styles/
    variables.css, global.css
scripts/
  release.js        — Cross-platform release script (Node.js, replaces bash/git-flow)
```

### Key Architecture Patterns

**Multi-window**: Main window + detachable widget window. Both `LIBRARY_CHANGED` and `CONFIG_CHANGED` IPC events broadcast to other windows (excluding sender) to keep state in sync. Widget has its own route (`WidgetPage.vue`) loaded via hash router. Both stores (`library`, `config`) expose `startListening()` / `stopListening()` for cross-window sync.

**IPC flow**: Renderer calls `src/services/api.ts` → `window.api.*` (preload) → `ipcRenderer.invoke` → `ipcMain.handle` (in `electron/handlers/`). All IPC channels defined in `src/enums/ipc.ts` (shared between both processes).

**Global types**: Interfaces in `src/env.d.ts` (`LibraryItem`, `Group`, `ConfigData`, `ElectronAPI`, etc.) are globally available — no imports needed.

**Path alias**: `@` maps to `src/` (configured in `electron.vite.config.ts`). Use `@/components/...`, `@/stores/...`, etc.

### Audio Routing Model

Three audio channels, each with enable toggle + volume + device selection:
- **Soundboard → Virtual Mic** (`sendToVirtualMic`, `soundboardVolume`, `virtualMicDeviceId`) — sounds sent to VB-CABLE for Discord/Zoom
- **Soundboard → Speakers** (`sendToSpeakers`, `monitorVolume`, `speakerDeviceId`) — sounds heard locally
- **Mic Passthrough** (`enableMicPassthrough`, `micVolume`, `micDeviceId`) — real mic routed to VB-CABLE via Web Audio API

Each library item has its own `volume` (0-200, default 100) that multiplies with the channel volume.

Routing uses `HTMLAudioElement.setSinkId()` for direct output, or Web Audio API (`useMicMixer`) when mic passthrough is active on the virtual mic channel (mixes soundboard + mic into a single AudioContext destination).

**Noise suppression**: Optional RNNoise AI denoising on mic input. Runs entirely on the audio thread via `AudioWorkletNode` to avoid UI-caused audio gaps. WASM bytes are captured from `@shiguredo/rnnoise-wasm` on first use, sent to the worklet via `port.postMessage`, and compiled/instantiated independently in the worklet scope. Frame accumulation (128→480 samples) is inlined in the worklet processor.

**Test button**: Plays a test sound to speakers at `soundboardVolume` — lets the user hear the volume level others will receive. Never routes actual mic audio to headphones.

**Config migration**: `electron/config.ts` has `migrateConfig()` to rename legacy keys (e.g. `outputVolume` → `soundboardVolume` in v0.4).

### Stream Deck Integration

Supports the **Ajazz AKP153E** (15-key, 3×5 grid with LCD strip). Communication via USB HID (`node-hid`), image rendering via `sharp`.

**Architecture**: `manager.ts` is the entry point — connects to device, manages pages/folders, dispatches button presses. `device.ts` handles raw HID I/O. `display.ts` renders labeled key images. `images.ts` caches pre-rendered images per page. `protocol.ts` frames image data into HID packets.

**Button actions**: Play Sound, Keyboard Shortcut, Media Key, Launch App, System Stats (gauge), Folder (opens sub-grid), Page Navigation.

**Data model**: Multi-page layout with folders. Each page has a `buttons` array (15 slots). Folders contain their own button arrays. Mappings saved to `streamdeck-mappings.json` in userData. Custom button images stored as base64.

**Rendering**: Images pre-rendered on save/startup. Current page sent first for instant display, remaining pages cached in background. Batch flush sends all 15 keys at once for smooth updates.

### Data Storage

All in `app.getPath('userData')`:
- `config.json` — settings (toggles, device IDs, volumes)
- `library/index.json` — `{items, groups}` with items as `{id, name, filename, ...}` and groups as `{id, name, itemIds}`
- `library/*.mp3` — downloaded sound files
- `streamdeck-mappings.json` — stream deck page/button/folder layouts

### External Dependencies

- **VB-CABLE** (vb-audio.com/Cable) — virtual audio device for mic routing on Windows. App auto-detects it and shows a warning banner if missing.
- **PulseAudio/PipeWire** — Linux virtual mic via `module-null-sink`, created at runtime by `electron/virtual-audio-linux.ts`. No install needed.
- **MyInstants API** (`myinstants.com/api/v1/instants/`) — sound search/download.
- **FFmpeg** (`ffmpeg-static` + `fluent-ffmpeg`) — audio trimming in the main process. Binary bundled as `extraResources` per platform.

## Coding Conventions

### General
- Vue 3 Composition API with `<script setup lang="ts">`
- Pinia stores use setup syntax (function-based)
- IPC pattern: `ipcMain.handle` ↔ `ipcRenderer.invoke` (all async)
- No wildcard exports (`export *`); use explicit named exports
- CSS custom properties for theming, scoped styles in components
- UI text uses i18n (`vue-i18n`) with English and Italian locales

### Constants & Enums
- **No magic numbers or hardcoded strings** — all values live in `src/enums/`
- Enum pattern: `as const` objects + derived type, not TypeScript `enum` keyword
  ```ts
  export const MyEnum = { FOO: 'foo', BAR: 'bar' } as const;
  export type MyEnumValue = (typeof MyEnum)[keyof typeof MyEnum];
  ```
- IPC channel names: `IpcChannel.*` from `enums/ipc.ts` (shared between `electron/` and `src/`)
- Route paths/names: `RoutePath.*` / `RouteName.*` from `enums/routes.ts`
- Audio/volume constants: `VOLUME_DIVISOR`, `AUDIO_SAMPLE_RATE`, etc. from `enums/constants.ts`
- API URLs: `MYINSTANTS_API_URL`, `MYINSTANTS_BASE_URL` from `enums/api.ts`
- Exception: field name arrays (e.g. allowed update fields) stay inline, not extracted to constants

### Lodash
- Always `import _ from 'lodash'` and call `_.xxx()` — no granular imports
- Prefer lodash over verbose native patterns:
  - `_.find(arr, { id })` over `.find(i => i.id === id)`
  - `_.filter(arr, 'prop')` over `.filter(i => i.prop)`
  - `_.reject(arr, { id })` over `.filter(i => i.id !== id)`
  - `_.map(arr, 'prop')` over `.map(i => i.prop)`
  - `_.keyBy(arr, 'id')` over `new Map(arr.map(...))`
  - `_.compact(arr)` over `.filter(Boolean)`
  - `_.isEmpty(arr)` over `.length === 0`
  - `_.concat(a, b)` over `[...a, ...b]` for potentially large arrays
  - `_.clamp(val, min, max)` over `Math.max(min, Math.min(max, val))`
  - `_.clone(arr)` over `[...arr]` for shallow copy
  - Lodash chaining `_(arr).filter(...).map(...).value()` for filter+map chains
- OK to keep native `.length > 0` or `.splice()` for small local arrays where lodash adds no clarity

### HTTP
- **axios** for all HTTP requests (both main process and renderer)
- No native `http`/`https`/`fetch` — use `axios.get()`, `axios.post()`, etc.

### Arrays & Spreads
- **No spread** `[...bigArray1, ...bigArray2]` for potentially large arrays — use `_.concat()`
- Spread is OK for small, known-size arrays (e.g. function args, destructuring)
- Object spread `{ ...obj }` is fine

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If it goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution
- **Autonomous multiagent**: Launch parallel agents when the task involves independent work streams (e.g. backend + frontend, multiple file groups) without asking — just do it

### 3. Self-Improvement Loop
- After ANY correction from the user: update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management
- Plan First: Write plan to tasks/todo.md with checkable items
- Verify Plan: Check in before starting implementation
- Track Progress: Mark items complete as you go
- Explain Changes: High-level summary at each step
- Document Results: Add review section to tasks/todo.md
- Capture Lessons: Update tasks/lessons.md after corrections

## Testing

```bash
npm test                      # One-shot test run
npm run test:watch            # Watch mode
npx vitest run --coverage     # Coverage report
```

- Tests live in `tests/` directory, excluded from production builds (electron-vite only bundles `src/` and `electron/`)
- **Framework**: vitest + `@vitest/coverage-v8` (1,401 tests across 28 files)
- **Expected values first**: Derive expected values from the function's spec/contract, NOT from running the code. A failing test is a signal to investigate the code, not to silence by adjusting the expectation.

### Test Categories
- `tests/enums/` — Pure constants, enum values, helper functions (100% coverage)
- `tests/utils/` — Pure utility functions (dB math, volume curves — 100% coverage)
- `tests/stores/` — Pinia store logic with mocked API layer:
  - `library-store` — filteredItems (group/search/combined), slugSet, reorder, group CRUD, toggleFavorite
  - `browse-store` — search URL encoding, URL normalization, pagination, error handling
  - `config-store` — load/save/resetDefaults, startListening/stopListening (100% coverage)
  - `streamdeck-store` — page CRUD, button mapping, folder CRUD (removeFolder index cleanup), folder page/button CRUD, computed properties
- `tests/electron/` — Main process logic (hotkey parsing — 92% coverage) — mocks uiohook/broadcast
- `tests/streamdeck/` — Protocol, constants, mappings, display cache
- `tests/composables/` — useConfirmDialog (100% coverage), useDevices
- `tests/i18n/` — Locale key parity, interpolation params, pluralization (590 tests)

### Pinia store testing pattern
```ts
import { setActivePinia, createPinia } from 'pinia';
vi.mock('../../src/services/api', () => ({ /* mock all API calls */ }));
beforeEach(() => { setActivePinia(createPinia()); store = useMyStore(); });
```

### Mocking electron/ modules
- Modules using CJS `require('electron')` at top level (config.ts, library.ts) **cannot** be directly imported in vitest — `require('electron')` returns the binary path in Node, not Electron APIs
- To test electron/ modules: mock the entire module (`vi.mock('../../electron/config')`) and test indirectly
- Use `vi.hoisted()` for mock variables referenced in `vi.mock()` factories (because `vi.mock` is hoisted above variable declarations)
- IPC channel names use dashes, not colons (e.g., `hotkey-play` not `hotkey:play`)

## Core Principles
- Simplicity First: Make every change as small as possible. Minimal impact on code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Changes should only touch what is necessary. Avoid introducing bugs.
