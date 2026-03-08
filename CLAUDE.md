# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoundDome is a Windows desktop soundboard built with Electron + Vue 3 + TypeScript. It plays sounds from MyInstants or a local library, routing audio to speakers and/or a virtual microphone (VB-CABLE) for use in Discord/Zoom. Windows-only (requires `setSinkId()` and VB-CABLE).

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Launch dev server with HMR
npm run build  # Production build
npm run dist   # Build + package Windows installer (NSIS) into release/
npm start      # Alias for npm run dev
```

## Architecture

Electron app with context isolation (main window + detachable widget). Built with **electron-vite** (Vite + Electron integration), **Vue 3** (Composition API + `<script setup>`), **Pinia** (state management), **Vue Router** (hash-based navigation).

### Directory Structure

```
electron/
  index.ts          — Main process entry: app.whenReady, registers all IPC handlers
  preload.ts        — Context bridge: window.api.* methods
  windows.ts        — Window creation (main + widget), system tray
  config.ts         — Config file read/write
  library.ts        — Library file operations (CRUD, trim, backup, export/import)
  hotkeys.ts        — Global hotkey registration (uiohook-napi)
  broadcast.ts      — broadcastToWindows() helper for multi-window IPC
  paths.ts          — Resolved paths for assets, preload, library
  handlers/         — IPC handler registration, one file per domain
    config.ts, library.ts, window.ts, system.ts
src/
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
    widget/         — WidgetGrid, WidgetCard, WidgetTitleBar (detachable widget window)
    ui/             — Generic primitives: AppIcon, SwitchToggle, ConfirmModal, ToastNotification, etc.
  pages/            — Route pages
    BrowsePage, LibraryPage, EditSoundPage, SettingsPage, WidgetPage
  composables/      — Shared logic
    useAudio.ts (playback + routing), useMicMixer.ts (mic passthrough via Web Audio API),
    useDebounce.ts, useDevices.ts, useDraggable.ts, useConfirmDialog.ts,
    useHotkeyCapture.ts, useHotkeyListener.ts, useUsedHotkeys.ts
  stores/           — Pinia stores
    config.ts (audio settings), library.ts (CRUD + export/import), browse.ts (MyInstants search)
  enums/            — Constants and shared values (no magic numbers/strings)
    ipc.ts (shared between electron/ and src/), routes.ts, constants.ts, config-defaults.ts,
    api.ts, audio.ts, hotkeys.ts, icons.ts, library.ts, playback.ts, stores.ts, ui.ts
  services/
    api.ts          — Typed wrapper for window.api (renderer → main process calls)
  i18n/
    index.ts, en.ts, it.ts — vue-i18n setup with English and Italian locales
  styles/
    variables.css, global.css
```

### Key Architecture Patterns

**Multi-window**: Main window + detachable widget window. Both `LIBRARY_CHANGED` and `CONFIG_CHANGED` IPC events broadcast to other windows (excluding sender) to keep state in sync. Widget has its own route (`WidgetPage.vue`) loaded via hash router. Both stores (`library`, `config`) expose `startListening()` / `stopListening()` for cross-window sync.

**IPC flow**: Renderer calls `src/services/api.ts` → `window.api.*` (preload) → `ipcRenderer.invoke` → `ipcMain.handle` (in `electron/handlers/`). All IPC channels defined in `src/enums/ipc.ts` (shared between both processes).

**Global types**: Interfaces in `src/env.d.ts` (`LibraryItem`, `Group`, `ConfigData`, `ElectronAPI`, etc.) are globally available — no imports needed.

**Path alias**: `@` maps to `src/` (configured in `electron.vite.config.ts`). Use `@/components/...`, `@/stores/...`, etc.

### Audio Routing Model

Two independent audio outputs, each with its own volume:
- **Speakers** → `speakerDevice` at `monitorVolume`
- **Virtual Mic** → `virtualMicDevice` at `outputVolume`

Routing uses `HTMLAudioElement.setSinkId()` to target specific output devices.

### Data Storage

All in `app.getPath('userData')`:
- `config.json` — settings (toggles, device IDs, volumes)
- `library/index.json` — `{items, groups}` with items as `{id, name, filename, ...}` and groups as `{id, name, itemIds}`
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

## Core Principles
- Simplicity First: Make every change as small as possible. Minimal impact on code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Changes should only touch what is necessary. Avoid introducing bugs.
