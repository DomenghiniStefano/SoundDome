<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import EditSection from './EditSection.vue';
import IconButton from '../ui/IconButton.vue';
import ImageThumbnail from '../ui/ImageThumbnail.vue';
import IconPickerModal from '../ui/IconPickerModal.vue';
import { parseImage, ImagePrefix, ImageType } from '../../enums/ui';
import { IconName } from '../../enums/icons';
import { showEmojiPanel } from '../../services/api';

const props = defineProps<{
  image: string | null;
  imageUrl: string | null;
}>();

const emit = defineEmits<{
  setImage: [];
  removeImage: [];
  selectImage: [value: string];
}>();

const { t } = useI18n();

const parsed = computed(() => parseImage(props.image));
const emojiInputRef = ref<HTMLInputElement>();
const textInput = ref('');
const showIconPicker = ref(false);

function onIconSelect(name: string) {
  emit('selectImage', `${ImagePrefix.ICON}${name}`);
}

async function onOpenEmojiPanel() {
  const input = emojiInputRef.value;
  if (input) {
    input.value = '';
    input.focus();
    await nextTick();
  }
  showEmojiPanel();
}

function onEmojiSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const value = input.value.trim();
  if (value) {
    emit('selectImage', `${ImagePrefix.EMOJI}${value}`);
  }
  input.value = '';
  input.blur();
}

function onTextSelect() {
  const value = textInput.value.trim();
  if (value) {
    emit('selectImage', `${ImagePrefix.TEXT}${value}`);
    textInput.value = '';
  }
}
</script>

<template>
  <EditSection icon="image" :title="t('editSound.image')">
    <template #header-right>
      <IconButton
        v-if="parsed.type !== ImageType.NONE"
        icon="close"
        :label="t('editSound.removeImage')"
        :size="10"
        outlined
        danger
        class="image-clear-btn"
        @click="emit('removeImage')"
      />
    </template>

    <div class="image-section-content">
      <!-- Current preview -->
      <div class="image-current-box" :class="{ active: parsed.type !== ImageType.NONE }">
        <ImageThumbnail :parsed="parsed" :image-url="imageUrl" :icon-size="24" :fallback-icon="IconName.IMAGE" size="lg" />
      </div>

      <span class="image-separator" />
      <div class="image-right">
        <div class="image-picker-row">
          <IconButton :icon="IconName.STAR" :label="t('editSound.icons')" @click="showIconPicker = true" />
          <IconButton :icon="IconName.IMAGE" :label="parsed.type === ImageType.FILE ? t('editSound.changeImage') : t('editSound.uploadImage')" @click="emit('setImage')" />
          <button class="emoji-btn" :title="t('editSound.openEmojiPicker')" @click="onOpenEmojiPanel">
            <span class="image-emoji-icon">😀</span>
            <span>Emoji</span>
          </button>
          <!-- Hidden input to receive native emoji picker output -->
          <input
            ref="emojiInputRef"
            class="image-emoji-receiver"
            @input="onEmojiSelect"
          />
        </div>

        <IconPickerModal
          :visible="showIconPicker"
          :selected="parsed.type === ImageType.ICON ? parsed.value : null"
          @select="onIconSelect"
          @close="showIconPicker = false"
        />

        <!-- Text label input -->
        <div class="image-text-row">
          <input
            v-model="textInput"
            class="image-text-input"
            :placeholder="t('editSound.textPlaceholder')"
            maxlength="20"
            @keydown.enter.prevent="onTextSelect"
          />
          <button class="image-text-confirm" :disabled="!textInput.trim()" @click="onTextSelect">
            {{ t('common.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </EditSection>
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

.image-clear-btn {
  margin-left: auto;
}

.image-separator {
  width: 1px;
  align-self: stretch;
  background: var(--color-border);
  flex-shrink: 0;
}

/* Right side */
.image-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

/* Picker buttons row */
.image-picker-row {
  display: flex;
  gap: 6px;
  position: relative;
  flex-wrap: wrap;
}

.emoji-btn {
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}

.emoji-btn:hover {
  color: var(--color-text-white);
  border-color: var(--color-text-dim);
}

.image-emoji-icon {
  font-size: 14px;
  line-height: 1;
}

/* Hidden input for native emoji picker */
.image-emoji-receiver {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

/* Text label row */
.image-text-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.image-text-input {
  flex: 1;
  min-width: 100px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-card);
  color: var(--color-text);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0 8px;
  outline: none;
  transition: border-color 0.15s;
}

.image-text-input::placeholder {
  color: var(--color-text-dimmer);
  text-transform: none;
  font-weight: 400;
  letter-spacing: 0;
}

.image-text-input:focus {
  border-color: var(--color-accent);
}

.image-text-confirm {
  border: none;
  background: var(--color-accent);
  color: #000;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 600;
  transition: opacity 0.15s;
  height: 28px;
}

.image-text-confirm:hover:not(:disabled) {
  opacity: 0.85;
}

.image-text-confirm:disabled {
  opacity: 0.35;
  cursor: default;
}

</style>
