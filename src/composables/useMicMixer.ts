import { ref, watch } from 'vue';
import { useConfigStore } from '../stores/config';
import { AudioContextState } from '../enums/audio';
import { AUDIO_SAMPLE_RATE, GAIN_RAMP_DURATION } from '../enums/constants';
import { sliderToGain } from '../utils/db';
import { log } from '../utils/logger';
import { trySetSinkId, applyCompressorPreset } from '../utils/audio';
import { createNoiseSuppressionNode, destroyNoiseSuppressionNode } from '../audio/rnnoise-processor';
import { getVBCableSampleRate } from '../services/api';

interface AudioContextWithSinkId extends AudioContext {
  setSinkId?: (sinkId: string) => Promise<void>;
}

const isMicActive = ref(false);
const micError = ref('');

let audioCtx: AudioContextWithSinkId | null = null;
let micStream: MediaStream | null = null;
let micSource: MediaStreamAudioSourceNode | null = null;
let micGain: GainNode | null = null;
let sbGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let noiseSuppressionNode: ScriptProcessorNode | null = null;

// Mic monitor: separate AudioContext routed to speakers so user hears themselves
let monitorCtx: AudioContextWithSinkId | null = null;
let monitorSource: MediaStreamAudioSourceNode | null = null;
let monitorGain: GainNode | null = null;

// Track MediaElementSourceNodes — each element can only be connected once
const connectedElements = new WeakSet<HTMLMediaElement>();

// Cached VB-CABLE sample rate (0 = not detected, use default)
let vbCableSampleRate = 0;
let vbCableRateLoaded = false;

function rampGain(gainNode: GainNode | null, sliderValue: number, ctx?: AudioContextWithSinkId | null) {
  const context = ctx || audioCtx;
  if (gainNode && context) {
    gainNode.gain.linearRampToValueAtTime(sliderToGain(sliderValue), context.currentTime + GAIN_RAMP_DURATION);
  }
}

let initialized = false;

export function useMicMixer() {
  const config = useConfigStore();

  async function loadVBCableRate(): Promise<void> {
    if (vbCableRateLoaded) return;
    vbCableRateLoaded = true;
    try {
      vbCableSampleRate = await getVBCableSampleRate();
      if (vbCableSampleRate) {
        log.info(`[MicMixer] VB-CABLE sample rate: ${vbCableSampleRate} Hz`);
      }
    } catch {
      // Not on Windows or IPC failed — use default
    }
  }

  function ensureContext(): AudioContextWithSinkId {
    if (!audioCtx || audioCtx.state === AudioContextState.CLOSED) {
      // Match VB-CABLE's native sample rate to avoid double resampling
      const sampleRate = vbCableSampleRate || AUDIO_SAMPLE_RATE;
      audioCtx = new AudioContext({
        sampleRate,
        latencyHint: config.latencyHint as AudioContextLatencyCategory,
      }) as AudioContextWithSinkId;

      micGain = audioCtx.createGain();
      micGain.gain.value = sliderToGain(config.micVolume);
      micGain.connect(audioCtx.destination);

      sbGain = audioCtx.createGain();
      sbGain.gain.value = sliderToGain(config.soundboardVolume);

      compressor = audioCtx.createDynamicsCompressor();
      applyCompressorPreset(compressor, config.compressorPreset);
      compressor.connect(audioCtx.destination);

      sbGain.connect(compressor);

      // If compressor is disabled, bypass by setting ratio to 1
      if (!config.enableCompressor) {
        compressor.ratio.value = 1;
      }
    }
    return audioCtx;
  }

  async function setSinkId(deviceId: string) {
    const ctx = ensureContext();
    if (ctx.setSinkId && deviceId) {
      await ctx.setSinkId(deviceId);
    }
  }

  async function startMic() {
    // Clean up any existing mic connection to prevent leaked streams
    stopMic();
    micError.value = '';
    if (!config.virtualMicDeviceId) {
      log.warn('[MicMixer] No virtual mic device configured, skipping mic start');
      return;
    }
    try {
      await loadVBCableRate();
      const ctx = ensureContext();

      // Set output to virtual mic — if this fails, abort to prevent mic leaking to speakers
      if (ctx.setSinkId && config.virtualMicDeviceId) {
        try {
          await ctx.setSinkId(config.virtualMicDeviceId);
        } catch (sinkErr) {
          log.error('[MicMixer] Virtual mic device not found, aborting mic start:', sinkErr);
          micError.value = 'Virtual mic device not found';
          return;
        }
      }

      if (ctx.state === AudioContextState.SUSPENDED) {
        await ctx.resume();
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          ...(config.micDeviceId ? { deviceId: { exact: config.micDeviceId } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      };
      micStream = await navigator.mediaDevices.getUserMedia(constraints);

      micSource = ctx.createMediaStreamSource(micStream);

      if (config.enableNoiseSuppression) {
        noiseSuppressionNode = await createNoiseSuppressionNode(ctx);
      }
      if (noiseSuppressionNode) {
        micSource.connect(noiseSuppressionNode);
        noiseSuppressionNode.connect(micGain!);
      } else {
        micSource.connect(micGain!);
      }

      isMicActive.value = true;
    } catch (err) {
      micError.value = (err as Error).message;
      isMicActive.value = false;
      log.error('[MicMixer] Mic capture failed:', err);
    }
  }

  function stopMic() {
    if (micSource) {
      micSource.disconnect();
      micSource = null;
    }
    destroyNoiseSuppressionNode();
    noiseSuppressionNode = null;
    if (micStream) {
      for (const track of micStream.getTracks()) {
        track.stop();
      }
      micStream = null;
    }
    isMicActive.value = false;
  }

  async function startMonitor() {
    await stopMonitor();
    if (!micStream) return;
    try {
      monitorCtx = new AudioContext({
        sampleRate: AUDIO_SAMPLE_RATE,
        latencyHint: config.latencyHint as AudioContextLatencyCategory,
      }) as AudioContextWithSinkId;

      if (monitorCtx.setSinkId && config.speakerDeviceId) {
        await trySetSinkId(monitorCtx, config.speakerDeviceId, 'monitor speaker');
      }

      monitorGain = monitorCtx.createGain();
      monitorGain.gain.value = sliderToGain(config.micVolume);
      monitorGain.connect(monitorCtx.destination);

      monitorSource = monitorCtx.createMediaStreamSource(micStream);
      monitorSource.connect(monitorGain);
    } catch (err) {
      log.error('[MicMixer] Monitor start failed:', err);
      stopMonitor();
    }
  }

  async function stopMonitor() {
    if (monitorSource) {
      monitorSource.disconnect();
      monitorSource = null;
    }
    if (monitorCtx && monitorCtx.state !== AudioContextState.CLOSED) {
      await monitorCtx.close();
    }
    monitorCtx = null;
    monitorGain = null;
  }

  function connectSoundboardAudio(audioElement: HTMLMediaElement) {
    const ctx = ensureContext();

    // Each HTMLMediaElement can only have one MediaElementSourceNode
    if (connectedElements.has(audioElement)) {
      return;
    }

    const source = ctx.createMediaElementSource(audioElement);
    source.connect(sbGain!);
    connectedElements.add(audioElement);
  }

  function getAudioContext(): AudioContextWithSinkId | null {
    return audioCtx;
  }

  async function dispose() {
    stopMonitor();
    stopMic();
    if (audioCtx && audioCtx.state !== AudioContextState.CLOSED) {
      await audioCtx.close();
    }
    audioCtx = null;
    micGain = null;
    sbGain = null;
    compressor = null;
    noiseSuppressionNode = null;
  }

  // Setup watchers (only once)
  if (!initialized) {
    initialized = true;

    // --- Volume watchers ---

    watch(() => config.micVolume, (v) => {
      rampGain(micGain, v);
      rampGain(monitorGain, v, monitorCtx);
    });

    watch(() => config.soundboardVolume, (v) => {
      rampGain(sbGain, v);
    });

    // --- Feature toggle watchers ---

    watch(() => config.enableMicPassthrough, async (enabled) => {
      if (enabled) {
        await startMic();
        if (config.enableMicMonitor) {
          await startMonitor();
        }
      } else {
        await stopMonitor();
        stopMic();
      }
    });

    watch(() => config.enableMicMonitor, async (enabled) => {
      if (enabled && isMicActive.value) {
        await startMonitor();
      } else {
        await stopMonitor();
      }
    });

    // --- Device watchers ---

    watch(() => config.micDeviceId, async () => {
      if (config.enableMicPassthrough && isMicActive.value) {
        await stopMonitor();
        stopMic();
        await startMic();
        if (config.enableMicMonitor) {
          await startMonitor();
        }
      }
    });

    watch(() => config.virtualMicDeviceId, async (deviceId) => {
      if (audioCtx && audioCtx.state !== AudioContextState.CLOSED) {
        await setSinkId(deviceId);
      }
      // Start mic if passthrough is enabled but mic wasn't started yet (no device before)
      if (deviceId && config.enableMicPassthrough && !isMicActive.value) {
        await startMic();
      }
    });

    watch(() => config.speakerDeviceId, async (deviceId) => {
      if (monitorCtx && monitorCtx.state !== AudioContextState.CLOSED && monitorCtx.setSinkId && deviceId) {
        try {
          await monitorCtx.setSinkId(deviceId);
        } catch (err) {
          log.error('[MicMixer] Failed to set monitor sinkId:', err);
        }
      }
    });

    // --- Audio engine watchers ---

    watch(() => config.latencyHint, async () => {
      // Recreate audio contexts with new latency hint
      const wasMicActive = isMicActive.value;
      const wasMonitoring = !!monitorCtx && monitorCtx.state !== AudioContextState.CLOSED;
      await dispose();
      if (wasMicActive) {
        await startMic();
        if (wasMonitoring) {
          await startMonitor();
        }
      }
    });

    watch(() => config.enableCompressor, (enabled) => {
      if (!compressor) return;
      if (enabled) {
        applyCompressorPreset(compressor, config.compressorPreset);
      } else {
        compressor.ratio.value = 1;
      }
    });

    watch(() => config.compressorPreset, (preset) => {
      if (!compressor || !config.enableCompressor) return;
      applyCompressorPreset(compressor, preset);
    });

    watch(() => config.enableNoiseSuppression, async () => {
      if (config.enableMicPassthrough && isMicActive.value) {
        await stopMonitor();
        stopMic();
        await startMic();
        if (config.enableMicMonitor) {
          await startMonitor();
        }
      }
    });
  }

  return {
    isMicActive,
    micError,
    startMic,
    stopMic,
    connectSoundboardAudio,
    ensureContext,
    setSinkId,
    getAudioContext,
    dispose
  };
}
