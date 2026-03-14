# Theme System — Refactor & Implementation Plan

## Obiettivo
Introdurre un sistema di temi (dark/light) in SoundDome, ristrutturando i colori con un'architettura a 3 livelli (palette → token semantici → componenti) e aggiungendo un selettore tema nelle impostazioni.

---

## Fase 1 — Architettura colori (palette + token semantici)

- [x] **1.1** Creare `src/styles/colors.css` — palette primitiva con scale colore
- [x] **1.2** Creare `src/styles/themes/dark.css` — token semantici per tema dark
- [x] **1.3** Creare `src/styles/themes/light.css` — token semantici per tema light
- [x] **1.4** Aggiornare `src/styles/variables.css` — rimuovere variabili colore, tenere solo spacing/radius/font
- [x] **1.5** Aggiornare `src/styles/global.css` — importare colors.css + tema di default, usare token semantici

## Fase 2 — Migrazione componenti

- [x] **2.1** Hex hardcoded → token semantici (~48 file migrati)
- [x] **2.2** rgba() hardcoded → token semantici
- [x] **2.3** Fallback nei var() → rimossi
- [x] **2.4** StreamDeckPage cleanup (~30 colori → token `--sd-*`, `--danger-color` eliminato)
- [x] **2.5** WaveformEditor → colori wavesurfer via getComputedStyle

## Fase 3 — Fix SVG e icone

- [x] **3.1** PlayButton.vue — `#000` → `var(--text-on-accent)`, `#fff` → `var(--text-inverse)`, `#c62828` → `var(--btn-danger-bg)`
- [x] **3.2** WidgetCard.vue — `#c62828` → `var(--color-error)`
- [x] **3.3** NowPlaying.vue — `#fff` → `var(--text-inverse)`, `#c62828` → `var(--btn-danger-bg)`
- [x] **3.4** TitleBar.vue / WidgetTitleBar.vue — `#e81123` → `var(--titlebar-close-bg)`
- [ ] **3.5** Verificare tutti gli `<AppIcon>` per contrasto con entrambi i temi
- [x] **3.6** LoadMoreButton.vue — `#aaa` → `var(--text-secondary)`

## Fase 4 — Config & UI

- [ ] **4.1** Aggiungere `theme: 'dark' | 'light' | 'system'` a `ConfigData` (`src/env.d.ts`)
- [ ] **4.2** Aggiungere default `theme: 'dark'` in `config-defaults.ts`
- [ ] **4.3** Config store — applicare `data-theme` attribute su `document.documentElement` al load e al cambio
- [ ] **4.4** Se `theme: 'system'` → usare `prefers-color-scheme` media query con listener per cambio automatico
- [ ] **4.5** Aggiungere selettore tema in SettingsPage (segmented control: Dark / Light / System)
- [ ] **4.6** i18n — aggiungere stringhe per il selettore tema (EN + IT)

## Fase 5 — Verifica e polish

- [ ] **5.1** Test visivo completo tema dark — nessuna regressione
- [ ] **5.2** Test visivo completo tema light — contrasti OK, leggibilità
- [ ] **5.3** Widget window — verificare che segua il tema
- [ ] **5.4** Tooltip, modali, dropdown — verificare contrasti
- [ ] **5.5** WaveformEditor — verificare colori in entrambi i temi
- [ ] **5.6** StreamDeck page — verificare colori in entrambi i temi
- [ ] **5.7** Test suite — verificare che non ci siano rotture (`npm test`)

---

## File coinvolti (stima)

### Nuovi
- `src/styles/colors.css`
- `src/styles/themes/dark.css`
- `src/styles/themes/light.css`

### Modificati (principali)
- `src/styles/variables.css` — rimuovere variabili colore
- `src/styles/global.css` — nuovi import, usare token
- `src/env.d.ts` — ConfigData.theme
- `src/enums/config-defaults.ts` — theme default
- `src/stores/config.ts` — applicare tema
- `src/pages/SettingsPage.vue` — UI selettore
- `src/i18n/en.ts`, `src/i18n/it.ts` — stringhe tema
- ~25 componenti Vue con colori hardcoded

---

## Note
- Il tema dark è quello attuale — la migrazione non deve cambiare nulla visivamente
- Il tema light è nuovo — richiederà fine-tuning visivo
- Approccio incrementale: prima la struttura (Fase 1), poi migrazione per batch di file (Fase 2-3), infine config/UI (Fase 4)
