<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  onUpdateAvailable, onUpdateNotAvailable, onUpdateDownloaded,
  onUpdateError, onUpdateProgress, removeUpdateListeners,
  updateCheck, updateInstall, isHiddenStart
} from '../services/api';
import { RouteName } from '../enums/routes';
import AppLogo from '../components/ui/AppLogo.vue';
import { UpdateStatus } from '../enums/ui';
import type { UpdateStatusValue } from '../enums/ui';
import { SPLASH_MIN_DURATION, SPLASH_TRANSITION_DELAY } from '../enums/constants';

const router = useRouter();
const { t } = useI18n();

const appVersion = APP_VERSION;
const isDev = import.meta.env.DEV;
const status = ref<UpdateStatusValue>(isDev ? UpdateStatus.IDLE : UpdateStatus.CHECKING);
const percent = ref(0);
const fading = ref(false);

function statusText() {
  switch (status.value) {
    case UpdateStatus.IDLE: return t('splash.devSkip');
    case UpdateStatus.CHECKING: return t('splash.checking');
    case UpdateStatus.DOWNLOADING: return t('splash.downloading', { percent: percent.value });
    case UpdateStatus.READY: return t('splash.installing');
    case UpdateStatus.UP_TO_DATE: return t('splash.upToDate');
    case UpdateStatus.ERROR: return t('splash.error');
    default: return t('splash.checking');
  }
}

function navigateToApp() {
  fading.value = true;
  setTimeout(() => {
    router.replace({ name: RouteName.LIBRARY });
  }, SPLASH_TRANSITION_DELAY);
}

onMounted(async () => {
  const startTime = Date.now();

  function proceedAfterMinDuration() {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, SPLASH_MIN_DURATION - elapsed);
    setTimeout(navigateToApp, remaining);
  }

  if (isDev) {
    proceedAfterMinDuration();
    return;
  }

  const hidden = await isHiddenStart();
  if (hidden) {
    navigateToApp();
    return;
  }

  // Register listeners first, then trigger the check
  onUpdateAvailable(() => {
    status.value = UpdateStatus.DOWNLOADING;
  });

  onUpdateNotAvailable(() => {
    status.value = UpdateStatus.UP_TO_DATE;
    proceedAfterMinDuration();
  });

  onUpdateProgress((data) => {
    percent.value = data.percent;
    status.value = UpdateStatus.DOWNLOADING;
  });

  onUpdateDownloaded(() => {
    status.value = UpdateStatus.READY;
    setTimeout(() => {
      updateInstall();
    }, SPLASH_TRANSITION_DELAY);
  });

  onUpdateError(() => {
    status.value = UpdateStatus.ERROR;
    proceedAfterMinDuration();
  });

  updateCheck();
});

onUnmounted(() => {
  removeUpdateListeners();
});
</script>

<template>
  <div class="splash" :class="{ fading }">
    <div class="splash-content">
      <AppLogo :height="48" class="splash-logo" />
      <div class="splash-status">{{ statusText() }}</div>
      <div class="splash-progress">
        <div
          class="splash-progress-bar"
          :class="{ indeterminate: status !== 'downloading' }"
          :style="status === 'downloading' ? { width: percent + '%' } : {}"
        />
      </div>
    </div>
    <div v-if="appVersion" class="splash-version">v{{ appVersion }}</div>
  </div>
</template>

<style scoped>
.splash {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  z-index: 9999;
  -webkit-app-region: drag;
  transition: opacity 0.4s ease;
}

.splash.fading {
  opacity: 0;
}

.splash-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.splash-logo {
  width: 280px;
  height: auto;
  user-select: none;
  -webkit-user-drag: none;
}

.splash-status {
  font-size: 0.85rem;
  color: var(--text-secondary);
  min-height: 1.2em;
}

.splash-progress {
  width: 200px;
  height: 3px;
  background: var(--bg-input);
  border-radius: 2px;
  overflow: hidden;
}

.splash-progress-bar {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.splash-progress-bar.indeterminate {
  width: 40%;
  animation: indeterminate 1.2s ease-in-out infinite;
}

@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}

.splash-version {
  position: absolute;
  bottom: 20px;
  font-size: 0.75rem;
  color: var(--text-faint);
}
</style>
