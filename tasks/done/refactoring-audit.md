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

### 8. SettingsAudio.vue — 3 identical device watchers — SKIPPED
- Each watcher is 3 lines, already uses `syncDeviceLabel()` helper
- Only difference is which device list (output vs input) and which label field
- Consolidating would add complexity for no real gain

### 9. streamdeck display ↔ manager circular coupling ✅
- [x] Extract `electron/streamdeck/state.ts` — shared device/navigation state module
- [x] `display.ts` imports state from `./state` instead of `./manager` (breaks circular dep)
- [x] `manager.ts` imports state from `./state`, re-exports getters for external consumers

### 10. Switch statements → strategy pattern in streamdeck — SKIPPED
- Both switches are readable, each case is 2-4 lines, total ~70 lines
- A strategy map would add abstraction without improving clarity

### 11. handlers/library.ts — 20+ repetitive handler registrations ✅ (already done)
- `safeHandleWithSync()` wrapper already exists in `electron/handlers/sync.ts`

### 12. config.ts — Theme logic mixed with config ✅ (already done)
- `electron/theme.ts` already exists with `pickThemeFields()`, `hasRequiredThemeColors()`, `exportTheme()`, `importThemes()`

### 13. EditSoundPage.vue (659 → 540 lines) ✅
- [x] Extract `usePendingLibraryItem()` composable (pending state + file loading)
- [x] Extract `useTestAudio()` composable (test playback logic)
- Skipped `useInlineEdit()` — only ~15 lines, no reuse elsewhere

### 14. SettingsTheme.vue ✅ (already done)
- `src/composables/useCustomThemes.ts` already exists with all theme CRUD, import/export logic extracted

---

## LOW — Minor Issues

### 15. useBrowseStore — Silent API failures
- [x] Add `error` ref exposed to UI
- [x] Show error feedback on failed searches

### 16. useStreamDeckListener — Direct store mutations
- [x] Replace `store.isConnected = true` with proper store actions

### 17. streamdeck/images.ts (478 → 3 modules) ✅
- [x] Extract `images-gauges.ts` (gauge rendering, stat images, info display)
- [x] Extract `images-controls.ts` (media, page nav, folder, shortcut, launch app)
- [x] Core `images.ts` keeps utilities + icon/sound/text/emoji (exports shared helpers)

---

## Review Checklist (post-refactoring)
- [ ] All tests pass (`npm test`)
- [ ] No new TypeScript errors
- [ ] No regressions in multi-window sync
- [ ] Stream deck still works end-to-end
- [ ] Audio routing unchanged
- [ ] No circular imports introduced
