import { ref } from 'vue';
import { useConfigStore } from '../stores/config';
import { getSoundPath } from '../services/api';
import { useMicMixer } from './useMicMixer';
import { i18n } from '../i18n';

const activeAudios = ref<HTMLAudioElement[]>([]);
const activeBrowseAudio = ref<HTMLAudioElement | null>(null);
const previewAudio = ref<HTMLAudioElement | null>(null);
const playingCardId = ref<string | null>(null);
const isTestPlaying = ref(false);

export function useAudio() {
  const config = useConfigStore();
  const mixer = useMicMixer();

  function stopAll() {
    for (const audio of activeAudios.value) {
      audio.pause();
      audio.currentTime = 0;
    }
    activeAudios.value = [];
    isTestPlaying.value = false;
  }

  function stopBrowse() {
    if (activeBrowseAudio.value) {
      activeBrowseAudio.value.pause();
      activeBrowseAudio.value.currentTime = 0;
      activeBrowseAudio.value = null;
    }
    playingCardId.value = null;
  }

  async function playRouted(url: string, cardId?: string) {
    stopBrowse();
    stopAll();

    if (cardId) playingCardId.value = cardId;

    const toSpeakers = config.sendToSpeakers;
    const toVirtualMic = config.sendToVirtualMic;

    if (!toSpeakers && !toVirtualMic) {
      const audio = new Audio(url);
      audio.volume = config.monitorVolume / 100;
      try {
        await audio.play();
        activeBrowseAudio.value = audio;
        audio.addEventListener('ended', () => {
          playingCardId.value = null;
        });
      } catch {
        playingCardId.value = null;
      }
      return;
    }

    const audios: HTMLAudioElement[] = [];

    if (toVirtualMic) {
      const audio = new Audio(url);
      audio.volume = config.outputVolume / 100;
      try {
        if (config.enableMicPassthrough && mixer.isMicActive.value) {
          // Route through AudioContext mixer (mic + soundboard → VB-CABLE)
          await mixer.setSinkId(config.virtualMicDeviceId);
          mixer.connectSoundboardAudio(audio);
          await audio.play();
        } else {
          await audio.setSinkId(config.virtualMicDeviceId);
          await audio.play();
        }
        audios.push(audio);
      } catch (err) {
        console.error('Error playing to Virtual Mic:', err);
      }
    }

    if (toSpeakers) {
      const audio = new Audio(url);
      audio.volume = config.monitorVolume / 100;
      try {
        await audio.setSinkId(config.speakerDeviceId);
        await audio.play();
        audios.push(audio);
      } catch (err) {
        console.error('Error playing to Speakers:', err);
      }
    }

    if (audios.length > 0) {
      activeBrowseAudio.value = audios[0];
      audios.forEach(a => {
        a.addEventListener('ended', () => {
          const allDone = audios.every(x => x.ended || x.paused);
          if (allDone) {
            playingCardId.value = null;
          }
        });
      });
    } else {
      playingCardId.value = null;
    }
  }

  function preview(url: string) {
    if (previewAudio.value) {
      previewAudio.value.pause();
      previewAudio.value.currentTime = 0;
    }
    const audio = new Audio(url);
    audio.volume = config.monitorVolume / 100;
    audio.play().catch(() => {});
    previewAudio.value = audio;
  }

  async function playTest() {
    stopAll();

    const toSpeakers = config.sendToSpeakers;
    const toVirtualMic = config.sendToVirtualMic;

    const t = i18n.global.t;

    if (!toSpeakers && !toVirtualMic) {
      return { success: false, message: t('audio.enableOneOutput') };
    }

    const soundPath = await getSoundPath();
    const soundUrl = `file://${soundPath}`;
    isTestPlaying.value = true;

    const targets: Promise<HTMLAudioElement | null>[] = [];

    if (toSpeakers) {
      targets.push(playSoundToDevice(soundUrl, config.speakerDeviceId, true));
    }
    if (toVirtualMic) {
      targets.push(playSoundToDevice(soundUrl, config.virtualMicDeviceId, false));
    }

    const results = await Promise.all(targets);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      const labels: string[] = [];
      if (toSpeakers) labels.push(t('audio.speakers'));
      if (toVirtualMic) labels.push(t('audio.virtualMic'));

      for (const audio of activeAudios.value) {
        audio.addEventListener('ended', () => {
          const allEnded = activeAudios.value.every(a => a.ended || a.paused);
          if (allEnded) {
            isTestPlaying.value = false;
          }
        });
      }

      return { success: true, message: t('audio.playingTo', { targets: labels.join(' + ') }) };
    }

    isTestPlaying.value = false;
    return { success: false, message: t('audio.playbackFailed') };
  }

  async function playSoundToDevice(url: string, deviceId: string, isMonitor: boolean): Promise<HTMLAudioElement | null> {
    const audio = new Audio(url);
    audio.volume = (isMonitor ? config.monitorVolume : config.outputVolume) / 100;
    try {
      if (!isMonitor && config.enableMicPassthrough && mixer.isMicActive.value) {
        // Virtual mic output: route through AudioContext mixer
        await mixer.setSinkId(deviceId);
        mixer.connectSoundboardAudio(audio);
      } else if (deviceId) {
        await audio.setSinkId(deviceId);
      }
      await audio.play();
      activeAudios.value.push(audio);
      return audio;
    } catch (err) {
      console.error('Error playing to device:', err);
      return null;
    }
  }

  async function enumerateDevices(): Promise<{ deviceId: string; label: string }[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'audiooutput')
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Device ${d.deviceId.substring(0, 8)}`
      }));
  }

  async function enumerateInputDevices(): Promise<{ deviceId: string; label: string }[]> {
    // Request mic permission first so labels are populated
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
    } catch {
      // Permission denied — labels may be empty
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'audioinput' && !d.label.toLowerCase().includes('cable'))
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${d.deviceId.substring(0, 8)}`
      }));
  }

  return {
    playingCardId,
    isTestPlaying,
    playRouted,
    preview,
    stopAll,
    stopBrowse,
    playTest,
    enumerateDevices,
    enumerateInputDevices
  };
}
