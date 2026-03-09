# 🎧 Soundboard Pro — Piano di Sviluppo V3 Ultra
## Blueprint Completo: Virtual Microphone + DSP Pipeline + Low-Latency Audio Engine
### Versione 3.0 — Documento Tecnico Completo

---

## 📋 Indice

1. [Visione e Obiettivi](#1-visione-e-obiettivi)
2. [Architettura Sistema Completa](#2-architettura-sistema-completa)
3. [Stack Tecnologico Dettagliato](#3-stack-tecnologico-dettagliato)
4. [Audio Engine: Design Ultra-Low-Latency](#4-audio-engine-design-ultra-low-latency)
5. [DSP Pipeline Professionale](#5-dsp-pipeline-professionale)
6. [RNNoise: Integrazione Completa](#6-rnnoise-integrazione-completa)
7. [Virtual Microphone Driver (SysVAD)](#7-virtual-microphone-driver-sysvad)
8. [Ring Buffer Audio Driver-Level](#8-ring-buffer-audio-driver-level)
9. [Threading Model](#9-threading-model)
10. [Node Native Bridge](#10-node-native-bridge)
11. [Struttura Repository Completa](#11-struttura-repository-completa)
12. [Roadmap Milestone Dettagliata](#12-roadmap-milestone-dettagliata)
13. [Implementazione Fase per Fase](#13-implementazione-fase-per-fase)
14. [Prompt Claude Code per ogni Modulo](#14-prompt-claude-code-per-ogni-modulo)
15. [Testing e Validazione](#15-testing-e-validazione)
16. [Installer e Distribuzione](#16-installer-e-distribuzione)
17. [Ottimizzazioni e Tuning](#17-ottimizzazioni-e-tuning)
18. [Riferimenti e Risorse](#18-riferimenti-e-risorse)

---

## 1. Visione e Obiettivi

### 1.1 Problema attuale

L'app attuale richiede che l'utente installi manualmente **VB-Cable** (o simile) per funzionare come soundboard verso Discord/Zoom/giochi.

Questo è un friction point enorme per l'utenza finale:
- L'utente deve sapere cos'è VB-Cable
- Deve installarlo separatamente
- Deve configurarlo manualmente
- Può sbagliare configurazione

**App competitor come Voicemod, SteelSeries Sonar, NVIDIA Broadcast non richiedono nulla di tutto questo.**

---

### 1.2 Obiettivo finale

L'utente installa la tua app. Fine.

Dopo l'installazione:
- Compare un nuovo dispositivo microfono: `Soundboard Virtual Mic`
- L'utente lo seleziona in Discord/Zoom/giochi
- La soundboard funziona immediatamente

Nessun passo extra.

---

### 1.3 Requisiti funzionali

| Feature | Priorità | Note |
|---|---|---|
| Virtual microphone senza VB-Cable | P0 | Core feature |
| Mixer mic + soundboard | P0 | |
| Gain control in dB | P0 | Formula Discord |
| Noise suppression (RNNoise) | P1 | |
| Monitoring cuffie separato | P1 | Sentire output locale |
| UI settings dispositivi | P0 | |
| Installer automatico driver | P0 | |
| Latenza < 20ms | P1 | Target Discord-like |
| Supporto Windows 10/11 | P0 | Prima piattaforma |

---

### 1.4 Requisiti non funzionali

- CPU usage < 5% in idle
- RAM < 150MB
- Latenza audio end-to-end < 20ms
- Installer non richiede reboot
- Compatibile Windows 10 (1903+) e Windows 11
- Driver firmato Microsoft (necessario per distribuzione pubblica)

---

## 2. Architettura Sistema Completa

### 2.1 Architettura a layer

```
┌─────────────────────────────────────────────────────┐
│                  USER SPACE                         │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │            Electron App                       │  │
│  │                                               │  │
│  │  ┌────────────┐    ┌───────────────────────┐ │  │
│  │  │  React UI  │    │    Audio Engine        │ │  │
│  │  │            │    │                       │ │  │
│  │  │  Settings  │◄───┤  - Web Audio API      │ │  │
│  │  │  Soundboard│    │  - Mixer              │ │  │
│  │  │  Monitoring│    │  - Gain (dB)          │ │  │
│  │  └────────────┘    │  - Compressor         │ │  │
│  │                    │  - RNNoise            │ │  │
│  │                    └──────────┬────────────┘ │  │
│  │                               │              │  │
│  │                    ┌──────────▼────────────┐ │  │
│  │                    │   Native Bridge       │ │  │
│  │                    │   (Node Addon C++)    │ │  │
│  │                    └──────────┬────────────┘ │  │
│  └───────────────────────────────┼──────────────┘  │
│                                  │                  │
│              Shared Memory Ring Buffer              │
│                                  │                  │
└──────────────────────────────────┼──────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────┐
│                  KERNEL SPACE                        │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │         SysVAD Virtual Audio Driver            │ │
│  │                                                │ │
│  │  ┌──────────────┐    ┌─────────────────────┐  │ │
│  │  │  Speaker     │    │  Microphone         │  │ │
│  │  │  Virtual     │    │  Virtual            │  │ │
│  │  │  (output)    │    │  (input)            │  │ │
│  │  └──────────────┘    └─────────────────────┘  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│              Windows Audio Stack (WDM/WASAPI)        │
└──────────────────────────────────────────────────────┘
```

---

### 2.2 Flusso audio completo

```
SORGENTI                    PROCESSING              DESTINAZIONI
──────────────────────────────────────────────────────────────────

Microfono fisico ──────►  RNNoise (NS)   ──────┐
                                                │
                       ┌────────────────────────┤
                       │       Mixer            │
Soundboard clip ───────►  (ChannelMerger)       │
                       │                        │
                       └────────────────────────┤
                                                │
                          Gain Control (dB) ◄───┘
                                │
                          Compressor/Limiter
                                │
                    ┌───────────┴────────────┐
                    │                        │
                    ▼                        ▼
           Virtual Mic Driver        Monitoring Output
           (SysVAD endpoint)         (cuffie fisiche)
                    │
                    ▼
          Discord / Zoom / Games
```

---

### 2.3 Flusso dati driver

```
Electron App (user space)
         │
         │  PCM float32 frames (480 samples @ 48kHz = 10ms)
         │
         ▼
  Shared Memory Buffer
  (ring buffer 8 frame × 480 samples)
         │
         │  DMA / kernel read
         │
         ▼
  SysVAD Driver (kernel)
  IAudioCaptureClient interface
         │
         ▼
  Windows Audio Engine
  WASAPI Capture
         │
         ▼
  Discord / Zoom / App target
```

---

## 3. Stack Tecnologico Dettagliato

### 3.1 Frontend

| Componente | Tecnologia | Versione | Note |
|---|---|---|---|
| Framework | Electron | 28+ | Chromium 120+, Node 20+ |
| UI | React | 18+ | Con TypeScript |
| State | Zustand | 4+ | Leggero, perfetto per audio state |
| Styling | Tailwind CSS | 3+ | |
| Audio API | Web Audio API | — | Nativa nel browser Chromium |

---

### 3.2 Audio Processing

| Componente | Tecnologia | Note |
|---|---|---|
| Mixer | Web Audio API ChannelMergerNode | Hardware accelerated |
| Gain | Web Audio API GainNode | dB → linear conversion |
| Compressor | Web Audio API DynamicsCompressorNode | Discord-like settings |
| Noise Suppression | RNNoise WASM | @shiguredo/rnnoise-wasm |
| Sample Rate | 48000 Hz | Standard VoIP |
| Frame Size | 480 samples | = 10ms @ 48kHz |
| Bit Depth | Float32 | Internal processing |

---

### 3.3 Driver e sistema

| Componente | Tecnologia | Note |
|---|---|---|
| Driver Framework | Windows Driver Framework (WDF) | KMDF per kernel driver |
| Base Driver | SysVAD sample Microsoft | Fork e modifica |
| Audio Interface | PortCls / AVStream | Windows kernel audio |
| IPC | Named Shared Memory | CreateFileMapping/MapViewOfFile |
| Sync | Kernel Event | SetEvent/WaitForSingleObject |

---

### 3.4 Native Bridge

| Componente | Tecnologia | Note |
|---|---|---|
| Native Addon | node-addon-api (NAPI) | Stabile tra versioni Node |
| Linguaggio | C++ 17 | |
| Build | node-gyp + CMake | |
| Comunicazione | Shared Memory | Stessa memoria del driver |

---

### 3.5 Build e Deploy

| Componente | Tecnologia | Note |
|---|---|---|
| Build app | electron-builder | |
| Driver signing | EV Certificate + Microsoft WHQL | Necessario per distribuzione pubblica |
| Test signing | Windows Test Mode | Per sviluppo locale |
| Installer | NSIS | Controllo totale |
| Auto-update | electron-updater | |

---

## 4. Audio Engine: Design Ultra-Low-Latency

### 4.1 Principi di design

Per ottenere latenza < 20ms in Electron/Web Audio API, i principi fondamentali sono:

**1. Pre-allocazione buffers**
Non allocare mai memoria nel path critico (audio thread). Tutti i buffer devono essere allocati all'avvio.

**2. Evitare garbage collection sul thread audio**
Il GC di JavaScript può causare jitter anche di 50-100ms. Il thread audio non deve creare oggetti JavaScript.

**3. AudioWorklet invece di ScriptProcessor**
ScriptProcessor è deprecato e lavora sul main thread. AudioWorklet usa un thread dedicato separato.

**4. Sample rate nativo**
Usare 48000 Hz che è il sample rate nativo di praticamente tutte le schede audio moderne. Una conversione di sample rate aggiunge latenza.

**5. Buffer size minimo**
Usare il buffer size più piccolo supportato dall'hardware. In genere 128 o 256 samples (2.7ms o 5.3ms @ 48kHz).

---

### 4.2 AudioContext Setup

```typescript
// audio-engine/context.ts

export async function createAudioContext(): Promise<AudioContext> {
  const ctx = new AudioContext({
    sampleRate: 48000,
    // latencyHint: 'interactive' usa il buffer più piccolo possibile
    // Equivale a ~128 samples su hardware moderno
    latencyHint: 'interactive',
  });

  // Forza la ripresa del context (policy Chromium)
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  console.log(`AudioContext latency: ${ctx.baseLatency * 1000}ms`);
  console.log(`Output latency: ${ctx.outputLatency * 1000}ms`);

  return ctx;
}
```

---

### 4.3 AudioWorklet per processing professionale

Il cuore del processing audio deve girare in un AudioWorklet.

```typescript
// audio-engine/worklets/main-processor.worklet.ts
// Questo file viene compilato separatamente e registrato nel AudioContext

class MainProcessor extends AudioWorkletProcessor {
  private gainValue: number = 1.0;
  private compressorState: CompressorState;
  private rnnoiseProcessor: RNNoiseProcessor | null = null;

  // CRITICO: nessuna allocazione nell'audio thread
  // Tutti i buffer pre-allocati nel costruttore
  private inputBuffer: Float32Array;
  private outputBuffer: Float32Array;
  private processedBuffer: Float32Array;

  constructor(options: AudioWorkletNodeOptions) {
    super(options);

    // Pre-alloca tutto qui
    this.inputBuffer = new Float32Array(480);
    this.outputBuffer = new Float32Array(480);
    this.processedBuffer = new Float32Array(480);

    this.compressorState = new CompressorState();

    // Ricevi messaggi dal main thread
    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private handleMessage(data: WorkletMessage): void {
    switch (data.type) {
      case 'SET_GAIN_DB':
        // Aggiorna gain inline senza allocazioni
        this.gainValue = dbToGain(data.db);
        break;
      case 'SET_COMPRESSOR':
        this.compressorState.update(data.params);
        break;
    }
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {

    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (!input || !output) return true;

    // 1. Copia input nel buffer locale pre-allocato
    this.inputBuffer.set(input);

    // 2. Apply RNNoise se attivo
    if (this.rnnoiseProcessor) {
      this.rnnoiseProcessor.process(this.inputBuffer, this.processedBuffer);
    } else {
      this.processedBuffer.set(this.inputBuffer);
    }

    // 3. Apply gain
    applyGain(this.processedBuffer, this.gainValue);

    // 4. Apply soft clipper (evita distorsione da clipping digitale)
    applySoftClipper(this.processedBuffer);

    // 5. Scrivi output
    output.set(this.processedBuffer);

    return true; // true = mantieni il worklet attivo
  }
}

registerProcessor('main-processor', MainProcessor);
```

---

### 4.4 Mixer digitale

```typescript
// audio-engine/mixer.ts

export interface MixerInput {
  id: string;
  sourceNode: AudioNode;
  gainNode: GainNode;
  enabled: boolean;
}

export class AudioMixer {
  private ctx: AudioContext;
  private merger: ChannelMergerNode;
  private masterGain: GainNode;
  private inputs: Map<string, MixerInput> = new Map();
  private outputNode: AudioNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Merger per combinare stream multipli
    // inputCount max = numero di sorgenti supportate
    this.merger = ctx.createChannelMerger(4);

    // Master gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1.0;

    // Chain: merger → masterGain → output
    this.merger.connect(this.masterGain);
    this.outputNode = this.masterGain;
  }

  addInput(id: string, sourceNode: AudioNode, initialGainDb: number = 0): void {
    if (this.inputs.has(id)) {
      console.warn(`Input ${id} già esistente`);
      return;
    }

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = dbToGain(initialGainDb);

    sourceNode.connect(gainNode);
    gainNode.connect(this.merger);

    this.inputs.set(id, {
      id,
      sourceNode,
      gainNode,
      enabled: true,
    });
  }

  setInputGain(id: string, db: number): void {
    const input = this.inputs.get(id);
    if (!input) return;

    // Smooth transition per evitare click audio
    const gain = dbToGain(db);
    const currentTime = this.ctx.currentTime;
    input.gainNode.gain.setTargetAtTime(gain, currentTime, 0.003);
  }

  setMasterGain(db: number): void {
    const gain = dbToGain(db);
    const currentTime = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(gain, currentTime, 0.003);
  }

  getOutputNode(): AudioNode {
    return this.outputNode;
  }

  connectOutput(destination: AudioNode): void {
    this.outputNode.connect(destination);
  }
}
```

---

### 4.5 Gain e conversioni dB

```typescript
// audio-engine/db.ts

/**
 * Converte dB in gain lineare
 * Formula: gain = 10^(dB/20)
 *
 * Esempi:
 * 0 dB   → gain 1.0  (nessuna modifica)
 * -6 dB  → gain 0.501 (circa metà volume)
 * -12 dB → gain 0.251
 * -60 dB → gain 0.001 (quasi silenzio)
 * +6 dB  → gain 1.995 (circa doppio volume)
 */
export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Converte gain lineare in dB
 * Formula: dB = 20 * log10(gain)
 */
export function gainToDb(gain: number): number {
  if (gain <= 0) return -Infinity;
  return 20 * Math.log10(gain);
}

/**
 * Curva volume identica a Discord / Steam
 * Input: 0-100 (valore slider)
 * Output: dB (-60 a +0)
 *
 * Discord usa una curva logaritmica per lo slider:
 * - 0   → -60 dB (silenzio pratico)
 * - 50  → -12 dB (metà volume percepito)
 * - 100 → 0 dB   (volume massimo)
 */
export function sliderToDb(sliderValue: number): number {
  // Clamp 0-100
  const v = Math.max(0, Math.min(100, sliderValue));

  if (v === 0) return -60;

  // Curva logaritmica: dB = -60 * (1 - v/100)^2
  // Approssimazione della curva Discord
  const normalized = v / 100;
  return -60 * Math.pow(1 - normalized, 2);
}

/**
 * Versione inversa per visualizzare il valore slider dato il dB
 */
export function dbToSlider(db: number): number {
  if (db <= -60) return 0;
  if (db >= 0) return 100;

  // Inversa di: dB = -60 * (1 - v/100)^2
  const normalized = 1 - Math.sqrt(-db / 60);
  return Math.round(normalized * 100);
}

/**
 * Apply gain inline su Float32Array
 * Usato nel AudioWorklet (no allocazioni)
 */
export function applyGain(buffer: Float32Array, gain: number): void {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] *= gain;
  }
}

/**
 * Soft clipper per evitare clipping digitale duro
 * Usa funzione tanh per clip morbido
 */
export function applySoftClipper(buffer: Float32Array): void {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.tanh(buffer[i]);
  }
}
```

---

## 5. DSP Pipeline Professionale

### 5.1 Compressor tipo Discord

Discord usa una forma di dynamic range compression per evitare picchi forti e migliorare la comprensibilità vocale.

Con Web Audio API hai `DynamicsCompressorNode` che funziona perfettamente.

```typescript
// audio-engine/compressor.ts

export interface CompressorPreset {
  threshold: number;  // dB, segnale sopra questa soglia viene compresso
  knee: number;       // dB, larghezza della transizione soft
  ratio: number;      // rapporto di compressione N:1
  attack: number;     // secondi, velocità di attacco
  release: number;    // secondi, velocità di rilascio
}

// Preset identico alle impostazioni Discord
export const DISCORD_PRESET: CompressorPreset = {
  threshold: -18,   // Inizia a comprimere da -18 dB
  knee: 3,          // Soft knee per transizione naturale
  ratio: 4,         // 4:1 compressione
  attack: 0.003,    // 3ms attacco molto veloce
  release: 0.25,    // 250ms rilascio naturale
};

// Preset per soundboard (suoni preregistrati)
export const SOUNDBOARD_PRESET: CompressorPreset = {
  threshold: -12,
  knee: 5,
  ratio: 6,
  attack: 0.001,    // 1ms attacco rapidissimo per click
  release: 0.1,
};

// Preset per voice (microfono)
export const VOICE_PRESET: CompressorPreset = {
  threshold: -20,
  knee: 8,
  ratio: 3,
  attack: 0.005,
  release: 0.3,
};

export function createCompressor(
  ctx: AudioContext,
  preset: CompressorPreset = DISCORD_PRESET
): DynamicsCompressorNode {
  const comp = ctx.createDynamicsCompressor();

  comp.threshold.value = preset.threshold;
  comp.knee.value = preset.knee;
  comp.ratio.value = preset.ratio;
  comp.attack.value = preset.attack;
  comp.release.value = preset.release;

  return comp;
}
```

---

### 5.2 Attenuation sidechain (Discord: "Reduce other apps by X%")

```typescript
// audio-engine/attenuation.ts

/**
 * Sidechain attenuation: quando voce rilevata (VAD),
 * riduce il volume degli altri input.
 * Simula il comportamento Discord "Reduce other applications by X%"
 */
export class SidechainAttenuator {
  private currentGain: number = 1.0;
  private targetGain: number = 1.0;
  private attackRate: number = 0.05;   // Quanto veloce abbassa il volume
  private releaseRate: number = 0.02;  // Quanto veloce lo ripristina

  private attenuationLevel: number = 0.3; // 70% riduzione (come Discord default)
  private vadActive: boolean = false;

  // Chiamato dal Voice Activity Detector
  onVoiceDetected(active: boolean): void {
    this.vadActive = active;
    this.targetGain = active ? this.attenuationLevel : 1.0;
  }

  // Chiamato ogni frame audio nel AudioWorklet
  // Restituisce il gain da applicare al frame
  tick(): number {
    // Smoothing esponenziale del gain
    // Questo evita click e artifatti audio
    const rate = this.vadActive ? this.attackRate : this.releaseRate;
    this.currentGain += (this.targetGain - this.currentGain) * rate;

    return this.currentGain;
  }

  setAttenuationPercent(percent: number): void {
    // percent: 0-100
    // 0% = nessuna attenuazione
    // 100% = silenzio completo
    this.attenuationLevel = 1 - (percent / 100);
  }
}
```

---

### 5.3 Voice Activity Detector (VAD) semplificato

```typescript
// audio-engine/vad.ts

/**
 * VAD semplice basato su energy threshold
 * Per VAD avanzato si può usare @ricky0123/vad-web
 */
export class SimpleVAD {
  private threshold: number = 0.01;      // Energy threshold
  private hangover: number = 50;         // Frame di hangover (500ms @ 10ms/frame)
  private hangoverCount: number = 0;
  private isActive: boolean = false;

  private onVoiceCallback: ((active: boolean) => void) | null = null;

  onVoice(cb: (active: boolean) => void): void {
    this.onVoiceCallback = cb;
  }

  processFrame(frame: Float32Array): boolean {
    // Calcola energia RMS del frame
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i] * frame[i];
    }
    const rms = Math.sqrt(sum / frame.length);

    const voicePresent = rms > this.threshold;

    if (voicePresent) {
      this.hangoverCount = this.hangover;
    } else if (this.hangoverCount > 0) {
      this.hangoverCount--;
    }

    const newActive = this.hangoverCount > 0;

    if (newActive !== this.isActive) {
      this.isActive = newActive;
      this.onVoiceCallback?.(this.isActive);
    }

    return this.isActive;
  }

  setThreshold(db: number): void {
    // Converte soglia dB in energia lineare
    this.threshold = Math.pow(10, db / 20);
  }
}
```

---

## 6. RNNoise: Integrazione Completa

### 6.1 Che cos'è RNNoise

RNNoise è una libreria di noise suppression creata da Jean-Marc Valin (autore di Opus).

Caratteristiche:
- Rete neurale ricorrente (RNN) molto leggera
- Latenza: 10ms (1 frame da 480 sample @ 48kHz)
- CPU: < 1% su hardware moderno
- Open source (licenza BSD)
- Usata in Opus, Firefox, Firefox, Chromium, e molte VoIP app

---

### 6.2 Setup RNNoise WASM

```bash
# Installa il wrapper WASM
npm install @shiguredo/rnnoise-wasm
```

---

### 6.3 Integrazione nel AudioWorklet

Nota importante: il modulo WASM non può essere caricato direttamente nel AudioWorklet in modo sincrono. Serve un approccio con `SharedArrayBuffer` o passaggio tramite `MessagePort`.

```typescript
// audio-engine/rnnoise-bridge.ts

import { RNNoise } from '@shiguredo/rnnoise-wasm';

export class RNNoiseBridge {
  private rnnoise: RNNoise | null = null;
  private denoiseState: any = null;
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    this.rnnoise = await RNNoise.create();
    this.denoiseState = this.rnnoise.newState();
    this.initialized = true;
    console.log('RNNoise inizializzato');
  }

  /**
   * Processa un frame audio
   * Input/output: Float32Array di 480 campioni @ 48kHz
   *
   * IMPORTANTE: RNNoise lavora a 48kHz con frame da 480 campioni.
   * Se il sample rate o la frame size sono diversi, serve conversione.
   */
  processFrame(input: Float32Array): Float32Array {
    if (!this.initialized || !this.rnnoise || !this.denoiseState) {
      return input;
    }

    // RNNoise si aspetta Float32Array da 480 campioni
    if (input.length !== 480) {
      console.warn(`Frame size incorretto: ${input.length}, atteso 480`);
      return input;
    }

    const output = this.rnnoise.processFrame(this.denoiseState, input);
    return output;
  }

  destroy(): void {
    if (this.rnnoise && this.denoiseState) {
      this.rnnoise.deleteState(this.denoiseState);
    }
  }
}
```

---

### 6.4 Gestione frame size

Web Audio API usa buffer di 128 samples di default (il browser decide).
RNNoise vuole 480 samples.

Serve un accumulatore:

```typescript
// audio-engine/frame-accumulator.ts

/**
 * Accumula frame piccoli (128 samples Web Audio)
 * e li restituisce in frame grandi (480 samples RNNoise)
 */
export class FrameAccumulator {
  private buffer: Float32Array;
  private writePos: number = 0;
  private frameSize: number;

  constructor(frameSize: number = 480) {
    this.frameSize = frameSize;
    // Buffer doppio per overlap processing
    this.buffer = new Float32Array(frameSize * 2);
  }

  /**
   * Aggiunge samples al buffer.
   * Restituisce array di frame completi (se disponibili).
   */
  push(samples: Float32Array): Float32Array[] {
    const frames: Float32Array[] = [];

    let readPos = 0;
    while (readPos < samples.length) {
      const spaceInBuffer = this.frameSize - this.writePos;
      const samplesToWrite = Math.min(spaceInBuffer, samples.length - readPos);

      this.buffer.set(
        samples.subarray(readPos, readPos + samplesToWrite),
        this.writePos
      );

      this.writePos += samplesToWrite;
      readPos += samplesToWrite;

      if (this.writePos >= this.frameSize) {
        // Frame completo disponibile
        const frame = new Float32Array(this.frameSize);
        frame.set(this.buffer.subarray(0, this.frameSize));
        frames.push(frame);
        this.writePos = 0;
      }
    }

    return frames;
  }
}
```

---

### 6.5 Pipeline RNNoise completa nel AudioWorklet

```typescript
// Nel AudioWorklet:

class MainProcessor extends AudioWorkletProcessor {
  private accumulator: FrameAccumulator;
  private rnnoiseBuffer: Float32Array[] = [];

  constructor(options: AudioWorkletNodeOptions) {
    super(options);
    this.accumulator = new FrameAccumulator(480);
  }

  process(inputs, outputs, parameters): boolean {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (!input || !output) return true;

    // Accumula samples Web Audio (128) → frames RNNoise (480)
    const frames = this.accumulator.push(input);

    // Processa ogni frame completo con RNNoise
    for (const frame of frames) {
      const processed = this.rnnoiseProcessor.processFrame(frame);
      this.rnnoiseBuffer.push(processed);
    }

    // Restituisce i campioni processati disponibili
    // Nota: questo introduce una latenza di 1 frame (10ms)
    // che è accettabile per VoIP
    if (this.rnnoiseBuffer.length > 0) {
      // Preleva campioni dal buffer processato
      // ... logica di output
    }

    return true;
  }
}
```

---

## 7. Virtual Microphone Driver (SysVAD)

### 7.1 Overview

Il Virtual Microphone è la feature più complessa ma anche quella che fa la differenza tra la tua app e una soundboard generica.

**Come funziona a livello sistema:**
1. Il driver è un kernel-mode driver Windows
2. Si registra come dispositivo audio (`MMDevice`)
3. Windows lo espone a tutte le applicazioni come "Soundboard Virtual Mic"
4. Quando un'app fa capture (Discord, Zoom), il driver fornisce i dati audio dalla shared memory
5. La tua app Electron scrive audio nella shared memory

---

### 7.2 SysVAD: il punto di partenza

Microsoft fornisce `SysVAD` come sample di virtual audio driver nel Windows Driver Kit (WDK).

Repository: `https://github.com/microsoft/Windows-driver-samples/tree/main/audio/sysvad`

Struttura SysVAD:
```
sysvad/
  sysvad.sys          ← driver principale
  sysvad.inf          ← file installazione
  EndpointsCommon/
    minwavert.cpp     ← Miniport WaveRT
    minwavertstream.cpp
  TabletAudioSample/
    PhoneTopology.cpp
    PhoneWave.cpp
```

---

### 7.3 Modifiche al SysVAD per Virtual Mic

Dovrai fare un fork di SysVAD e apportare queste modifiche principali:

**Modifica 1: Nome e identificativo dispositivo**
```cpp
// EndpointsCommon/endpoints.h
// Modifica il nome del dispositivo

#define SYSVAD_DEVICE_NAME L"Soundboard Virtual Mic"
#define SYSVAD_MANUFACTURER L"SoundboardApp"

// GUID unico per il tuo dispositivo (genera un nuovo GUID)
DEFINE_GUID(CLSID_SoundboardVirtualMic,
  0x12345678, 0x1234, 0x1234, 0x12, 0x34, 0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC);
```

**Modifica 2: Formato audio**
```cpp
// Configura 48kHz, 16-bit, mono (per VoIP)
// oppure 48kHz, 32-bit float per qualità migliore

static const KSDATARANGE_AUDIO PinDataRangesBridgeCapture[] = {
  {
    {
      sizeof(KSDATARANGE_AUDIO),
      0,
      0,
      0,
      STATICGUIDOF(KSDATAFORMAT_TYPE_AUDIO),
      STATICGUIDOF(KSDATAFORMAT_SUBTYPE_PCM),
      STATICGUIDOF(KSDATAFORMAT_SPECIFIER_WAVEFORMATEX)
    },
    16,         // MaximumBitsPerSample
    16,         // MinimumBitsPerSample
    48000,      // MaximumSampleFrequency
    48000,      // MinimumSampleFrequency
    1           // MaximumChannels (mono)
  }
};
```

**Modifica 3: Lettura dati da Shared Memory**

Questa è la modifica più importante. Invece di generare silenzio o tono di test, il driver deve leggere dalla shared memory.

```cpp
// EndpointsCommon/minwavertstream.cpp

// Struttura della shared memory (stessa dell'app user-space)
struct SharedAudioBuffer {
  volatile LONG writePos;       // Posizione scrittura (app)
  volatile LONG readPos;        // Posizione lettura (driver)
  volatile LONG frameSize;      // Dimensione frame in samples
  volatile LONG sampleRate;     // Sample rate (48000)
  BYTE audioData[SHARED_BUFFER_SIZE]; // Audio PCM data
};

// Apri la shared memory nel driver
NTSTATUS CMiniportWaveRTStream::OpenSharedMemory() {
  UNICODE_STRING sharedMemName;
  RtlInitUnicodeString(&sharedMemName, L"\\BaseNamedObjects\\SoundboardAudioBuffer");

  OBJECT_ATTRIBUTES objAttr;
  InitializeObjectAttributes(&objAttr, &sharedMemName,
    OBJ_KERNEL_HANDLE | OBJ_CASE_INSENSITIVE, NULL, NULL);

  HANDLE sectionHandle;
  NTSTATUS status = ZwOpenSection(
    &sectionHandle,
    SECTION_MAP_READ,
    &objAttr
  );

  if (!NT_SUCCESS(status)) {
    // Shared memory non disponibile, restituisce silenzio
    return STATUS_SUCCESS;
  }

  // Mappa la memoria nel kernel
  SIZE_T viewSize = sizeof(SharedAudioBuffer);
  status = ZwMapViewOfSection(
    sectionHandle,
    ZwCurrentProcess(),
    (PVOID*)&m_pSharedBuffer,
    0, 0, NULL,
    &viewSize,
    ViewShare,
    0,
    PAGE_READONLY
  );

  ZwClose(sectionHandle);
  return status;
}

// GetReadPacket: dove il driver copia i dati verso Windows Audio Engine
NTSTATUS CMiniportWaveRTStream::GetReadPacket(
  _Out_ ULONG* PacketNumber,
  _Out_ DWORD* Flags,
  _Out_ ULONG64* PerformanceCounterValue,
  _Out_ BOOL* MoreData
) {
  if (m_pSharedBuffer == nullptr) {
    // Silenzio se nessuna app connessa
    RtlZeroMemory(m_pDmaBuffer, m_ulDmaBufferSize);
  } else {
    // Leggi dalla shared memory
    LONG readPos = InterlockedAdd(&m_pSharedBuffer->readPos, 0);
    LONG writePos = InterlockedAdd(&m_pSharedBuffer->writePos, 0);

    if (readPos != writePos) {
      // Dati disponibili
      ULONG frameBytes = m_pSharedBuffer->frameSize * sizeof(SHORT);
      RtlCopyMemory(m_pDmaBuffer,
        &m_pSharedBuffer->audioData[readPos * frameBytes],
        frameBytes);

      // Avanza posizione lettura
      InterlockedExchange(&m_pSharedBuffer->readPos,
        (readPos + 1) % RING_BUFFER_FRAMES);
    } else {
      // Buffer vuoto, restituisce silenzio
      RtlZeroMemory(m_pDmaBuffer, m_ulDmaBufferSize);
    }
  }

  *PacketNumber = m_ulPacketNumber++;
  *Flags = 0;
  *PerformanceCounterValue = GetCurrentTime();
  *MoreData = FALSE;

  return STATUS_SUCCESS;
}
```

---

### 7.4 File INF per installazione driver

```ini
; soundboard-virtual-mic.inf
; File di installazione del driver

[Version]
Signature="$Windows NT$"
Class=MEDIA
ClassGUID={4d36e96c-e325-11ce-bfc1-08002be10318}
Provider=%ProviderName%
DriverVer=01/01/2024,1.0.0.1
CatalogFile=soundboard-virtual-mic.cat
PnpLockdown=1

[Manufacturer]
%ProviderName%=Models,NTamd64

[Models.NTamd64]
%DeviceDesc%=SoundboardVirtualMic_Device, Root\SoundboardVirtualMic

[SoundboardVirtualMic_Device.NT]
CopyFiles=SoundboardVirtualMic.CopyList
AddReg=SoundboardVirtualMic.AddReg

[SoundboardVirtualMic.CopyList]
soundboard-virtual-mic.sys

[SoundboardVirtualMic.AddReg]
HKR,,AssociatedFilters,,"wdmaud,swmidi,redbook"
HKR,,Driver,,soundboard-virtual-mic.sys
HKR,Drivers,SubClasses,,"wave,midi,mixer"
HKR,Drivers\wave\wdmaud.drv,Driver,,wdmaud.drv
HKR,Drivers\midi\wdmaud.drv,Driver,,wdmaud.drv
HKR,Drivers\mixer\wdmaud.drv,Driver,,wdmaud.drv

[SoundboardVirtualMic_Device.NT.Services]
AddService=SoundboardVirtualMic,0x00000002,SoundboardVirtualMic_Service_Inst

[SoundboardVirtualMic_Service_Inst]
DisplayName=%ServiceDesc%
ServiceType=1
StartType=3
ErrorControl=1
ServiceBinary=%12%\soundboard-virtual-mic.sys

[Strings]
ProviderName="SoundboardApp"
DeviceDesc="Soundboard Virtual Microphone"
ServiceDesc="Soundboard Virtual Mic Driver"
```

---

## 8. Ring Buffer Audio Driver-Level

### 8.1 Design del Ring Buffer

Il ring buffer è la struttura dati critica che connette l'app Electron (user-space) al driver Windows (kernel-space).

**Requisiti:**
- Lock-free (il driver kernel non può aspettare lock user-space)
- Dimensione sufficiente per buffer di jitter (tipicamente 4-8 frame)
- Accesso da due thread diversi (writer: app Electron, reader: driver)

---

### 8.2 Struttura Shared Memory

```cpp
// Usata sia nell'app (C++ native addon) che nel driver (kernel C++)

#pragma pack(push, 1)  // Nessun padding

#define RING_BUFFER_FRAMES 8          // 8 frame × 10ms = 80ms buffer
#define SAMPLES_PER_FRAME  480        // 480 samples @ 48kHz = 10ms
#define BYTES_PER_SAMPLE   2          // 16-bit PCM
#define FRAME_BYTES        (SAMPLES_PER_FRAME * BYTES_PER_SAMPLE)
#define TOTAL_BUFFER_SIZE  (RING_BUFFER_FRAMES * FRAME_BYTES)

struct SharedAudioBuffer {
  // Metadati (scritti dall'app al setup)
  LONG sampleRate;        // 48000
  LONG channels;          // 1 (mono) o 2 (stereo)
  LONG bitsPerSample;     // 16
  LONG frameSize;         // 480

  // Controllo ring buffer
  // writePos: indice del prossimo frame da scrivere (app scrive)
  // readPos:  indice del prossimo frame da leggere (driver legge)
  volatile LONG writePos;   // 0..RING_BUFFER_FRAMES-1
  volatile LONG readPos;    // 0..RING_BUFFER_FRAMES-1

  // Contatori per diagnostica
  volatile LONG framesWritten;
  volatile LONG framesRead;
  volatile LONG framesDropped;  // Quando buffer pieno

  // Dati audio PCM
  // Layout: audioData[frameIndex * FRAME_BYTES .. (frameIndex+1) * FRAME_BYTES - 1]
  BYTE audioData[TOTAL_BUFFER_SIZE];
};

#pragma pack(pop)
```

---

### 8.3 Writer (lato app - C++ Native Addon)

```cpp
// native/audio-bridge/shared-buffer-writer.cpp

class SharedBufferWriter {
private:
  HANDLE m_hSection;
  SharedAudioBuffer* m_pBuffer;

public:
  HRESULT Initialize() {
    // Crea o apri la shared memory
    m_hSection = CreateFileMappingW(
      INVALID_HANDLE_VALUE,       // File backing (nessuno = pagefile)
      nullptr,                    // Security attributes
      PAGE_READWRITE,             // Access
      0,                          // Size high
      sizeof(SharedAudioBuffer),  // Size low
      L"SoundboardAudioBuffer"    // Nome condiviso
    );

    if (!m_hSection) {
      return HRESULT_FROM_WIN32(GetLastError());
    }

    m_pBuffer = static_cast<SharedAudioBuffer*>(
      MapViewOfFile(m_hSection, FILE_MAP_ALL_ACCESS, 0, 0, 0)
    );

    if (!m_pBuffer) {
      return HRESULT_FROM_WIN32(GetLastError());
    }

    // Inizializza metadati
    m_pBuffer->sampleRate = 48000;
    m_pBuffer->channels = 1;
    m_pBuffer->bitsPerSample = 16;
    m_pBuffer->frameSize = SAMPLES_PER_FRAME;
    m_pBuffer->writePos = 0;
    m_pBuffer->readPos = 0;

    return S_OK;
  }

  /**
   * Scrivi un frame audio nel ring buffer
   * data: Int16Array da 480 campioni (PCM 16-bit)
   * Ritorna false se il buffer è pieno (frame droppato)
   */
  bool WriteFrame(const int16_t* data, size_t sampleCount) {
    LONG currentWrite = InterlockedAdd(&m_pBuffer->writePos, 0);
    LONG currentRead  = InterlockedAdd(&m_pBuffer->readPos, 0);

    // Calcola spazio disponibile nel ring buffer
    LONG nextWrite = (currentWrite + 1) % RING_BUFFER_FRAMES;

    if (nextWrite == currentRead) {
      // Buffer pieno, frame droppato
      InterlockedIncrement(&m_pBuffer->framesDropped);
      return false;
    }

    // Scrivi il frame
    size_t offset = currentWrite * FRAME_BYTES;
    memcpy(m_pBuffer->audioData + offset, data, sampleCount * BYTES_PER_SAMPLE);

    // Avanza write pointer (DOPO la copia, per lock-free safety)
    InterlockedExchange(&m_pBuffer->writePos, nextWrite);
    InterlockedIncrement(&m_pBuffer->framesWritten);

    return true;
  }
};
```

---

### 8.4 Conversione Float32 (Web Audio) → Int16 (driver)

```typescript
// audio-engine/format-converter.ts

/**
 * Converte Float32Array (Web Audio) in Int16Array (PCM 16-bit per driver)
 * Float32: range -1.0 a +1.0
 * Int16:   range -32768 a +32767
 */
export function float32ToInt16(input: Float32Array, output: Int16Array): void {
  for (let i = 0; i < input.length; i++) {
    // Clamp a -1..+1 per sicurezza
    const clamped = Math.max(-1, Math.min(1, input[i]));
    // Converti a Int16
    output[i] = Math.round(clamped * 32767);
  }
}

/**
 * Versione ottimizzata per batch processing
 */
export function convertAndWriteToBuffer(
  float32Data: Float32Array,
  int16Buffer: Int16Array
): void {
  const len = Math.min(float32Data.length, int16Buffer.length);

  for (let i = 0; i < len; i++) {
    let v = float32Data[i];

    // Soft clip + convert
    if (v > 1.0) v = 1.0;
    else if (v < -1.0) v = -1.0;

    int16Buffer[i] = (v * 32767) | 0;  // bitwise OR 0 per int conversion veloce
  }
}
```

---

## 9. Threading Model

### 9.1 Threads nell'app

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Process                          │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐│
│  │   Main Process  │    │       Renderer Process          ││
│  │   (Node.js)     │    │       (Chromium)                ││
│  │                 │    │                                 ││
│  │  - IPC          │◄───┤  ┌─────────────────────────┐   ││
│  │  - Driver API   │    │  │    Main Thread          │   ││
│  │  - Tray         │    │  │    - React UI           │   ││
│  │  - Updates      │    │  │    - Event handling     │   ││
│  │                 │    │  │    - State management   │   ││
│  │                 │    │  └─────────────────────────┘   ││
│  │                 │    │                                 ││
│  │                 │    │  ┌─────────────────────────┐   ││
│  │                 │    │  │    Audio Thread         │   ││
│  │                 │    │  │    (AudioWorklet)       │   ││
│  │                 │    │  │    - DSP processing     │   ││
│  │                 │    │  │    - Gain control       │   ││
│  │                 │    │  │    - Compressor         │   ││
│  │                 │    │  │    - RNNoise            │   ││
│  │                 │    │  └──────────┬──────────────┘   ││
│  │                 │    └────────────-│─────────────────-┘│
│  └─────────────────┘                 │                    │
│                                      │                    │
│  ┌───────────────────────────────────▼──────────────────┐ │
│  │              Native Bridge Thread                    │ │
│  │              (C++ NAPI Worker)                       │ │
│  │              - Float32 → Int16 conversion            │ │
│  │              - Write to Shared Memory                │ │
│  │              - Stats collection                      │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                    Shared Memory Buffer
                              │
┌─────────────────────────────▼──────────────────────────────┐
│                    Driver Thread                            │
│                    (Windows Kernel Audio Engine)            │
│                    - Read from Shared Memory               │
│                    - Provide to WASAPI capture             │
└─────────────────────────────────────────────────────────────┘
```

---

### 9.2 Comunicazione tra threads

**AudioWorklet → Main Thread → Native Bridge:**
```typescript
// Nel AudioWorklet (audio thread)
this.port.postMessage({
  type: 'AUDIO_FRAME',
  buffer: processedFrame.buffer,  // Transfer ownership per zero-copy
}, [processedFrame.buffer]);  // Transferable objects

// Nel Main Thread
workletNode.port.onmessage = (event) => {
  if (event.data.type === 'AUDIO_FRAME') {
    const frame = new Float32Array(event.data.buffer);
    nativeBridge.writeAudioFrame(frame);
  }
};
```

---

### 9.3 NAPI Worker Thread per operazioni bloccanti

```cpp
// native/audio-bridge/audio-writer.cpp

// Worker Napi per operazioni asincrone C++
class AudioWriterWorker : public Napi::AsyncWorker {
  std::vector<int16_t> m_frameData;
  SharedBufferWriter* m_writer;
  bool m_success;

public:
  AudioWriterWorker(
    Napi::Env env,
    Napi::Function callback,
    std::vector<int16_t>&& frameData,
    SharedBufferWriter* writer
  ) : Napi::AsyncWorker(env, callback),
      m_frameData(std::move(frameData)),
      m_writer(writer) {}

  void Execute() override {
    // Questa funzione gira su un thread separato Node.js
    // Non blocca il thread JavaScript
    m_success = m_writer->WriteFrame(
      m_frameData.data(),
      m_frameData.size()
    );
  }

  void OnOK() override {
    Callback().Call({
      Env().Null(),
      Napi::Boolean::New(Env(), m_success)
    });
  }
};
```

---

## 10. Node Native Bridge

### 10.1 Struttura addon

```
native/audio-bridge/
  src/
    addon.cpp           ← Entry point NAPI
    shared-buffer.h     ← SharedAudioBuffer struct
    buffer-writer.cpp   ← Writer per shared memory
    buffer-writer.h
    audio-writer.cpp    ← NAPI Worker
    audio-writer.h
  binding.gyp           ← Build config
  index.js              ← TypeScript wrapper
  index.d.ts            ← Type definitions
```

---

### 10.2 Entry point NAPI

```cpp
// native/audio-bridge/src/addon.cpp

#include <napi.h>
#include "buffer-writer.h"

static SharedBufferWriter* g_writer = nullptr;

// Inizializza la connessione con il driver
Napi::Value Initialize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (g_writer) {
    return Napi::Boolean::New(env, true);
  }

  g_writer = new SharedBufferWriter();
  HRESULT hr = g_writer->Initialize();

  if (FAILED(hr)) {
    delete g_writer;
    g_writer = nullptr;

    Napi::Error::New(env, "Impossibile inizializzare shared memory. Driver installato?")
      .ThrowAsJavaScriptException();
    return env.Null();
  }

  return Napi::Boolean::New(env, true);
}

// Scrivi frame audio (Float32Array → Int16 → Shared Memory)
Napi::Value WriteAudioFrame(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!g_writer) {
    Napi::Error::New(env, "Bridge non inizializzato").ThrowAsJavaScriptException();
    return env.Null();
  }

  // Ricevi Float32Array da JavaScript
  Napi::Float32Array float32Array = info[0].As<Napi::Float32Array>();

  // Converti Float32 → Int16
  size_t sampleCount = float32Array.ElementLength();
  std::vector<int16_t> int16Data(sampleCount);

  const float* src = float32Array.Data();
  for (size_t i = 0; i < sampleCount; i++) {
    float v = src[i];
    if (v > 1.0f) v = 1.0f;
    if (v < -1.0f) v = -1.0f;
    int16Data[i] = static_cast<int16_t>(v * 32767.0f);
  }

  // Scrivi nel ring buffer
  bool ok = g_writer->WriteFrame(int16Data.data(), sampleCount);

  return Napi::Boolean::New(env, ok);
}

// Ottieni statistiche
Napi::Value GetStats(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Object stats = Napi::Object::New(env);

  if (g_writer) {
    stats.Set("framesWritten", g_writer->GetFramesWritten());
    stats.Set("framesDropped", g_writer->GetFramesDropped());
    stats.Set("bufferFill", g_writer->GetBufferFill());
  }

  return stats;
}

// Chiudi e cleanup
Napi::Value Shutdown(const Napi::CallbackInfo& info) {
  if (g_writer) {
    delete g_writer;
    g_writer = nullptr;
  }
  return info.Env().Undefined();
}

// Registra funzioni NAPI
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("initialize", Napi::Function::New(env, Initialize));
  exports.Set("writeAudioFrame", Napi::Function::New(env, WriteAudioFrame));
  exports.Set("getStats", Napi::Function::New(env, GetStats));
  exports.Set("shutdown", Napi::Function::New(env, Shutdown));
  return exports;
}

NODE_API_MODULE(audio_bridge, Init)
```

---

### 10.3 binding.gyp

```json
{
  "targets": [
    {
      "target_name": "audio_bridge",
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "sources": [
        "src/addon.cpp",
        "src/buffer-writer.cpp",
        "src/audio-writer.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "libraries": [],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='win'", {
          "libraries": ["-lkernel32"],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            }
          }
        }]
      ]
    }
  ]
}
```

---

### 10.4 TypeScript wrapper

```typescript
// native/audio-bridge/index.ts

const addon = require('./build/Release/audio_bridge.node');

export interface AudioBridgeStats {
  framesWritten: number;
  framesDropped: number;
  bufferFill: number;    // 0.0 - 1.0
}

export class AudioBridge {
  private initialized: boolean = false;

  initialize(): void {
    if (this.initialized) return;
    addon.initialize();
    this.initialized = true;
  }

  writeAudioFrame(frame: Float32Array): boolean {
    if (!this.initialized) return false;
    return addon.writeAudioFrame(frame);
  }

  getStats(): AudioBridgeStats {
    return addon.getStats();
  }

  shutdown(): void {
    if (this.initialized) {
      addon.shutdown();
      this.initialized = false;
    }
  }
}

export const audioBridge = new AudioBridge();
```

---

## 11. Struttura Repository Completa

```
soundboard-pro/
│
├── app/                           ← Electron + React app
│   ├── electron/
│   │   ├── main.ts               ← Main process
│   │   ├── preload.ts            ← Preload script
│   │   └── ipc/
│   │       ├── audio-ipc.ts
│   │       └── driver-ipc.ts
│   │
│   ├── renderer/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   └── components/
│   │       ├── Soundboard.tsx
│   │       ├── Settings.tsx
│   │       ├── VolumeSlider.tsx
│   │       ├── DeviceSelector.tsx
│   │       └── Monitoring.tsx
│   │
│   ├── audio-engine/
│   │   ├── index.ts              ← Entry point engine
│   │   ├── context.ts            ← AudioContext setup
│   │   ├── mixer.ts              ← Mixer digitale
│   │   ├── gain.ts               ← dB utilities
│   │   ├── compressor.ts         ← Compressor presets
│   │   ├── attenuation.ts        ← Sidechain attenuation
│   │   ├── vad.ts                ← Voice Activity Detection
│   │   ├── rnnoise-bridge.ts     ← RNNoise wrapper
│   │   ├── frame-accumulator.ts  ← Frame size adapter
│   │   ├── format-converter.ts   ← Float32/Int16
│   │   ├── routing.ts            ← Audio routing
│   │   └── worklets/
│   │       └── main-processor.worklet.ts
│   │
│   └── store/
│       ├── audio-store.ts        ← Zustand store
│       └── settings-store.ts
│
├── native/
│   ├── audio-bridge/             ← Node native addon
│   │   ├── src/
│   │   │   ├── addon.cpp
│   │   │   ├── shared-buffer.h
│   │   │   ├── buffer-writer.cpp
│   │   │   └── buffer-writer.h
│   │   ├── binding.gyp
│   │   ├── index.ts
│   │   └── index.d.ts
│   │
│   └── rnnoise/                  ← RNNoise optional native
│       └── wasm/
│           └── rnnoise.wasm
│
├── driver/
│   ├── sysvad-fork/              ← Fork SysVAD Microsoft
│   │   ├── sys/
│   │   │   ├── soundboard-mic.sys
│   │   │   ├── soundboard-mic.cpp
│   │   │   ├── minwavert.cpp
│   │   │   ├── minwavertstream.cpp
│   │   │   └── shared-buffer-reader.cpp
│   │   ├── soundboard-mic.inf
│   │   ├── soundboard-mic.cat   ← Generato dalla firma
│   │   └── CMakeLists.txt
│   │
│   └── installer/
│       ├── install-driver.cpp    ← Programma installazione
│       └── devcon-wrapper.cpp    ← Wrapper devcon tool
│
├── installer/
│   ├── soundboard.nsi            ← Script NSIS
│   ├── license.txt
│   └── assets/
│       ├── installer-banner.bmp
│       └── installer-header.bmp
│
├── scripts/
│   ├── build-driver.ps1          ← Build driver con WDK
│   ├── sign-driver.ps1           ← Firma driver
│   ├── test-mode.ps1             ← Abilita test mode Windows
│   └── dev-setup.ps1             ← Setup ambiente sviluppo
│
├── tests/
│   ├── audio-engine/
│   │   ├── gain.test.ts
│   │   ├── mixer.test.ts
│   │   └── latency.test.ts
│   └── driver/
│       └── shared-memory.test.cpp
│
├── docs/
│   ├── architecture.md
│   ├── driver-development.md
│   └── testing.md
│
├── package.json
├── tsconfig.json
├── electron-builder.yml
└── README.md
```

---

## 12. Roadmap Milestone Dettagliata

### Overview Timeline

```
Settimana 1-2   → FASE 1: Refactor audio engine
Settimana 3     → FASE 2: Mixer e routing completo
Settimana 4     → FASE 3: RNNoise integration
Settimana 5     → FASE 4: Native bridge base
Settimana 6-8   → FASE 5: Virtual mic driver
Settimana 9     → FASE 6: Bridge driver ↔ app
Settimana 10    → FASE 7: UI settings completa
Settimana 11    → FASE 8: Installer e packaging
Settimana 12    → FASE 9: Testing e bugfix
Settimana 13    → FASE 10: Driver signing e release
```

---

### M1 — Audio Engine Refactor

**Obiettivo:** Separare completamente UI e audio pipeline.

Deliverable:
- [ ] Modulo `audio-engine/` standalone
- [ ] AudioContext setup con latencyHint: 'interactive'
- [ ] GainNode con conversione dB corretta
- [ ] DynamicsCompressorNode configurato
- [ ] Test latency < 30ms

---

### M2 — Mixer Completo

**Obiettivo:** Mixer digitale con sorgenti multiple.

Deliverable:
- [ ] Mic input → mixer
- [ ] Soundboard clip → mixer
- [ ] Gain individuale per sorgente
- [ ] Master gain
- [ ] Routing → monitoring output (cuffie)
- [ ] Routing → virtual mic output

---

### M3 — RNNoise

**Obiettivo:** Noise suppression sul microfono.

Deliverable:
- [ ] RNNoise WASM caricato in AudioWorklet
- [ ] Frame accumulator (128 → 480 samples)
- [ ] Toggle on/off senza artifacts audio
- [ ] CPU usage < 2%

---

### M4 — Native Bridge Base

**Obiettivo:** Shared memory tra Electron e sistema.

Deliverable:
- [ ] Addon NAPI compilato
- [ ] CreateFileMapping / MapViewOfFile
- [ ] Ring buffer writer funzionante
- [ ] Float32 → Int16 conversion

---

### M5 — Virtual Mic Driver

**Obiettivo:** Il driver compare in Windows come microfono.

Deliverable:
- [ ] Fork SysVAD compilato
- [ ] Device appare in Device Manager
- [ ] Device appare in Sound Settings
- [ ] Formato 48kHz / 16bit / mono corretto
- [ ] Driver firmato in test mode

---

### M6 — Integrazione Driver ↔ App

**Obiettivo:** Audio scorre dall'app al driver.

Deliverable:
- [ ] Shared memory letta dal driver
- [ ] Audio appare in Voicemod / voice test
- [ ] Latenza end-to-end < 30ms misurata
- [ ] Nessun dropout in uso continuato (30min test)

---

### M7 — UI Settings Completa

**Obiettivo:** Tutte le impostazioni accessibili da UI.

Deliverable:
- [ ] Device selector per microfono input
- [ ] Device selector per monitoring output
- [ ] Toggle virtual mic on/off
- [ ] Volume slider per soundboard (dB)
- [ ] Volume slider per mic (dB)
- [ ] Toggle RNNoise
- [ ] Indicatore latenza real-time

---

### M8 — Installer

**Obiettivo:** Installazione one-click senza prerequisiti.

Deliverable:
- [ ] NSIS installer funzionante
- [ ] Driver installato automaticamente
- [ ] Virtual mic compare dopo install
- [ ] Uninstall rimuove driver correttamente
- [ ] Compatibile Windows 10 / 11

---

### M9 — Driver Signing (per distribuzione)

**Obiettivo:** Driver firmato da Microsoft per distribuzione pubblica.

Deliverable:
- [ ] EV Certificate acquistato
- [ ] Driver firmato con EV cert
- [ ] Sottomissione Microsoft Hardware Portal
- [ ] WHQL attestation ottenuta
- [ ] Installer funziona senza test mode

---

## 13. Implementazione Fase per Fase

### Fase 1: Setup progetto

```bash
# Setup iniziale repository
mkdir soundboard-pro
cd soundboard-pro
npm init -y

# Electron + TypeScript
npm install --save-dev electron electron-builder typescript ts-loader webpack
npm install --save-dev @types/node @electron/typescript-definitions

# React
npm install react react-dom
npm install --save-dev @types/react @types/react-dom

# Zustand
npm install zustand

# Audio
npm install @shiguredo/rnnoise-wasm

# Native addon
npm install --save-dev node-addon-api node-gyp
```

---

### Fase 2: AudioWorklet Module Setup

Il file worklet non può usare `import` normali. Deve essere bundled separatamente:

```javascript
// webpack.config.js (worklet bundle)
module.exports = [
  // Bundle principale
  { /* ... main app config ... */ },

  // Bundle AudioWorklet (separato)
  {
    entry: './app/audio-engine/worklets/main-processor.worklet.ts',
    output: {
      filename: 'audio-worklet.js',
      path: path.resolve(__dirname, 'dist'),
    },
    target: 'webworker',
  }
];
```

```typescript
// Registra il worklet nell'AudioContext
const ctx = new AudioContext({ latencyHint: 'interactive', sampleRate: 48000 });
await ctx.audioWorklet.addModule('./audio-worklet.js');

const workletNode = new AudioWorkletNode(ctx, 'main-processor');
```

---

## 14. Prompt Claude Code per ogni Modulo

### Prompt 1: Audio Engine Base

```
Create a TypeScript audio engine module for an Electron soundboard app.

File: app/audio-engine/index.ts

Requirements:
- Use Web Audio API only (no external libraries)
- AudioContext at 48kHz sample rate, latencyHint: 'interactive'
- Support multiple audio inputs (mic + soundboard clips)
- Internal digital mixer using ChannelMergerNode
- Gain control with dB to linear conversion (Discord formula: Math.pow(10, db/20))
- DynamicsCompressor configured for voice (threshold:-18, ratio:4, attack:0.003, release:0.25)
- Two output paths: monitoring (headphones) and virtual mic
- No external audio library dependencies

Functions to implement:
- createAudioEngine(config: AudioEngineConfig): AudioEngine
- addMicInput(deviceId: string): Promise<void>
- addSoundboardClip(id: string, audioBuffer: AudioBuffer): void
- playSoundboardClip(id: string): void
- setMicGainDb(db: number): void
- setSoundboardGainDb(db: number): void
- setMonitoringOutput(deviceId: string): void
- connectToVirtualMic(writeFn: (frame: Float32Array) => void): void

Include TypeScript types and JSDoc comments.
```

---

### Prompt 2: Gain e dB Utilities

```
Create a TypeScript module for audio gain and dB utilities.

File: app/audio-engine/gain.ts

Implement:
1. dbToGain(db: number): number
   - Formula: Math.pow(10, db / 20)

2. gainToDb(gain: number): number
   - Formula: 20 * Math.log10(gain)

3. sliderToDb(sliderValue: number): number
   - Input: 0-100 slider value
   - Output: dB value
   - Use Discord/Steam logarithmic curve: dB = -60 * (1 - v/100)^2
   - 0 → -60dB, 50 → ~-15dB, 100 → 0dB

4. dbToSlider(db: number): number
   - Inverse of sliderToDb

5. applyGain(buffer: Float32Array, gain: number): void
   - Modify buffer in-place

6. applySoftClipper(buffer: Float32Array): void
   - Apply tanh soft clipping in-place

Include a table in JSDoc comments showing dB → gain values.
Include unit tests using Jest.
```

---

### Prompt 3: RNNoise Integration

```
Integrate RNNoise WASM noise suppression into an Electron Web Audio pipeline.

Files:
- app/audio-engine/rnnoise-bridge.ts
- app/audio-engine/frame-accumulator.ts

Requirements:
- Use @shiguredo/rnnoise-wasm package
- Handle frame size mismatch: Web Audio uses 128 samples, RNNoise uses 480 samples
- FrameAccumulator class: accepts arbitrary size Float32Array chunks, returns 480-sample frames when available
- RNNoiseBridge class: wraps RNNoise WASM, processFrame(input: Float32Array): Float32Array
- Async initialization pattern
- Graceful fallback if WASM not available (pass-through)
- No memory allocation in the hot path after initialization

Include TypeScript types, error handling, and JSDoc.
```

---

### Prompt 4: AudioWorklet Processor

```
Create an AudioWorklet processor for a professional audio engine.

File: app/audio-engine/worklets/main-processor.worklet.ts

This runs in a dedicated audio thread. Requirements:
- Class: MainProcessor extends AudioWorkletProcessor
- Pre-allocate all buffers in constructor (no allocation in process())
- Support messages from main thread: SET_GAIN_DB, SET_COMPRESSOR_PARAMS, SET_RNNOISE_ENABLED
- Apply gain in-place using dbToGain formula
- Apply soft clipping (tanh)
- Forward processed audio to main thread via port.postMessage with Transferable Float32Array
- registerProcessor('main-processor', MainProcessor)

Note: this file is bundled separately as a Web Worker, no regular imports available.
Include all utility functions inline (dbToGain, applySoftClipper, etc.)
```

---

### Prompt 5: Native Bridge Shared Memory

```
Create a Node.js native addon (NAPI C++) for Windows shared memory audio bridge.

Files:
- native/audio-bridge/src/addon.cpp
- native/audio-bridge/src/shared-buffer.h
- native/audio-bridge/src/buffer-writer.cpp
- native/audio-bridge/binding.gyp

Requirements:
- Use node-addon-api (NAPI v8)
- Create named shared memory: "SoundboardAudioBuffer"
- SharedAudioBuffer struct: writePos, readPos, sampleRate, channels, bitsPerSample, frameSize, audioData[RING_BUFFER_SIZE]
- Lock-free ring buffer with Interlocked operations
- NAPI exported functions: initialize(), writeAudioFrame(Float32Array), getStats(), shutdown()
- Float32 to Int16 conversion in C++ (faster than JS)
- Windows only (CreateFileMapping, MapViewOfFile, InterlockedExchange)
- Error handling: throw JS exceptions for failures

Include TypeScript wrapper (index.ts) and type definitions (index.d.ts).
```

---

### Prompt 6: SysVAD Fork — Shared Memory Reader

```
Modify Microsoft SysVAD virtual audio driver to read audio from named shared memory.

Context: Fork of https://github.com/microsoft/Windows-driver-samples/tree/main/audio/sysvad

File to modify: EndpointsCommon/minwavertstream.cpp

Add:
1. In class CMiniportWaveRTStream, add member: SharedAudioBuffer* m_pSharedBuffer = nullptr;

2. Method: NTSTATUS OpenSharedMemory()
   - ZwOpenSection for "\BaseNamedObjects\SoundboardAudioBuffer"
   - ZwMapViewOfSection as PAGE_READONLY
   - Return STATUS_SUCCESS even if not found (driver works without app)

3. Override GetReadPacket() to:
   - Read one frame from ring buffer if available
   - Advance readPos with InterlockedExchange
   - Copy frame to m_pDmaBuffer
   - If buffer empty: RtlZeroMemory (silence)

4. Call OpenSharedMemory() in Init()

Device configuration:
- Name: L"Soundboard Virtual Microphone"
- Format: 48000 Hz, 16-bit PCM, 1 channel (mono)
- Frame size: 480 samples

Include SharedAudioBuffer struct matching the user-space definition.
Kernel-safe code only (no CRT, no STL, no exceptions).
```

---

### Prompt 7: UI Settings Component

```
Create a React TypeScript Settings component for a soundboard app.

File: app/renderer/components/Settings.tsx

UI sections:
1. Audio Devices
   - Mic input: dropdown di AudioInputDevice
   - Monitoring output: dropdown di AudioOutputDevice
   - Virtual mic: toggle (richiede driver)

2. Noise Suppression
   - Toggle RNNoise on/off
   - VAD threshold slider

3. Volume
   - Mic volume: slider 0-100 → dB (Discord curve)
   - Soundboard volume: slider 0-100 → dB

4. Diagnostics (collapsible)
   - Current latency (ms)
   - Frames written / dropped
   - Buffer fill %

Use Tailwind CSS for styling (dark theme, Discord-like).
Use Zustand store for state.
List AudioInputDevice[] and AudioOutputDevice[] from navigator.mediaDevices.enumerateDevices().
Slider uses Discord logarithmic curve (sliderToDb function).
```

---

### Prompt 8: NSIS Installer Script

```
Create an NSIS installer script for a Windows Electron app with a kernel driver.

File: installer/soundboard.nsi

App: "Soundboard Pro"
Version: 1.0.0

Installer must:
1. Install Electron app to Program Files\SoundboardPro
2. Run driver installer (installer\driver\install-driver.exe) silently
3. Create desktop shortcut
4. Create Start Menu entry
5. Register uninstaller

Uninstaller must:
1. Stop app if running
2. Remove driver (run install-driver.exe /uninstall)
3. Delete app files
4. Remove shortcuts
5. Clean registry

Requirements:
- Require admin rights (RequestExecutionLevel admin)
- Show progress for driver installation (can take 5-10 seconds)
- Handle driver install failure gracefully (show warning, continue)
- Windows 10+ only

Modern UI style with dark theme.
```

---

## 15. Testing e Validazione

### 15.1 Test latenza audio

```typescript
// tests/audio-engine/latency.test.ts

describe('Audio Latency', () => {
  it('AudioContext base latency should be < 10ms', async () => {
    const ctx = new AudioContext({ latencyHint: 'interactive', sampleRate: 48000 });
    expect(ctx.baseLatency * 1000).toBeLessThan(10);
    await ctx.close();
  });

  it('End-to-end pipeline latency should be < 30ms', async () => {
    // Misura il tempo dal momento in cui un campione audio entra
    // al momento in cui esce dall'AudioWorklet
    // Usa AudioContext.currentTime per misurare timing preciso
    const startTime = performance.now();

    // ... setup e misura ...

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(30);
  });
});
```

---

### 15.2 Test gain e dB

```typescript
// tests/audio-engine/gain.test.ts

describe('dB Conversions', () => {
  it('0 dB should be gain 1.0', () => {
    expect(dbToGain(0)).toBeCloseTo(1.0, 5);
  });

  it('-6 dB should be gain ~0.501', () => {
    expect(dbToGain(-6)).toBeCloseTo(0.501, 2);
  });

  it('-20 dB should be gain 0.1', () => {
    expect(dbToGain(-20)).toBeCloseTo(0.1, 5);
  });

  it('dbToGain and gainToDb should be inverse', () => {
    const testValues = [-60, -20, -12, -6, 0, 6, 12];
    for (const db of testValues) {
      expect(gainToDb(dbToGain(db))).toBeCloseTo(db, 5);
    }
  });

  it('Discord slider curve: 50% → ~-15 dB', () => {
    const db = sliderToDb(50);
    expect(db).toBeGreaterThan(-20);
    expect(db).toBeLessThan(-10);
  });

  it('sliderToDb and dbToSlider should be inverse', () => {
    for (let v = 0; v <= 100; v += 5) {
      expect(dbToSlider(sliderToDb(v))).toBeCloseTo(v, 0);
    }
  });
});
```

---

### 15.3 Test ring buffer

```cpp
// tests/driver/shared-memory.test.cpp

void TestRingBufferBasic() {
  SharedBufferWriter writer;
  writer.Initialize();

  // Scrivi un frame
  int16_t frame[480] = {};
  for (int i = 0; i < 480; i++) frame[i] = (int16_t)(i * 100);

  bool ok = writer.WriteFrame(frame, 480);
  assert(ok == true);

  // Leggi il frame (simula il driver)
  SharedAudioBuffer* buf = writer.GetBuffer();
  assert(buf->writePos == 1);
  assert(buf->readPos == 0);

  // Verifica contenuto
  int16_t* audioData = (int16_t*)buf->audioData;
  assert(audioData[5] == 500);

  printf("TestRingBufferBasic: PASSED\n");
}

void TestRingBufferFull() {
  SharedBufferWriter writer;
  writer.Initialize();

  int16_t frame[480] = {};

  // Riempi il buffer
  for (int i = 0; i < RING_BUFFER_FRAMES - 1; i++) {
    bool ok = writer.WriteFrame(frame, 480);
    assert(ok == true);
  }

  // Il prossimo write deve fallire (buffer pieno)
  bool ok = writer.WriteFrame(frame, 480);
  assert(ok == false);

  printf("TestRingBufferFull: PASSED\n");
}
```

---

### 15.4 Test driver manuale

**Setup Test Mode Windows:**
```powershell
# Script: scripts/test-mode.ps1
# Abilita la modalità test per driver non firmati

# Abilita test mode
bcdedit /set testsigning on

Write-Host "Riavvio necessario per abilitare test mode"
Write-Host "Dopo il riavvio, comparirà 'Test Mode' sul desktop"
```

**Installazione driver in test:**
```powershell
# Script: scripts/install-driver-test.ps1

# Installa il driver con devcon
$driverPath = ".\driver\sysvad-fork\soundboard-mic.inf"
.\devcon.exe install $driverPath "Root\SoundboardVirtualMic"

# Verifica installazione
.\devcon.exe status "Root\SoundboardVirtualMic"
```

---

### 15.5 Checklist testing completo

```
LATENZA
[ ] AudioContext.baseLatency < 10ms
[ ] Primo suono soundboard < 50ms da click
[ ] Latenza end-to-end (mic → virtual mic) < 30ms
[ ] Nessun jitter > 5ms in uso normale

AUDIO QUALITY
[ ] Nessun click/pop all'avvio
[ ] Nessun click/pop al cambio volume
[ ] RNNoise riduce rumore ventola
[ ] Compressor non distorce voce normale

STABILITÀ
[ ] 30 minuti uso continuo senza dropout
[ ] Nessuna memory leak (task manager)
[ ] CPU < 5% in idle, < 15% con processing attivo

DRIVER
[ ] Compare in Sound Settings > Input devices
[ ] Audio arriva correttamente in Discord
[ ] Driver non crasha su sospensione PC
[ ] Driver si riavvia dopo sleep

INSTALLER
[ ] Installazione su Windows 10 clean
[ ] Installazione su Windows 11
[ ] Uninstall rimuove tutto
[ ] Nessun reboot richiesto (idealmente)
```

---

## 16. Installer e Distribuzione

### 16.1 Struttura installer NSIS

```
installer/
├── soundboard.nsi          ← Script principale
├── license.txt
├── assets/
│   ├── banner.bmp          ← 164x314px
│   └── header.bmp          ← 150x57px
└── scripts/
    ├── install-driver.ps1  ← Installazione driver
    └── uninstall-driver.ps1
```

---

### 16.2 Processo di firma driver (produzione)

**Step 1: Acquista EV Certificate**
- Fornitori: DigiCert, Sectigo, GlobalSign
- Costo: ~300-500€/anno
- Tempo: 1-5 giorni per verifica identità aziendale

**Step 2: Firma il driver con EV cert**
```powershell
# Sign con signtool
signtool sign /v /n "SoundboardApp Srl" /t http://timestamp.digicert.com soundboard-mic.sys
signtool sign /v /n "SoundboardApp Srl" /t http://timestamp.digicert.com soundboard-mic.cat
```

**Step 3: Sottomissione Microsoft Hardware Portal**
1. Vai su: https://partner.microsoft.com/dashboard/hardware
2. Crea nuovo submission
3. Carica il .cab con driver firmato
4. Richiedi "Attestation signing" (non WHQL completo)
5. Tempo: 1-3 giorni lavorativi

**Step 4: Installa driver firmato Microsoft**
```powershell
# Con driver Microsoft-signed, nessun test mode necessario
# Funziona su tutti i Windows 10/11 standard
.\devcon.exe install soundboard-mic.inf "Root\SoundboardVirtualMic"
```

---

### 16.3 Auto-update con electron-updater

```typescript
// app/electron/updater.ts

import { autoUpdater } from 'electron-updater';

export function setupAutoUpdater(): void {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    // Mostra notifica
  });

  autoUpdater.on('update-downloaded', () => {
    // Chiedi all'utente se vuole installare ora
    autoUpdater.quitAndInstall();
  });
}
```

---

## 17. Ottimizzazioni e Tuning

### 17.1 Ridurre latenza sotto 15ms

**1. Usa AudioContext con latencyHint: 'playback' per test, 'interactive' per produzione**

Non usare mai `latencyHint: 'balanced'` per un'app VoIP/soundboard.

**2. Evita AudioContext suspension**

Chromium sospende l'AudioContext quando non ci sono interazioni utente. Per evitarlo:
```typescript
// Metti in play un silent oscillator per mantenere il context attivo
const osc = ctx.createOscillator();
const gainNode = ctx.createGain();
gainNode.gain.value = 0; // Volume 0
osc.connect(gainNode);
gainNode.connect(ctx.destination);
osc.start();
```

**3. Buffer pre-caching per soundboard**

Invece di decodificare l'audio al momento del click, pre-carica tutti i clip all'avvio:
```typescript
// Precarica tutti i suoni all'avvio
const preloadedBuffers = new Map<string, AudioBuffer>();

async function preloadAll(clips: SoundClip[]): Promise<void> {
  for (const clip of clips) {
    const response = await fetch(clip.url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    preloadedBuffers.set(clip.id, audioBuffer);
  }
}

// Al click: nessuna latenza, buffer già pronto
function playClip(id: string): void {
  const buffer = preloadedBuffers.get(id);
  if (!buffer) return;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(mixerInputNode);
  source.start(ctx.currentTime); // Immediato
}
```

**4. Stagger il processing RNNoise**

Se RNNoise è troppo lento su CPU lenta, puoi processare ogni altro frame (latenza +10ms ma CPU dimezzata):
```typescript
let frameCount = 0;
function processFrame(frame: Float32Array): Float32Array {
  frameCount++;
  if (frameCount % 2 === 0) {
    return rnnoiseProcess(frame);
  }
  return previousProcessedFrame;
}
```

---

### 17.2 CPU optimization

**Usa OfflineAudioContext per normalizzazione**

Invece di normalizzare l'audio in real-time, pre-normalizza i clip all'importazione:
```typescript
async function normalizeClip(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
  // Crea OfflineAudioContext per processing non real-time
  const offline = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  const source = offline.createBufferSource();
  source.buffer = audioBuffer;

  const normalizer = offline.createDynamicsCompressor();
  normalizer.threshold.value = -0.5;
  normalizer.ratio.value = 20;
  normalizer.attack.value = 0.001;

  source.connect(normalizer);
  normalizer.connect(offline.destination);
  source.start();

  return offline.startRendering();
}
```

---

### 17.3 Memory optimization

```typescript
// Rilascia AudioBuffer non più utilizzati
function unloadClip(id: string): void {
  const buffer = preloadedBuffers.get(id);
  if (buffer) {
    preloadedBuffers.delete(id);
    // Il GC rilascerà la memoria automaticamente
    // Non esiste buffer.free() in Web Audio API
  }
}

// Monitora memoria
function getMemoryUsage(): { heapUsed: number; heapTotal: number } {
  return process.memoryUsage();
}
```

---

## 18. Riferimenti e Risorse

### Documentazione Ufficiale

- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **AudioWorklet**: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
- **Windows Driver Kit (WDK)**: https://learn.microsoft.com/en-us/windows-hardware/drivers/audio/
- **SysVAD Sample**: https://github.com/microsoft/Windows-driver-samples/tree/main/audio/sysvad
- **node-addon-api**: https://github.com/nodejs/node-addon-api

### Librerie

- **RNNoise**: https://github.com/xiph/rnnoise
- **@shiguredo/rnnoise-wasm**: https://github.com/shiguredo/rnnoise-wasm
- **Electron**: https://www.electronjs.org/
- **Zustand**: https://github.com/pmndrs/zustand
- **electron-builder**: https://www.electron.build/

### Tools

- **Windows Driver Kit**: https://learn.microsoft.com/en-us/windows-hardware/drivers/download-the-wdk
- **signtool**: incluso in Windows SDK
- **devcon**: incluso in WDK samples
- **NSIS**: https://nsis.sourceforge.io/

### Competitor da studiare

- **Voicemod**: virtual mic + effects
- **SteelSeries Sonar**: virtual mic + mixer
- **NVIDIA Broadcast**: AI noise + virtual mic
- **OBS Virtual Camera/Mic**: open source reference

### Standard di riferimento

- **Opus codec**: https://opus-codec.org/ (standard VoIP moderno)
- **WebRTC Audio Processing Module**: https://chromium.googlesource.com/external/webrtc
- **EBU R 128**: standard loudness per audio broadcast (-23 LUFS)
- **ITU-T P.800**: metodo di valutazione qualità audio VoIP

---

## Appendice A: Checklist Pre-Release

```
PRE-ALPHA (uso interno)
[x] Audio engine funzionante
[x] Mixer mic + soundboard
[x] dB conversion corretta
[ ] RNNoise integrato
[ ] Native bridge compilato
[ ] Driver in test mode funzionante

ALPHA (beta tester)
[ ] Driver firmato (test mode)
[ ] Installer funzionante
[ ] All settings UI complete
[ ] Latency < 30ms verified
[ ] 30min stability test passed

BETA (distribuzione limitata)
[ ] Driver firmato Microsoft (attestation)
[ ] Installer senza test mode
[ ] Compatibilità W10/W11 verificata
[ ] Auto-updater funzionante
[ ] Crash reporting (Sentry)

RELEASE
[ ] WHQL o attestation Microsoft
[ ] Code signing app (Authenticode)
[ ] Privacy policy
[ ] Telemetry opt-in
[ ] Support docs
```

---

## Appendice B: Troubleshooting Comune

### Problema: Driver non compare in Sound Settings
**Causa:** Driver non firmato in produzione, oppure hardware ID non riconosciuto  
**Soluzione:** Verifica test mode attivo (`bcdedit /enum | grep testsigning`), reinstalla con devcon

### Problema: Audio con glitch / dropout
**Causa:** Buffer troppo piccolo, o thread audio preempted  
**Soluzione:** Aumenta buffer ring da 8 a 16 frame; verifica che `latencyHint: 'interactive'`

### Problema: RNNoise causa latenza eccessiva
**Causa:** Frame accumulator troppo grande, o WASM non ottimizzato  
**Soluzione:** Verifica che il frame size sia esattamente 480; controlla che WASM sia compilato con `-O3`

### Problema: Native addon si crasha in produzione
**Causa:** Node.js versione incompatibile con NAPI  
**Soluzione:** Usa NAPI v8 (stabile tra versioni Node); esegui `electron-rebuild` dopo ogni `npm install`

### Problema: Installer fallisce su Windows 10 1903
**Causa:** API di installazione driver cambiate  
**Soluzione:** Usa devcon.exe dalla versione WDK 10.0.19041 o superiore

---

*Documento V3 Ultra — Blueprint Completo Soundboard Pro*  
*Generato per sviluppo con Claude Code*  
*Revisione: Marzo 2024*
