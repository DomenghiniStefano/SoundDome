# Theme System — Refactor & Implementation Plan

## Obiettivo
Introdurre un sistema di temi (dark/light) in SoundDome, ristrutturando i colori con un'architettura a 3 livelli (palette → token semantici → componenti) e aggiungendo un selettore tema nelle impostazioni.

---

## Fase 1 — Architettura colori (palette + token semantici)

- [ ] **1.1** Creare `src/styles/colors.css` — palette primitiva con scale colore
  - Gray: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000
  - Green (accent): 400, 500, 600
  - Red (error/danger): 500, 600, 700, 800
  - Yellow/Orange (warning): 500, 600
  - Blue (info/link): 400, 500, 600
  - Purple (StreamDeck): 400, 500
  - Bianco/nero puri + trasparenze comuni (white-alpha, black-alpha)
- [ ] **1.2** Creare `src/styles/themes/dark.css` — token semantici per tema dark
  - Background: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-card-hover`, `--bg-input`, `--bg-active`, `--bg-overlay`, `--bg-tooltip`
  - Text: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-faint`, `--text-nav`, `--text-inverse`, `--text-on-accent`
  - Accent: `--accent`, `--accent-hover`, `--accent-subtle` (rgba)
  - Border: `--border-default`, `--border-subtle`, `--border-active`
  - Status: `--color-error`, `--color-warning`, `--color-info`, `--color-success`
  - Status subtle (rgba): `--color-error-subtle`, `--color-warning-subtle`, `--color-info-subtle`
  - Slider: `--slider-bg`, `--slider-knob`
  - Scrollbar: `--scrollbar-thumb`, `--scrollbar-thumb-hover`
  - Shadow: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
  - Button: `--btn-danger-bg`, `--btn-danger-hover`
  - Title bar: `--titlebar-close-bg`, `--titlebar-close-text`
  - StreamDeck-specific: `--sd-blue`, `--sd-purple`, `--sd-orange`, `--sd-green`, `--sd-red` + varianti subtle
- [ ] **1.3** Creare `src/styles/themes/light.css` — token semantici per tema light
  - Stessi token, valori invertiti/adattati per sfondo chiaro
- [ ] **1.4** Aggiornare `src/styles/variables.css` — rimuovere variabili colore, tenere solo spacing/radius/font
- [ ] **1.5** Aggiornare `src/styles/global.css` — importare colors.css + tema di default, usare token semantici

## Fase 2 — Migrazione componenti

### 2.1 — Hex hardcoded → token semantici
- [ ] **2.1.1** `#000` (16 occorrenze) → `var(--text-on-accent)` o `var(--text-inverse)` a seconda del contesto
- [ ] **2.1.2** `#fff` (10 occorrenze) → `var(--text-inverse)` o `var(--text-on-accent)`
- [ ] **2.1.3** `#1a1a1a` (3 occorrenze) → `var(--bg-card)`
- [ ] **2.1.4** `#333` (6 occorrenze) → `var(--border-default)`
- [ ] **2.1.5** `#282828`, `#2a2a2a` → `var(--bg-card-hover)` o `var(--bg-tooltip)`
- [ ] **2.1.6** `#c62828`, `#e81123` → `var(--btn-danger-bg)`, `var(--titlebar-close-bg)`
- [ ] **2.1.7** `#0d0d1a`, `#1a1a00` → token specifici o variabili esistenti
- [ ] **2.1.8** `#aaa`, `#888`, `#999` → `var(--text-secondary)` / `var(--text-tertiary)`

### 2.2 — rgba() hardcoded → token semantici
- [ ] **2.2.1** `rgba(0,0,0, 0.5/0.6)` → `var(--bg-overlay)`
- [ ] **2.2.2** `rgba(255,255,255, 0.04..0.25)` — hover/surface → `var(--bg-surface-*)` tokens
- [ ] **2.2.3** `rgba(29,185,84, 0.1..0.4)` — accent tints → `var(--accent-subtle)`
- [ ] **2.2.4** `rgba(229,57,53, ...)` — error tints → `var(--color-error-subtle)`
- [ ] **2.2.5** `rgba(59,130,246, ...)` — blue tints → `var(--color-info-subtle)`
- [ ] **2.2.6** `rgba(243,156,18, ...)` — warning tints → `var(--color-warning-subtle)`

### 2.3 — Fallback nei var() → rimuovere
- [ ] **2.3.1** Rimuovere tutti i fallback hardcoded tipo `var(--color-border, #333)` → `var(--border-default)`

### 2.4 — StreamDeckPage cleanup
- [ ] **2.4.1** Migrare i ~30 colori hardcoded di StreamDeckPage ai token `--sd-*`
- [ ] **2.4.2** Eliminare `--danger-color` → usare `--color-error`

### 2.5 — WaveformEditor
- [ ] **2.5.1** Passare colori wavesurfer tramite CSS variables (computed in JS da getComputedStyle)

## Fase 3 — Fix SVG e icone

- [ ] **3.1** PlayButton.vue — `fill: #fff` / `color: #000` → `currentColor` o token
- [ ] **3.2** WidgetCard.vue — `color: #c62828` → `var(--color-error)`
- [ ] **3.3** NowPlaying.vue — `color: #fff`, `background: #c62828` → token
- [ ] **3.4** TitleBar.vue / WidgetTitleBar.vue — `#e81123` → `var(--titlebar-close-bg)`
- [ ] **3.5** Verificare tutti gli `<AppIcon>` per contrasto con entrambi i temi
- [ ] **3.6** LoadMoreButton.vue — `color: #aaa` → `var(--text-tertiary)`

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
