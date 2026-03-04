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
    layout/      — App shell: AppSidebar, PageHeader, NowPlaying
    cards/       — Sound cards: SoundCard, VolumeModal
    settings/    — Settings page: SettingSection, SettingActionRow, SettingToggleRow, DeviceSelect, VolumeSlider
    ui/          — Generic primitives: AppIcon, SwitchToggle, ConfirmModal, ToastNotification, DropdownMenu, PlayButton, LoadMoreButton, InfoTooltip
  pages/         — Route pages
    BrowsePage.vue, LibraryPage.vue, SettingsPage.vue
  composables/   — Shared logic
    useAudio.ts (playback + routing), useDebounce.ts
  stores/        — Pinia stores
    config.ts (audio settings), library.ts (CRUD + export/import), browse.ts (MyInstants search)
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

- Vue 3 Composition API with `<script setup lang="ts">`
- Pinia stores use setup syntax (function-based)
- IPC pattern: `ipcMain.handle` ↔ `ipcRenderer.invoke` (all async)
- No wildcard exports (`export *`); use explicit named exports
- CSS custom properties for theming, scoped styles in components
- UI text mixes English and Italian (MVP heritage)
