import { ref, computed, watch, type Ref } from 'vue';
import _ from 'lodash';
import { VOLUME_DIVISOR } from '../enums/constants';
import type TrimSection from '../components/edit/TrimSection.vue';

export function useTestAudio(
  fileUrl: Ref<string>,
  trimRef: Ref<InstanceType<typeof TrimSection> | undefined>,
  pendingVolume: Ref<number>,
  activeRoutedAudios: Ref<HTMLAudioElement[]>,
) {
  const testing = ref(false);
  let testAudio: HTMLAudioElement | null = null;

  const testVolume = computed(() => _.clamp(pendingVolume.value / VOLUME_DIVISOR, 0, 1));

  watch(testVolume, (v) => {
    if (testAudio) testAudio.volume = v;
    for (const audio of activeRoutedAudios.value) {
      audio.volume = v;
    }
  });

  function onTest() {
    if (testing.value) {
      stopTest();
      return;
    }
    if (!fileUrl.value || !trimRef.value) return;

    testAudio = new Audio(fileUrl.value);
    testAudio.currentTime = trimRef.value.startTime;
    testAudio.volume = testVolume.value;
    testing.value = true;

    const trimEnd = trimRef.value.endTime;

    testAudio.addEventListener('timeupdate', () => {
      if (testAudio && testAudio.currentTime >= trimEnd) {
        stopTest();
      }
    });
    testAudio.addEventListener('ended', () => stopTest());
    testAudio.play();
  }

  function stopTest() {
    if (testAudio) {
      testAudio.pause();
      testAudio.src = '';
      testAudio = null;
    }
    testing.value = false;
  }

  return { testing, testVolume, onTest, stopTest };
}
