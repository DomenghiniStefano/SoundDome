import { ref } from 'vue';
import _ from 'lodash';
import { useConfigStore } from '../stores/config';
import { getSoundPath, libraryGetPath } from '../services/api';
import { useMicMixer } from './useMicMixer';
import { i18n } from '../i18n';
import { VOLUME_DIVISOR } from '../enums/constants';

const activeTestAudios = ref<HTMLAudioElement[]>([]);
const activeRoutedAudios = ref<HTMLAudioElement[]>([]);
const previewAudio = ref<HTMLAudioElement | null>(null);
const playingCardId = ref<string | null>(null);
const playingName = ref<string | null>(null);
const previewingCardId = ref<string | null>(null);
const previewingName = ref<string | null>(null);
const isTestPlaying = ref(false);

function clearPlayingState() {
  playingCardId.value = null;
  playingName.value = null;
}

function clearPreviewingState() {
  previewingCardId.value = null;
  previewingName.value = null;
}

function onAllEnded(audios: HTMLAudioElement[], callback: () => void) {
  let endedCount = 0;
  const total = audios.length;
  audios.forEach(a => {
    a.addEventListener('ended', () => {
      endedCount++;
      if (endedCount >= total) callback();
    });
  });
}

export function useAudio() {
  const config = useConfigStore();
  const mixer = useMicMixer();

  async function routeToDevice(audio: HTMLAudioElement, deviceId: string, isVirtualMic: boolean) {
    if (isVirtualMic && config.enableMicPassthrough && mixer.isMicActive.value) {
      await mixer.setSinkId(deviceId);
      mixer.connectSoundboardAudio(audio);
    } else if (deviceId) {
      await audio.setSinkId(deviceId);
    }
  }

  function stopTest() {
    for (const audio of activeTestAudios.value) {
      audio.pause();
      audio.currentTime = 0;
    }
    activeTestAudios.value = [];
    isTestPlaying.value = false;
  }

  function stopPlayback() {
    for (const audio of activeRoutedAudios.value) {
      audio.pause();
      audio.currentTime = 0;
    }
    activeRoutedAudios.value = [];
    clearPlayingState();
  }

  function stopAll() {
    stopPlayback();
    stopTest();
  }

  async function playRouted(url: string, cardId?: string, name?: string, itemVolume?: { volume: number; useDefault: boolean }) {
    stopAll();
    stopPreview();

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
        activeRoutedAudios.value = [audio];
        audio.addEventListener('ended', clearPlayingState);
      } catch {
        clearPlayingState();
      }
      return;
    }

    const audios: HTMLAudioElement[] = [];

    if (toVirtualMic) {
      const audio = new Audio(url);
      try {
        audio.volume = (config.outputVolume / VOLUME_DIVISOR) * volumeMultiplier;
        await routeToDevice(audio, config.virtualMicDeviceId, true);
        await audio.play();
        audios.push(audio);
      } catch (err) {
        console.error('Error playing to Virtual Mic:', err);
      }
    }

    if (toSpeakers) {
      const audio = new Audio(url);
      try {
        audio.volume = (config.monitorVolume / VOLUME_DIVISOR) * volumeMultiplier;
        await routeToDevice(audio, config.speakerDeviceId, false);
        await audio.play();
        audios.push(audio);
      } catch (err) {
        console.error('Error playing to Speakers:', err);
      }
    }

    if (!_.isEmpty(audios)) {
      activeRoutedAudios.value = audios;
      onAllEnded(audios, () => {
        clearPlayingState();
        activeRoutedAudios.value = [];
      });
    } else {
      clearPlayingState();
    }
  }

  async function playLibraryItem(item: LibraryItem) {
    const filePath = await libraryGetPath(item.filename);
    const fileUrl = `file://${filePath}`;
    await playRouted(fileUrl, item.id, item.name, { volume: item.volume, useDefault: item.useDefault });
  }

  async function previewLibraryItem(item: LibraryItem) {
    const filePath = await libraryGetPath(item.filename);
    const fileUrl = `file://${filePath}`;
    preview(fileUrl, item.id, item.name);
  }

  function preview(url: string, cardId?: string, name?: string) {
    stopAll();
    stopPreview();
    if (cardId) previewingCardId.value = cardId;
    if (name) previewingName.value = name;
    const audio = new Audio(url);
    audio.volume = config.monitorVolume / VOLUME_DIVISOR;
    audio.play().catch(clearPreviewingState);
    audio.addEventListener('ended', clearPreviewingState);
    previewAudio.value = audio;
  }

  function stopPreview() {
    if (previewAudio.value) {
      previewAudio.value.pause();
      previewAudio.value.currentTime = 0;
      previewAudio.value = null;
    }
    clearPreviewingState();
  }

  async function playTest() {
    stopAll();
    stopPreview();

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
      targets.push(playTestToDevice(soundUrl, config.speakerDeviceId, false));
    }
    if (toVirtualMic) {
      targets.push(playTestToDevice(soundUrl, config.virtualMicDeviceId, true));
    }

    const results = await Promise.all(targets);
    const successCount = _.compact(results).length;

    if (successCount > 0) {
      const labels: string[] = [];
      if (toSpeakers) labels.push(t('audio.speakers'));
      if (toVirtualMic) labels.push(t('audio.virtualMic'));

      onAllEnded(activeTestAudios.value, () => {
        isTestPlaying.value = false;
      });

      return { success: true, message: t('audio.playingTo', { targets: labels.join(' + ') }) };
    }

    isTestPlaying.value = false;
    return { success: false, message: t('audio.playbackFailed') };
  }

  async function playTestToDevice(url: string, deviceId: string, isVirtualMic: boolean): Promise<HTMLAudioElement | null> {
    const audio = new Audio(url);
    audio.volume = (isVirtualMic ? config.outputVolume : config.monitorVolume) / VOLUME_DIVISOR;
    try {
      await routeToDevice(audio, deviceId, isVirtualMic);
      await audio.play();
      activeTestAudios.value.push(audio);
      return audio;
    } catch (err) {
      console.error('Error playing to device:', err);
      return null;
    }
  }

  return {
    playingCardId,
    playingName,
    previewingCardId,
    previewingName,
    isTestPlaying,
    activeRoutedAudios,
    playRouted,
    playLibraryItem,
    previewLibraryItem,
    preview,
    stopPreview,
    stopTest,
    stopPlayback,
    stopAll,
    playTest,
  };
}
