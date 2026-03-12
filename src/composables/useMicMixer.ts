import { ref, watch } from 'vue';
import { useConfigStore } from '../stores/config';
import { AudioContextState } from '../enums/audio';
import { AUDIO_SAMPLE_RATE, GAIN_RAMP_DURATION, COMPRESSOR_PRESETS } from '../enums/constants';
import { sliderToGain } from '../utils/db';

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

// Mic monitor: separate AudioContext routed to speakers so user hears themselves
let monitorCtx: AudioContextWithSinkId | null = null;
let monitorSource: MediaStreamAudioSourceNode | null = null;
let monitorGain: GainNode | null = null;

// Track MediaElementSourceNodes — each element can only be connected once
const connectedElements = new WeakSet<HTMLMediaElement>();

function rampGain(gainNode: GainNode | null, sliderValue: number, ctx?: AudioContextWithSinkId | null) {
  const context = ctx || audioCtx;
  if (gainNode && context) {
    gainNode.gain.linearRampToValueAtTime(sliderToGain(sliderValue), context.currentTime + GAIN_RAMP_DURATION);
  }
}

function applyCompressorPreset(comp: DynamicsCompressorNode) {
  const preset = COMPRESSOR_PRESETS.SOUNDBOARD;
  comp.threshold.value = preset.threshold;
  comp.knee.value = preset.knee;
  comp.ratio.value = preset.ratio;
  comp.attack.value = preset.attack;
  comp.release.value = preset.release;
}

let initialized = false;

export function useMicMixer() {
  const config = useConfigStore();

  function ensureContext(): AudioContextWithSinkId {
    if (!audioCtx || audioCtx.state === AudioContextState.CLOSED) {
      audioCtx = new AudioContext({
        sampleRate: AUDIO_SAMPLE_RATE,
        latencyHint: config.latencyHint as AudioContextLatencyCategory,
      }) as AudioContextWithSinkId;

      micGain = audioCtx.createGain();
      micGain.gain.value = sliderToGain(config.micVolume);
      micGain.connect(audioCtx.destination);

      sbGain = audioCtx.createGain();
      sbGain.gain.value = sliderToGain(config.soundboardVolume);

      compressor = audioCtx.createDynamicsCompressor();
      applyCompressorPreset(compressor);
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
      console.warn('[MicMixer] No virtual mic device configured, skipping mic start');
      return;
    }
    try {
      const ctx = ensureContext();

      // Set output to virtual mic — if this fails, abort to prevent mic leaking to speakers
      if (ctx.setSinkId && config.virtualMicDeviceId) {
        try {
          await ctx.setSinkId(config.virtualMicDeviceId);
        } catch (sinkErr) {
          console.error('[MicMixer] Virtual mic device not found, aborting mic start:', sinkErr);
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
      micSource.connect(micGain!);
      isMicActive.value = true;
    } catch (err) {
      micError.value = (err as Error).message;
      isMicActive.value = false;
      console.error('[MicMixer] Mic capture failed:', err);
    }
  }

  function stopMic() {
    if (micSource) {
      micSource.disconnect();
      micSource = null;
    }
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
        try {
          await monitorCtx.setSinkId(config.speakerDeviceId);
        } catch (err) {
          console.warn('[MicMixer] Monitor setSinkId failed for speaker device', config.speakerDeviceId, '— using default output:', err);
        }
      }

      monitorGain = monitorCtx.createGain();
      monitorGain.gain.value = sliderToGain(config.micVolume);
      monitorGain.connect(monitorCtx.destination);

      monitorSource = monitorCtx.createMediaStreamSource(micStream);
      monitorSource.connect(monitorGain);
    } catch (err) {
      console.error('[MicMixer] Monitor start failed:', err);
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
  }

  // Setup watchers (only once)
  if (!initialized) {
    initialized = true;

    watch(() => config.micVolume, (v) => {
      rampGain(micGain, v);
      rampGain(monitorGain, v, monitorCtx);
    });

    watch(() => config.soundboardVolume, (v) => {
      rampGain(sbGain, v);
    });

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

    watch(() => config.enableMicMonitor, async (enabled) => {
      if (enabled && isMicActive.value) {
        await startMonitor();
      } else {
        await stopMonitor();
      }
    });

    watch(() => config.speakerDeviceId, async (deviceId) => {
      if (monitorCtx && monitorCtx.state !== AudioContextState.CLOSED && monitorCtx.setSinkId && deviceId) {
        try {
          await monitorCtx.setSinkId(deviceId);
        } catch (err) {
          console.error('[MicMixer] Failed to set monitor sinkId:', err);
        }
      }
    });

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
        compressor.ratio.value = COMPRESSOR_PRESETS.SOUNDBOARD.ratio;
      } else {
        compressor.ratio.value = 1;
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
