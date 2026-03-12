# SoundDome Refactoring Audit

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Completed

---

## CRITICAL — God Objects

### 1. StreamDeckPage.vue (1,815 lines → ~500 target)
- [ ] Extract `useStreamDeckDragDrop()` composable (~150 lines of drag logic)
- [ ] Extract `useStreamDeckPages()` composable (page CRUD, tabs, renaming)
- [ ] Extract `useStreamDeckFolderModal()` composable (folder modal state)
- [ ] Extract `useStreamDeckStats()` composable (stats polling interval)
- [ ] Extract `useInlineEdit()` composable (reusable across EditSoundPage too)
- [ ] Slim down StreamDeckPage to orchestrator only

### 2. electron/library.ts (688 lines → ~300 target)
- [ ] Extract `electron/library/backups.ts` (backup operations)
- [ ] Extract `electron/library/import-export.ts` (import inspect + execute)
- [ ] Extract `electron/library/groups.ts` (group CRUD)
- [ ] Keep core CRUD in `library.ts`

### 3. StreamDeckButtonModal.vue (791 lines → ~400 target)
- [ ] Move mapping/action logic to store methods
- [ ] Keep modal as dumb UI only

---

## HIGH — Misplaced Responsibilities

### 4. useAudio.ts — Playback state belongs in a store
- [ ] Create `usePlaybackStore` with `playingCardId`, `playingName`, `previewingCardId`
- [ ] Move IPC sync logic (`startPlaybackSync`, `_suppressNotify`) to store
- [ ] Simplify useAudio to orchestrate playback only

### 5. useMicMixer.ts (346 lines, 11 watchers → split into 3)
- [ ] Extract `useAudioCompressor()` (compressor preset + noise suppression)
- [ ] Extract `useAudioContextManager()` (dual AudioContext lifecycle)
- [ ] Slim `useMicMixer` to mic input + passthrough only
- [ ] Fix watcher cleanup (module-level `initialized` flag leak)

### 6. useStreamDeckStore — Bare mutations without validation
- [x] Add validation to mutation functions (empty names, bounds checks)
- [x] Add auto-save after mutations (consistent with library store pattern)
- [x] Wrap mutations in proper action methods (setConnected, setCurrentPage)

### 7. useAudio.ts — Duplicated stop patterns
- [ ] Create `stopEverything()` that stops playback + test + preview
- [ ] Replace all 4+ `stopAll(); stopPreview()` call sites
- [ ] Extract `trySetSinkId()` helper (setSinkId error handling duplicated 3x)

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
