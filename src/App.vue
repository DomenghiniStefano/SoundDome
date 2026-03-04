<script setup lang="ts">
import { onMounted } from 'vue';
import AppSidebar from './components/AppSidebar.vue';
import { useConfigStore } from './stores/config';
import { useMicMixer } from './composables/useMicMixer';

const config = useConfigStore();
const { startMic } = useMicMixer();

onMounted(async () => {
  await config.load();
  if (config.enableMicPassthrough) {
    await startMic();
  }
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
