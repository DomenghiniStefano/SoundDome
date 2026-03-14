# Components Refactor

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Completed
- SKIP — Intentionally skipped (reason noted)

---

## TIER 1 — Critical (God components / 250+ script lines)

### 1. WaveformEditor.vue (489 script lines) — Full Rewrite Plan

The component works but has grown organically. 489 lines of tightly coupled logic mixing
WaveSurfer lifecycle, drag interaction, auto-scroll with RAF, zoom, region sync, and
mouse tracking — all in a single flat script with 10+ mutable `let` variables.

#### Current Problems
- **10 mutable `let` vars** at module scope (`draggingSide`, `scrollRaf`, `inHotZone`, `lastMouseX`, `prevMouseX`, `freshMouse`, `origOnMove`, `origOnResize`, `zoomBeforeDrag`, `wavesurfer`, `regionsPlugin`, `activeRegion`) — hard to reason about state
- **Auto-scroll `tick()` function is 120 lines** (lines 150-271) with deeply nested conditionals — hot zone detection, scroll direction, speed calculation, region manipulation, and exit-hot-zone snapping all in one function
- **Region input blocking hack** — monkey-patches `activeRegion.onMove`/`onResize` to `() => {}` during auto-scroll, then restores originals. Fragile if WaveSurfer internals change
- **Shadow DOM access** — `getScrollEl()` digs into WaveSurfer's shadow DOM (`querySelector('div')?.shadowRoot?.querySelector('.scroll')`) — breaks on WaveSurfer updates
- **No cleanup guard** — if component unmounts during a drag, `pointermove` listener and RAF may leak
- **Zoom-on-drag** logic (lines 390-407) zooms out when dragging a region so it fits in viewport — clever but buried inside the `update` handler, making it invisible
- **`injectShadowStyles()`** appends a `<style>` tag into WaveSurfer's shadow DOM — works but creates a new style element every time `initWavesurfer()` runs without removing the old one

#### Refactoring Plan

**Step 1 — Extract `useWaveformAutoScroll` composable**
Move the entire auto-scroll system out:
- `startAutoScroll()`, `stopAutoScroll()`, `tick()` RAF loop
- `onMouseTrack()` pointer tracking
- `blockRegionInput()` / `restoreRegionInput()` hacks
- All related state: `scrollRaf`, `inHotZone`, `lastMouseX`, `prevMouseX`, `freshMouse`, `draggingSide`, `origOnMove`, `origOnResize`
- Input: `{ activeRegion, duration, getScrollEl, minDuration }` refs/getters
- Output: `{ startAutoScroll, stopAutoScroll, draggingSide }` + emits region updates
- **Bonus**: Break the 120-line `tick()` into `calculateScrollDirection()`, `applyScroll()`, and `snapToMouse()` helpers

**Step 2 — Extract `useWaveformZoom` composable**
- `onWheel()` handler
- `zoomLevel` ref
- Zoom-on-drag logic (currently in the `update` handler)
- `zoomBeforeDrag` state
- Input: `{ wavesurfer, duration, getScrollEl }`
- Output: `{ zoomLevel, onWheel, zoomOutForDrag, restoreZoom }`

**Step 3 — Extract `useWaveformRegion` composable**
- Region creation, sync, and time management
- `startTime`, `endTime`, `duration` refs
- `syncRegion()`, `onStartChange()`, `onEndChange()`, `emitSelection()`, `setSelection()`
- `formatTime()` / `parseTime()` / `roundToHundredths()` → move to `src/utils/time.ts`
- Input: `{ regionsPlugin, wavesurfer, minDuration }`
- Output: `{ startTime, endTime, duration, setSelection, onStartChange, onEndChange }`

**Step 4 — Clean up WaveformEditor.vue as orchestrator**
- Should be ~80-100 lines: props, WaveSurfer create/destroy, wire composables together
- `initWavesurfer()` creates instance, passes it to composables
- Template + styles stay unchanged
- `defineExpose` delegates to region composable

**Step 5 — Bug fixes during refactor**
- [ ] Add cleanup guard: if component unmounts during drag, ensure `pointermove` removed and RAF cancelled
- [ ] Prevent duplicate `<style>` injection in shadow DOM (track injected flag or remove old)
- [ ] Guard against `getScrollEl()` returning null more defensively in tick loop
- [ ] Add `pointer-events: none` on waveform during auto-scroll instead of monkey-patching region internals
- [ ] Consider using `wavesurfer.js` scroll API instead of direct shadow DOM access if available

**Expected result**: WaveformEditor.vue ~80 lines, 3 composables ~100-120 lines each, 1 utility file ~20 lines. Total code roughly the same but each piece testable and understandable independently.

---

### 2. useMicMixer.ts (341 lines, 27 watchers)
- [ ] Extract `useMicCapture()` — mic stream acquisition, device switching, error handling
- [ ] Extract `useMonitorOutput()` — monitor AudioContext, speaker routing, volume control
- [ ] Extract `useAudioContextPool()` — shared context lifecycle (create/resume/close)
- [ ] Keep `useMicMixer.ts` as orchestrator wiring the 3 composables together
- [ ] Move 14 module-level `let`/`ref` vars into composable-scoped state

### 3. useStreamDeckDragDrop.ts (267 lines)
- [ ] Merge `onDrop()` (104 lines) and `onFolderModalDrop()` into shared `applyDrop(source, target)` helper
- [ ] Extract drag state into single reactive object instead of 5 separate refs
- [ ] Reduce nesting depth in drop logic (4+ levels → 2 max with early returns)

### 4. StreamDeckButtonModal.vue (201 script + 742 total)
- [ ] Extract per-action-type template sections into sub-components (`SoundActionFields`, `StatActionFields`, `ShortcutActionFields`, `AppActionFields`, `FolderActionFields`)
- [ ] Use `<component :is="">` pattern for dynamic action type rendering
- [ ] Keep modal shell + shared save/cancel logic in parent

### 5. StreamDeckSection.vue (239 script) — Duplicates StreamDeckPage
- [ ] Identify shared logic with StreamDeckPage (page CRUD, folder management, button mapping)
- [ ] Extract shared composables that both can use (some already exist but aren't used here)
- [ ] Remove duplicated state management

---

## TIER 2 — Significant (150-250 lines, mixed concerns)

### 6. LibraryPage.vue (232 script)
- [ ] Extract `useLibraryReordering()` — drag-reorder logic with sortable
- [ ] Extract group CRUD UI logic (confirm dialogs, toast) from page into composable

### 7. useAudio.ts (258 lines)
- [ ] Consolidate duplicated volume/playback logic between `useAudio` and `useTestAudio`
- [ ] Extract `playRouted()` (60 lines) into smaller focused functions
- [ ] Consider moving module-level playback state to a lightweight Pinia store

### 8. useStreamDeckContext.ts (213 lines, returns 35 properties)
- [ ] Extract `getButtonInfoFrom()` (65-line switch) into `src/utils/streamdeck.ts`
- [ ] Reduce returned properties — split into focused composables if consumers only need subsets

### 9. color.ts (256 lines — two unrelated concerns)
- [ ] Split into `colorMath.ts` (hex↔rgb↔hsv conversions) and `themeVariables.ts` (CSS var generation)
- [ ] Extract `CUSTOM_THEME_VARS` array and `buildCustomThemeVars()` hard-coded keys into constants

### 10. electron/streamdeck/display.ts (342 lines)
- [ ] De-duplicate `refreshAllKeys()` and `refreshStatKeys()` (~80% shared logic)
- [ ] Extract image caching logic from rendering orchestration

### 11. electron/streamdeck/manager.ts (252 lines)
- [ ] Extract `handleButtonPress()` (60 lines, 11-case switch) into `button-handler.ts`
- [ ] Separate device connection/polling from action dispatch

### 12. electron/windows.ts (243 lines)
- [ ] Extract shared window creation logic — `createWindow()` and `createWidgetWindow()` are 95% identical
- [ ] Create `createBaseWindow(options)` factory, specialize per window type

---

## TIER 3 — Minor / Nice-to-Have

### 13. library store (274 lines)
- [ ] Consider splitting display state (group/search/filter) from CRUD operations

### 14. api.ts service (351 lines)
- [ ] Add section comments grouping methods by domain (config, library, window, streamdeck, system)

### 15. electron/streamdeck/system-info.ts (196 lines)
- [ ] Encapsulate 10+ module-level cache variables into a state object or class

---

## Cross-Cutting Patterns to Address

### Duplicated Logic
- [ ] Device enumeration + label syncing repeated in multiple components
- [ ] Update listener registration duplicated between SplashPage and SettingsApp
- [ ] Volume-to-gain conversion duplicated between useAudio and useTestAudio

### Module-Level Mutable State
- [ ] useMicMixer: 14 module-level refs/lets → should be composable-scoped
- [ ] useAudio: 12 module-level refs → consider lightweight store
- [ ] These are singletons by design (one audio engine) but make testing impossible

---

## Progress Notes

```
Created: 2026-03-14
Source: Full codebase audit by 3 parallel agents (Vue components, electron modules, composables/stores)
Previous audit: tasks/refactoring-audit.md (completed — focused on god objects and misplaced responsibilities)
This audit: focuses on remaining quality gaps and component-level improvements
```
