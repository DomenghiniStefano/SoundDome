import { ref } from 'vue';
import _ from 'lodash';
import { useConfigStore } from '../stores/config';
import { getSoundPath, libraryGetPath, notifyPlaybackStarted, notifyPlaybackStopped, onPlaybackStarted, onPlaybackStopped, removePlaybackListeners } from '../services/api';
import { useMicMixer } from './useMicMixer';
import { i18n } from '../i18n';
import { VOLUME_DIVISOR } from '../enums/constants';
import { sliderToGain } from '../utils/db';
import { log } from '../utils/logger';

const activeTestAudios = ref<HTMLAudioElement[]>([]);
const activeRoutedAudios = ref<HTMLAudioElement[]>([]);
const previewAudio = ref<HTMLAudioElement | null>(null);
const playingCardId = ref<string | null>(null);
const playingName = ref<string | null>(null);
const previewingCardId = ref<string | null>(null);
const previewingName = ref<string | null>(null);
const isTestPlaying = ref(false);
let _suppressNotify = false;

function clearPlayingState() {
  playingCardId.value = null;
  playingName.value = null;
  if (!_suppressNotify) notifyPlaybackStopped();
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

  async function routeToDevice(audio: HTMLAudioElement, deviceId: string, isVirtualMic: boolean, volumeMultiplier = 1) {
    if (isVirtualMic && config.enableMicPassthrough && mixer.isMicActive.value) {
      await mixer.setSinkId(deviceId);
      mixer.connectSoundboardAudio(audio);
      // sbGain already applies soundboardVolume — only keep item volume on the element
      audio.volume = _.clamp(volumeMultiplier, 0, 1);
    } else if (deviceId) {
      try {
        await audio.setSinkId(deviceId);
      } catch (err) {
        log.warn('[Audio] setSinkId failed for device', deviceId, '— using default output:', err);
      }
    }
  }

  function stopTest() {
    for (const audio of activeTestAudios.value) {
      audio.pause();
      audio.currentTime = 0;
    }
    activeTestAudios.value = [];
    if (isTestPlaying.value) {
      isTestPlaying.value = false;
      clearPlayingState();
    }
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

  async function playRouted(url: string, cardId?: string, name?: string, itemVolume?: number) {
    stopAll();
    stopPreview();

    if (cardId) playingCardId.value = cardId;
    if (name) playingName.value = name;
    if (cardId && name && !_suppressNotify) notifyPlaybackStarted(cardId, name);

    const volumeMultiplier = (typeof itemVolume === 'number') ? itemVolume / VOLUME_DIVISOR : 1;

    const toSpeakers = config.sendToSpeakers;
    const toVirtualMic = config.sendToVirtualMic;

    if (!toSpeakers && !toVirtualMic) {
      const audio = new Audio(url);
      try {
        audio.volume = _.clamp(sliderToGain(config.monitorVolume) * volumeMultiplier, 0, 1);
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
        audio.volume = _.clamp(sliderToGain(config.soundboardVolume) * volumeMultiplier, 0, 1);
        await routeToDevice(audio, config.virtualMicDeviceId, true, volumeMultiplier);
        await audio.play();
        audios.push(audio);
      } catch (err) {
        log.error('Error playing to Virtual Mic:', err);
      }
    }

    if (toSpeakers) {
      const audio = new Audio(url);
      try {
        audio.volume = _.clamp(sliderToGain(config.monitorVolume) * volumeMultiplier, 0, 1);
        await routeToDevice(audio, config.speakerDeviceId, false);
        await audio.play();
        audios.push(audio);
      } catch (err) {
        log.error('Error playing to Speakers:', err);
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
    await playRouted(fileUrl, item.id, item.name, item.volume);
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
    audio.volume = _.clamp(sliderToGain(config.monitorVolume), 0, 1);
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

    const t = i18n.global.t;

    const soundPath = await getSoundPath();
    const soundUrl = `file://${soundPath}`;
    isTestPlaying.value = true;
    playingName.value = t('audio.testSound');
    if (!_suppressNotify) notifyPlaybackStarted('__test__', t('audio.testSound'));

    const audio = new Audio(soundUrl);
    audio.volume = _.clamp(sliderToGain(config.soundboardVolume), 0, 1);

    try {
      if (config.speakerDeviceId) {
        try {
          await audio.setSinkId(config.speakerDeviceId);
        } catch (err) {
          log.warn('[Audio] setSinkId failed for speaker device', config.speakerDeviceId, '— using default output:', err);
        }
      }
      await audio.play();
      activeTestAudios.value = [audio];

      audio.addEventListener('ended', () => {
        isTestPlaying.value = false;
        clearPlayingState();
      });

      return { success: true, message: t('audio.playingTo', { targets: t('audio.speakers') }) };
    } catch (err) {
      log.error('Error playing test sound:', err);
      isTestPlaying.value = false;
      clearPlayingState();
      return { success: false, message: t('audio.playbackFailed') };
    }
  }

  function startPlaybackSync() {
    onPlaybackStarted((data) => {
      _suppressNotify = true;
      stopAll();
      stopPreview();
      playingCardId.value = data.cardId;
      playingName.value = data.name;
      _suppressNotify = false;
    });
    onPlaybackStopped(() => {
      _suppressNotify = true;
      stopAll();
      stopPreview();
      _suppressNotify = false;
    });
  }

  function stopPlaybackSync() {
    removePlaybackListeners();
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
    startPlaybackSync,
    stopPlaybackSync,
  };
}
