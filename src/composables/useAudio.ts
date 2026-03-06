import { ref } from 'vue';
import _ from 'lodash';
import { useConfigStore } from '../stores/config';
import { getSoundPath } from '../services/api';
import { useMicMixer } from './useMicMixer';
import { i18n } from '../i18n';
import { DeviceKind } from '../enums/audio';
import { VOLUME_DIVISOR, VBCABLE_FILTER_KEYWORD } from '../enums/constants';

const activeAudios = ref<HTMLAudioElement[]>([]);
const activeBrowseAudio = ref<HTMLAudioElement | null>(null);
const activeRoutedAudios = ref<HTMLAudioElement[]>([]);
const previewAudio = ref<HTMLAudioElement | null>(null);
const playingCardId = ref<string | null>(null);
const playingName = ref<string | null>(null);
const previewingCardId = ref<string | null>(null);
const previewingName = ref<string | null>(null);
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
    for (const audio of activeRoutedAudios.value) {
      audio.pause();
      audio.currentTime = 0;
    }
    activeRoutedAudios.value = [];
    if (activeBrowseAudio.value) {
      activeBrowseAudio.value.pause();
      activeBrowseAudio.value.currentTime = 0;
      activeBrowseAudio.value = null;
    }
    playingCardId.value = null; playingName.value = null;
    playingName.value = null;
  }

  async function playRouted(url: string, cardId?: string, name?: string, itemVolume?: { volume: number; useDefault: boolean }) {
    stopBrowse();
    stopAll();

    if (cardId) playingCardId.value = cardId;
    if (name) playingName.value = name;

    const volumeMultiplier = (itemVolume?.useDefault === false && typeof itemVolume.volume === 'number')
      ? itemVolume.volume / VOLUME_DIVISOR
      : 1;

    const toSpeakers = config.sendToSpeakers;
    const toVirtualMic = config.sendToVirtualMic;

    if (!toSpeakers && !toVirtualMic) {
      const audio = new Audio(url);
      try {
        audio.volume = (config.monitorVolume / VOLUME_DIVISOR) * volumeMultiplier;
        await audio.play();
        activeBrowseAudio.value = audio;
        audio.addEventListener('ended', () => {
          playingCardId.value = null; playingName.value = null;
        });
      } catch {
        playingCardId.value = null; playingName.value = null;
      }
      return;
    }

    const audios: HTMLAudioElement[] = [];

    if (toVirtualMic) {
      const audio = new Audio(url);
      try {
        audio.volume = (config.outputVolume / VOLUME_DIVISOR) * volumeMultiplier;
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
      try {
        audio.volume = (config.monitorVolume / VOLUME_DIVISOR) * volumeMultiplier;
        await audio.setSinkId(config.speakerDeviceId);
        await audio.play();
        audios.push(audio);
      } catch (err) {
        console.error('Error playing to Speakers:', err);
      }
    }

    if (!_.isEmpty(audios)) {
      activeBrowseAudio.value = audios[0];
      activeRoutedAudios.value = audios;
      let endedCount = 0;
      const total = audios.length;
      audios.forEach(a => {
        a.addEventListener('ended', () => {
          endedCount++;
          if (endedCount >= total) {
            playingCardId.value = null; playingName.value = null;
            activeRoutedAudios.value = [];
          }
        });
      });
    } else {
      playingCardId.value = null; playingName.value = null;
    }
  }

  function preview(url: string, cardId?: string, name?: string) {
    stopPreview();
    if (cardId) previewingCardId.value = cardId;
    if (name) previewingName.value = name;
    const audio = new Audio(url);
    audio.volume = config.monitorVolume / VOLUME_DIVISOR;
    audio.play().catch(() => { previewingCardId.value = null; previewingName.value = null; });
    audio.addEventListener('ended', () => { previewingCardId.value = null; previewingName.value = null; });
    previewAudio.value = audio;
  }

  function stopPreview() {
    if (previewAudio.value) {
      previewAudio.value.pause();
      previewAudio.value.currentTime = 0;
      previewAudio.value = null;
    }
    previewingCardId.value = null;
    previewingName.value = null;
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
    const successCount = _.compact(results).length;

    if (successCount > 0) {
      const labels: string[] = [];
      if (toSpeakers) labels.push(t('audio.speakers'));
      if (toVirtualMic) labels.push(t('audio.virtualMic'));

      let testEndedCount = 0;
      const testTotal = activeAudios.value.length;
      for (const audio of activeAudios.value) {
        audio.addEventListener('ended', () => {
          testEndedCount++;
          if (testEndedCount >= testTotal) {
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
    audio.volume = (isMonitor ? config.monitorVolume : config.outputVolume) / VOLUME_DIVISOR;
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
    return _(devices)
      .filter({ kind: DeviceKind.OUTPUT })
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Device ${d.deviceId.substring(0, 8)}`
      }))
      .value();
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
    return _(devices)
      .filter(d => d.kind === DeviceKind.INPUT && !d.label.toLowerCase().includes(VBCABLE_FILTER_KEYWORD))
      .map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${d.deviceId.substring(0, 8)}`
      }))
      .value();
  }

  return {
    playingCardId,
    playingName,
    previewingCardId,
    previewingName,
    isTestPlaying,
    activeRoutedAudios,
    playRouted,
    preview,
    stopPreview,
    stopAll,
    stopBrowse,
    playTest,
    enumerateDevices,
    enumerateInputDevices
  };
}
