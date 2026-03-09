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

// Track MediaElementSourceNodes — each element can only be connected once
const connectedElements = new WeakSet<HTMLMediaElement>();

function rampGain(gainNode: GainNode | null, sliderValue: number) {
  if (gainNode && audioCtx) {
    gainNode.gain.linearRampToValueAtTime(sliderToGain(sliderValue), audioCtx.currentTime + GAIN_RAMP_DURATION);
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
        latencyHint: 'interactive' as AudioContextLatencyCategory,
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
      try {
        await ctx.setSinkId(deviceId);
      } catch (err) {
        console.error('[MicMixer] Failed to set AudioContext sinkId:', err);
      }
    }
  }

  async function startMic() {
    micError.value = '';
    try {
      const ctx = ensureContext();

      await setSinkId(config.virtualMicDeviceId);

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
    });

    watch(() => config.soundboardVolume, (v) => {
      rampGain(sbGain, v);
    });

    watch(() => config.enableMicPassthrough, async (enabled) => {
      if (enabled) {
        await startMic();
      } else {
        stopMic();
      }
    });

    watch(() => config.micDeviceId, async () => {
      if (config.enableMicPassthrough && isMicActive.value) {
        stopMic();
        await startMic();
      }
    });

    watch(() => config.virtualMicDeviceId, async (deviceId) => {
      if (audioCtx && audioCtx.state !== AudioContextState.CLOSED) {
        await setSinkId(deviceId);
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
