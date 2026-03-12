<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import EditSection from './EditSection.vue';
import VolumeSlider from '../settings/VolumeSlider.vue';
import { VOLUME_ITEM_MAX, VOLUME_ITEM_DEFAULT } from '../../enums/constants';

defineProps<{
  volume: number;
}>();

const emit = defineEmits<{
  'update:volume': [value: number];
}>();

const { t } = useI18n();
</script>

<template>
  <EditSection icon="volume" :title="t('common.volume')">
    <VolumeSlider
      :model-value="volume"
      :max="VOLUME_ITEM_MAX"
      :value-text="`${volume}%`"
      compact
      @update:model-value="(v: number) => emit('update:volume', v)"
    />
    <button
      v-if="volume !== VOLUME_ITEM_DEFAULT"
      class="volume-section-reset"
      @click="emit('update:volume', VOLUME_ITEM_DEFAULT)"
    >
      Reset
    </button>
  </EditSection>
</template>

<style scoped>
.volume-section-reset {
  border: none;
  background: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px 0;
  margin-top: 4px;
  font-size: 0.7rem;
  transition: color 0.15s;
}

.volume-section-reset:hover {
  color: var(--text-inverse);
}
</style>
