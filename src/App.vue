<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSidebar from './components/AppSidebar.vue';
import { useConfigStore } from './stores/config';
import { useMicMixer } from './composables/useMicMixer';

const config = useConfigStore();
const { startMic } = useMicMixer();
const { locale } = useI18n();

onMounted(async () => {
  await config.load();
  locale.value = config.locale;
  if (config.enableMicPassthrough) {
    await startMic();
  }
});

watch(() => config.locale, (val) => {
  locale.value = val;
});
</script>

<template>
  <AppSidebar />
  <div class="main-content">
    <router-view />
  </div>
</template>

<style scoped>
.main-content {
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg);
}
</style>
