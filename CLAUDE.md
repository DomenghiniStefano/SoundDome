# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoundDome is a Windows desktop soundboard built with Electron + Vue 3 + TypeScript. It plays sounds from MyInstants or a local library, routing audio to speakers and/or a virtual microphone (VB-CABLE) for use in Discord/Zoom. Windows-only (requires `setSinkId()` and VB-CABLE).

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Launch dev server with HMR
npm run build  # Production build
npm start      # Alias for npm run dev
```

## Architecture

Single-window Electron app with context isolation. Built with **electron-vite** (Vite + Electron integration), **Vue 3** (Composition API + `<script setup>`), **Pinia** (state management), **Vue Router** (hash-based navigation).

### Directory Structure

```
electron/
  index.ts       — Main process: window, IPC handlers, config/library persistence, downloads
  preload.ts     — Context bridge: window.api.* methods
src/
  main.ts        — Vue app entry: createApp, router, pinia
  App.vue        — Shell: sidebar + router-view
  env.d.ts       — TypeScript types for window.api
  components/    — Reusable UI components, organized by domain
    layout/      — App shell: AppSidebar, PageHeader, NowPlaying, TitleBar
    cards/       — Sound cards: SoundCard, VolumeModal, HotkeyModal
    edit/        — Edit sound page: VolumeSection, TrimSection, HotkeySection, BackupSection
    audio-editor/ — WaveformEditor
    settings/    — Settings page: SettingSection, SettingActionRow, DeviceSelect, VolumeSlider
    ui/          — Generic primitives: AppIcon, SwitchToggle, ConfirmModal, ToastNotification, DropdownMenu, PlayButton, LoadMoreButton, InfoTooltip
  pages/         — Route pages
    BrowsePage.vue, LibraryPage.vue, EditSoundPage.vue, SettingsPage.vue, WidgetPage.vue
  composables/   — Shared logic
    useAudio.ts (playback + routing), useMicMixer.ts (mic passthrough), useDebounce.ts
  stores/        — Pinia stores
    config.ts (audio settings), library.ts (CRUD + export/import), browse.ts (MyInstants search)
  enums/         — Constants and shared values (no magic numbers/strings)
    api.ts, audio.ts, constants.ts, hotkeys.ts, ipc.ts, library.ts, playback.ts, routes.ts, ui.ts
  services/
    api.ts       — Typed wrapper for window.api
  styles/
    variables.css (CSS custom properties), global.css (reset + base styles)
index.html       — Vite entry HTML
electron.vite.config.ts
```

### Audio Routing Model

Two independent audio outputs, each with its own volume:
- **Speakers** → `speakerDevice` at `monitorVolume`
- **Virtual Mic** → `virtualMicDevice` at `outputVolume`

Routing uses `HTMLAudioElement.setSinkId()` to target specific output devices.

### Data Storage

All in `app.getPath('userData')`:
- `config.json` — settings (toggles, device IDs, volumes)
- `library/index.json` — array of `{id, name, filename}`
- `library/*.mp3` — downloaded sound files

### External Dependencies

- **VB-CABLE** (vb-audio.com/Cable) — virtual audio device for mic routing. App auto-detects it and shows a warning banner if missing.
- **MyInstants API** (`myinstants.com/api/v1/instants/`) — sound search/download.

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
