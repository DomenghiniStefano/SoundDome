# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoundDome is a Windows desktop soundboard built with Electron. It plays sounds from MyInstants or a local library, routing audio to speakers and/or a virtual microphone (VB-CABLE) for use in Discord/Zoom. Windows-only (requires `setSinkId()` and VB-CABLE).

## Commands

```bash
npm install    # Install dependencies
npm start      # Launch Electron app (electron .)
```

No test framework, linter, or build pipeline is configured. `electron-builder` is a devDependency but has no build script yet.

## Architecture

Single-window Electron app with context isolation. Four source files:

- **main.js** — Main process. Window creation, IPC handlers for config persistence (JSON in `userData`), sound library management (MP3 files + `index.json` in `userData/library/`), library export/import (`.sounddome` ZIP via `adm-zip`), file downloads with redirect support.
- **preload.js** — Context bridge exposing `window.api.*` methods (config, library CRUD, export/import, openExternal).
- **renderer.js** — All frontend logic: sidebar navigation (Browse / My Library / Settings), MyInstants API search, audio playback with dual-routing (speakers + virtual mic), device enumeration, volume control, library UI.
- **index.html** — Markup + all CSS (dark theme, Spotify-inspired green `#1db954`). No external CSS/JS frameworks.

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

- Vanilla JS throughout, no module bundler or framework
- IPC pattern: `ipcMain.handle` ↔ `ipcRenderer.invoke` (all async)
- No wildcard exports (`export *`); use explicit named exports if modules are introduced
- UI text mixes English and Italian (MVP heritage)
