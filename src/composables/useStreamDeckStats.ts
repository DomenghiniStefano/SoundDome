import { ref, onMounted, onUnmounted } from 'vue';
import { streamdeckSystemStats } from '@/services/api';
import { STATS_POLL_INTERVAL_MS } from '@/enums/streamdeck';

export function useStreamDeckStats() {
  const statsInterval = ref<ReturnType<typeof setInterval> | null>(null);
  const liveStats = ref<SystemStatsData | null>(null);

  async function pollStats() {
    try {
      liveStats.value = await streamdeckSystemStats();
    } catch {
      // ignore
    }
  }

  onMounted(() => {
    pollStats();
    statsInterval.value = setInterval(pollStats, STATS_POLL_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (statsInterval.value) {
      clearInterval(statsInterval.value);
    }
  });

  return { liveStats };
}
