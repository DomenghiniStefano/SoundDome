<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import { WaveformEditor } from '../audio-editor';

const props = defineProps<{
  fileUrl: string;
}>();

const { t } = useI18n();

const editorRef = ref<InstanceType<typeof WaveformEditor>>();

const startTime = ref(0);
const endTime = ref(0);
const duration = ref(0);

function onReady(dur: number) {
  duration.value = dur;
  startTime.value = 0;
  endTime.value = dur;
}

function onSelectionUpdate(sel: { start: number; end: number }) {
  startTime.value = sel.start;
  endTime.value = sel.end;
}

async function reload() {
  await editorRef.value?.reload();
}

defineExpose({ startTime, endTime, duration, reload });
</script>

<template>
  <section class="edit-section">
    <div class="edit-section-header">
      <AppIcon name="edit" :size="16" />
      <span>{{ t('library.trim') }}</span>
    </div>

    <WaveformEditor
      ref="editorRef"
      :src="fileUrl"
      :labels="{
        start: t('library.trimStart'),
        end: t('library.trimEnd'),
        duration: t('library.trimDuration'),
      }"
      @ready="onReady"
      @update:selection="onSelectionUpdate"
    />
  </section>
</template>

<style scoped>
.edit-section {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border, #333);
  border-radius: 12px;
  padding: 16px 20px;
}

.edit-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-white, #fff);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 14px;
}

.edit-section-header svg {
  color: var(--color-accent);
}
</style>
