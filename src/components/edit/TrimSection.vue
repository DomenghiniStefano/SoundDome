<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import SwitchToggle from '../ui/SwitchToggle.vue';
import { WaveformEditor } from '../audio-editor';

const props = defineProps<{
  fileUrl: string;
  backupEnabled: boolean;
}>();

const emit = defineEmits<{
  'update:backupEnabled': [value: boolean];
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
      <div class="trim-backup-toggle">
        <SwitchToggle
          :model-value="backupEnabled"
          @update:model-value="(v: boolean) => emit('update:backupEnabled', v)"
        />
        <span class="trim-backup-label">{{ t('editSound.backupOnTrim') }}</span>
      </div>
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

<style src="../../styles/edit-section.css"></style>

<style scoped>
.trim-backup-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.trim-backup-label {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--color-text-dimmer);
  text-transform: none;
  letter-spacing: normal;
}
</style>
