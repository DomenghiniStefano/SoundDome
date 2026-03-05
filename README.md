# SoundDome

A Windows desktop soundboard built with Electron, Vue 3, and TypeScript. Search and play sounds from [MyInstants](https://www.myinstants.com) or your local library, routing audio to your speakers and/or a virtual microphone for use in Discord, Zoom, and other voice apps.

## Features

- **Browse & search** sounds from MyInstants directly in-app
- **Local library** — download and organize your favorite sounds
- **Dual audio routing** — play to speakers and virtual mic simultaneously, with independent volume controls
- **Device selection** — choose specific output devices for speakers and virtual mic
- **Drag & drop reordering** of your library
- **Library export/import** — backup and restore your sound collection
- **System tray** support with auto-launch option
- **Internationalization** (i18n) support

## Prerequisites

- **Windows 10/11**
- **Node.js** >= 18
- **[VB-CABLE](https://vb-audio.com/Cable/)** — free virtual audio device used to route audio as a microphone input. The app auto-detects it and shows a warning if not installed.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Launch dev server with HMR |
| `npm run build` | Production build |
| `npm run dist` | Build + package Windows installer (NSIS) |
| `npm start` | Alias for `npm run dev` |

## How It Works

SoundDome uses `HTMLAudioElement.setSinkId()` to route audio to specific output devices:

- **Speakers** — your selected playback device, with its own volume slider
- **Virtual Mic** — a VB-CABLE device that acts as a microphone input in voice apps, with its own volume slider

This lets you hear the sound yourself while simultaneously broadcasting it through your mic in any voice chat.

## Tech Stack

- **Electron** — desktop app shell
- **electron-vite** — Vite integration for Electron
- **Vue 3** — UI framework (Composition API + `<script setup>`)
- **Pinia** — state management
- **Vue Router** — hash-based navigation
- **TypeScript** — type safety across main and renderer processes
- **Vue I18n** — internationalization
- **SortableJS** — drag & drop library reordering

## Project Structure

```
electron/
  index.ts          Main process: window, IPC, config/library persistence
  preload.ts        Context bridge (window.api)
src/
  components/       UI components organized by domain
    layout/         App shell (sidebar, header, now playing)
    cards/          Sound cards and volume modal
    settings/       Settings page components
    ui/             Generic primitives (icons, toggles, modals, toasts)
  pages/            Route pages (Browse, Library, Settings)
  composables/      Shared logic (audio playback, debounce)
  stores/           Pinia stores (config, library, browse)
  services/         Typed API wrapper for IPC
  styles/           CSS custom properties and global styles
```

## License

[MIT](LICENSE)
