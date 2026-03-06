<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import IconPickerModal from '../ui/IconPickerModal.vue';
import { parseImage } from '../../enums/ui';

const props = defineProps<{
  image: string | null;
  imageUrl: string | null;
}>();

const emit = defineEmits<{
  setImage: [];
  removeImage: [];
  selectIcon: [value: string];
}>();

const { t } = useI18n();

const showPicker = ref(false);
const parsed = computed(() => parseImage(props.image));

function onPickerSelect(value: string) {
  emit('selectIcon', value);
}
</script>

<template>
  <section class="edit-section">
    <div class="edit-section-header">
      <AppIcon name="image" :size="16" />
      <span>{{ t('editSound.image') }}</span>
      <button v-if="parsed.type !== 'none'" class="image-clear-btn" @click="emit('removeImage')">
        <AppIcon name="close" :size="10" />
        {{ t('editSound.removeImage') }}
      </button>
    </div>

    <div class="image-section-content">
      <!-- Current preview -->
      <div class="image-current-box" :class="{ active: parsed.type !== 'none' }">
        <img v-if="parsed.type === 'file' && imageUrl" :src="imageUrl" alt="" class="image-current-img" />
        <AppIcon v-else-if="parsed.type === 'icon'" :name="parsed.value!" :size="24" />
        <span v-else-if="parsed.type === 'emoji'" class="image-current-emoji">{{ parsed.value }}</span>
        <AppIcon v-else name="image" :size="20" />
      </div>

      <div class="image-actions-row">
        <button class="image-action-btn" @click="showPicker = true">
          <span class="image-action-emoji">😀</span>
          {{ t('editSound.pickIcon') }}
        </button>
        <button class="image-action-btn" @click="emit('setImage')">
          <AppIcon name="image" :size="14" />
          {{ parsed.type === 'file' ? t('editSound.changeImage') : t('editSound.uploadImage') }}
        </button>
      </div>
    </div>

    <IconPickerModal
      :visible="showPicker"
      :selected="image"
      @select="onPickerSelect"
      @close="showPicker = false"
    />
  </section>
</template>

<style scoped>
.image-section-content {
  display: flex;
  gap: 16px;
  align-items: center;
}

/* Current preview */
.image-current-box {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-dim);
  overflow: hidden;
  flex-shrink: 0;
}

.image-current-box.active {
  border-color: var(--color-accent);
}

.image-current-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-current-emoji {
  font-size: 28px;
  line-height: 1;
}

/* Clear button in header */
.image-clear-btn {
  margin-left: auto;
  border: none;
  background: none;
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.15s;
}

.image-clear-btn:hover {
  color: var(--color-error);
}

/* Action buttons */
.image-actions-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.image-action-btn {
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.72rem;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}

.image-action-btn:hover {
  border-color: var(--color-text-dim);
  color: var(--color-text);
}

.image-action-emoji {
  font-size: 14px;
  line-height: 1;
}
</style>
