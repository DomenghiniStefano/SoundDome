import { ref, watch } from 'vue';
import { useConfigStore } from '../stores/config';

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

// Track MediaElementSourceNodes — each element can only be connected once
const connectedElements = new WeakSet<HTMLMediaElement>();

let initialized = false;

export function useMicMixer() {
  const config = useConfigStore();

  function ensureContext(): AudioContextWithSinkId {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext({ sampleRate: 48000 }) as AudioContextWithSinkId;
      micGain = audioCtx.createGain();
      micGain.gain.value = config.micVolume / 100;
      micGain.connect(audioCtx.destination);

      sbGain = audioCtx.createGain();
      sbGain.gain.value = config.outputVolume / 100;
      sbGain.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  async function setSinkId(deviceId: string) {
    const ctx = ensureContext();
    if (ctx.setSinkId && deviceId) {
      try {
        await ctx.setSinkId(deviceId);
        console.log('[MicMixer] setSinkId done, current sinkId:', (ctx as unknown as { sinkId: string }).sinkId);
      } catch (err) {
        console.error('[MicMixer] Failed to set AudioContext sinkId:', err);
      }
    } else {
      console.warn('[MicMixer] setSinkId skipped — available:', !!ctx.setSinkId, 'deviceId:', deviceId);
    }
  }

  async function startMic() {
    micError.value = '';
    try {
      const ctx = ensureContext();
      console.log('[MicMixer] AudioContext state:', ctx.state, 'sampleRate:', ctx.sampleRate);
      console.log('[MicMixer] setSinkId available:', !!ctx.setSinkId);
      console.log('[MicMixer] virtualMicDeviceId:', config.virtualMicDeviceId);

      await setSinkId(config.virtualMicDeviceId);

      if (ctx.state === 'suspended') {
        await ctx.resume();
        console.log('[MicMixer] AudioContext resumed, state:', ctx.state);
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          ...(config.micDeviceId ? { deviceId: { exact: config.micDeviceId } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      };
      console.log('[MicMixer] getUserMedia constraints:', JSON.stringify(constraints));
      micStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[MicMixer] Got mic stream, tracks:', micStream.getAudioTracks().map(t => t.label));

      micSource = ctx.createMediaStreamSource(micStream);
      micSource.connect(micGain!);
      isMicActive.value = true;
      console.log('[MicMixer] Mic connected and active');
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

  async function dispose() {
    stopMic();
    if (audioCtx && audioCtx.state !== 'closed') {
      await audioCtx.close();
    }
    audioCtx = null;
    micGain = null;
    sbGain = null;
  }

  // Setup watchers (only once)
  if (!initialized) {
    initialized = true;

    watch(() => config.micVolume, (v) => {
      if (micGain && audioCtx) {
        micGain.gain.linearRampToValueAtTime(v / 100, audioCtx.currentTime + 0.05);
      }
    });

    watch(() => config.outputVolume, (v) => {
      if (sbGain && audioCtx) {
        sbGain.gain.linearRampToValueAtTime(v / 100, audioCtx.currentTime + 0.05);
      }
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
      if (audioCtx && audioCtx.state !== 'closed') {
        await setSinkId(deviceId);
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
    dispose
  };
}
