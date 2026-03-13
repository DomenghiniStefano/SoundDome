# SoundDome Refactoring Audit

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Completed

---

## CRITICAL — God Objects

### 1. StreamDeckPage.vue (1,815 → 1,234 lines) ✅
- [x] Extract `useStreamDeckContext()` composable (shared refs, computeds, button info)
- [x] Extract `useStreamDeckDragDrop()` composable (~250 lines of drag logic)
- [x] Extract `useStreamDeckPages()` composable (page CRUD, tabs, renaming)
- [x] Extract `useStreamDeckFolders()` composable (folder CRUD, modal, icons)
- [x] Extract `useStreamDeckStats()` composable (stats polling interval)
- [x] Slim down StreamDeckPage to orchestrator only (script: 728→147 lines)

### 2. electron/library.ts (688 lines → 7 modules) ✅
- [x] Extract `electron/library/helpers.ts` (types, paths, I/O, utilities)
- [x] Extract `electron/library/core.ts` (sound + group CRUD)
- [x] Extract `electron/library/audio-ops.ts` (save, upload, trim, ffmpeg)
- [x] Extract `electron/library/backup-ops.ts` (backup operations)
- [x] Extract `electron/library/image-ops.ts` (set/remove image)
- [x] Extract `electron/library/export-import.ts` (library export/import)
- [x] Extract `electron/library/unified-import.ts` (multi-format import)
- [x] Barrel `electron/library/index.ts` — zero consumer changes

### 3. StreamDeckButtonModal.vue (791 → 742 lines) ✅
- [x] Extract `MEDIA_ACTION_MAP` to `src/enums/streamdeck.ts`
- [x] Extract `buildButtonMapping()` + `canSaveButtonMapping()` to `src/utils/streamdeck.ts`

---

## HIGH — Misplaced Responsibilities

### 4. useAudio.ts — Playback state belongs in a store — SKIPPED
- Playback state refs are already module-level singletons shared across all `useAudio()` calls
- Moving to Pinia store would add ceremony without changing behavior — not worth the churn

### 5. useMicMixer.ts (346 lines, 11 watchers) — Conservative cleanup ✅
- [x] Extract `applyCompressorPreset()` to `src/utils/audio.ts` (pure function)
- [x] Group 11 watchers by concern with section comments (volume, feature toggles, devices, audio engine)
- Skipped 3-composable split — file not big enough to warrant the overhead

### 6. useStreamDeckStore — Bare mutations without validation
- [x] Add validation to mutation functions (empty names, bounds checks)
- [x] Add auto-save after mutations (consistent with library store pattern)
- [x] Wrap mutations in proper action methods (setConnected, setCurrentPage)

### 7. useAudio.ts — Duplicated stop patterns ✅
- [x] Create `stopEverything()` that combines `stopAll()` + `stopPreview()`
- [x] Replace 5 internal + 2 external `stopAll(); stopPreview()` call sites
- [x] Extract `trySetSinkId()` to `src/utils/audio.ts` (replaces 3 duplicated try/catch blocks)

---

## MEDIUM — Duplication & Inconsistencies

### 8. SettingsAudio.vue — 3 identical device watchers
- [ ] Consolidate 3 `watch(() => config.*DeviceId)` into single watcher or computed
- [ ] Extract `useDeviceManager()` composable for device loading/syncing

### 9. streamdeck display ↔ manager circular coupling
- [ ] Decouple `display.ts` and `manager.ts` (currently import each other)
- [ ] Introduce event bus or mediator pattern

### 10. Switch statements → strategy pattern in streamdeck
- [ ] Extract `ButtonActionHandler` for `handleButtonPress()` (70-line switch)
- [ ] Extract `KeyImageRenderer` for `renderKeyImage()` (87-line switch)

### 11. handlers/library.ts — 20+ repetitive handler registrations
- [ ] Create handler composition utility for `safeHandle → op → broadcast → refresh` pattern

### 12. config.ts — Theme logic mixed with config
- [ ] Extract theme import/export/validation to `electron/config/theme-export.ts`

### 13. EditSoundPage.vue (659 lines)
- [ ] Use shared `useInlineEdit()` (from task 1)
- [ ] Extract `usePendingLibraryItem(item)` for pending state management
- [ ] Extract trim/test audio logic

### 14. SettingsTheme.vue (347 lines)
- [ ] Extract `useCustomThemes()` composable (theme CRUD, import/export)

---

## LOW — Minor Issues

### 15. useBrowseStore — Silent API failures
- [x] Add `error` ref exposed to UI
- [x] Show error feedback on failed searches

### 16. useStreamDeckListener — Direct store mutations
- [x] Replace `store.isConnected = true` with proper store actions

### 17. streamdeck/images.ts (478 lines)
- [ ] Split into focused renderer modules (icon, gauge, text)
- [ ] Extract SVG utilities (`svgWrap`, `escapeXml`)

---

## Review Checklist (post-refactoring)
- [ ] All tests pass (`npm test`)
- [ ] No new TypeScript errors
- [ ] No regressions in multi-window sync
- [ ] Stream deck still works end-to-end
- [ ] Audio routing unchanged
- [ ] No circular imports introduced
