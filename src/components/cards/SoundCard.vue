<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import _ from 'lodash';
import AppIcon from '../ui/AppIcon.vue';
import ImageThumbnail from '../ui/ImageThumbnail.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';
import DropdownMenu from '../ui/DropdownMenu.vue';
import { SoundCardMode } from '../../enums/library';
import type { SoundCardModeValue } from '../../enums/library';
import { RouteName } from '../../enums/routes';
import { parseImage, isCustomImage, ImageType } from '../../enums/ui';
import { IconName } from '../../enums/icons';

const props = defineProps<{
  name: string;
  mode: SoundCardModeValue;
  id?: string;
  filename?: string;
  active?: boolean;
  previewing?: boolean;
  saved?: boolean;
  inLibrary?: boolean;
  volume?: number;
  hotkey?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  favorite?: boolean;
  groups?: Group[];
  memberGroupIds?: string[];
}>();

const emit = defineEmits<{
  play: [];
  preview: [];
  stopPreview: [];
  save: [];
  reset: [];
  delete: [];
  toggleFavorite: [];
  addToGroup: [groupId: string];
  removeFromGroup: [groupId: string];
}>();

const router = useRouter();
const { t } = useI18n();

const showDeleteConfirm = ref(false);
const parsed = computed(() => parseImage(props.image));

function openEdit() {
  if (props.id) {
    router.push({ name: RouteName.EDIT_SOUND, params: { id: props.id } });
  }
}
</script>

<template>
  <!-- Browse mode layout -->
  <div
    v-if="mode === SoundCardMode.BROWSE"
    class="sound-card browse"
    :class="{ active }"
    v-tooltip="name"
  >
    <div class="card-browse-header">
      <div class="card-name">{{ name }}</div>
      <button
        v-if="inLibrary"
        class="card-save-overlay card-reset"
        v-tooltip="t('browse.resetOriginal')"
        @click.stop="emit('reset')"
      >
        <AppIcon name="download" :size="14" />
      </button>
      <button
        v-else
        class="card-save-overlay"
        :class="{ saved }"
        v-tooltip="t('common.saveToLibrary')"
        @click.stop="emit('save')"
      >
        <AppIcon v-if="!saved" name="download" :size="14" />
        <AppIcon v-else name="check" :size="14" />
      </button>
    </div>
    <div class="card-browse-buttons">
      <button class="browse-btn browse-btn-play" @click.stop="emit('play')">
        <AppIcon name="play" :size="12" />
        {{ t('browse.play') }}
      </button>
      <button
        class="browse-btn browse-btn-test"
        :class="{ previewing }"
        @click.stop="previewing ? emit('stopPreview') : emit('preview')"
      >
        <AppIcon v-if="previewing" name="stop" :size="12" />
        <AppIcon v-else name="headphones" :size="12" />
        {{ t('browse.test') }}
      </button>
    </div>
  </div>

  <!-- Library mode layout -->
  <div
    v-else
    class="sound-card library"
    :class="{ active }"
    v-tooltip="name"
    @click="emit('play')"
  >
    <button
      class="card-play"
      :class="{ active, 'has-image': parsed.type === ImageType.FILE, 'has-custom': isCustomImage(parsed) }"
      @click.stop="emit('play')"
    >
      <ImageThumbnail :parsed="parsed" :image-url="imageUrl" :icon-size="16" :fallback-icon="IconName.PLAY" />
    </button>

    <div class="card-info">
      <div class="card-name">{{ name }}</div>
      <div v-if="hotkey" class="card-hotkey-label">
        {{ hotkey }}
      </div>
      <AppIcon v-if="favorite" name="star" :size="12" class="card-favorite-icon" />
    </div>

    <DropdownMenu v-slot="{ close }">
      <button class="card-menu-item" @click="openEdit(); close()">
        <AppIcon name="edit" />
        {{ t('editSound.edit') }}
      </button>
      <button class="card-menu-item" @click="emit('toggleFavorite'); close()">
        <AppIcon name="star" />
        {{ favorite ? t('groups.unfavorite') : t('groups.favorite') }}
      </button>
      <template v-if="groups && groups.length > 0">
        <div class="card-menu-divider" />
        <div class="card-menu-label">{{ t('groups.addTo') }}</div>
        <div class="card-menu-groups">
          <button
            v-for="group in groups"
            :key="group.id"
            class="card-menu-item group-item"
            @click="_.includes(memberGroupIds, group.id) ? emit('removeFromGroup', group.id) : emit('addToGroup', group.id); close()"
          >
            <AppIcon :name="_.includes(memberGroupIds, group.id) ? 'check' : 'plus'" />
            {{ group.name }}
          </button>
        </div>
      </template>
      <div class="card-menu-divider" />
      <button class="card-menu-item danger" @click="showDeleteConfirm = true; close()">
        <AppIcon name="trash" />
        {{ t('library.delete') }}
      </button>
    </DropdownMenu>

  </div>

  <ConfirmModal
    :visible="showDeleteConfirm"
    :title="t('library.deleteTitle', { name })"
    :message="t('library.confirmDelete', { name })"
    @confirm="emit('delete'); showDeleteConfirm = false"
    @cancel="showDeleteConfirm = false"
  />
</template>

<style scoped>
/* Base card */
.sound-card {
  background: var(--color-bg-card);
  border-radius: var(--card-radius);
  padding: 10px 12px;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.sound-card:hover {
  background: var(--color-bg-card-hover);
  border-color: var(--color-border);
}

.sound-card.active {
  border-color: var(--color-accent);
  background: var(--color-active-bg);
}

/* Library mode — horizontal row layout */
.sound-card.library {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Play button (library only) */
.card-play {
  width: var(--card-play-size, 36px);
  height: var(--card-play-size, 36px);
  min-width: var(--card-play-size, 36px);
  border-radius: 50%;
  border: none;
  background: #282828;
  color: var(--color-accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.sound-card:hover .card-play {
  background: var(--color-accent);
  color: #000;
}

.sound-card.active .card-play {
  background: var(--color-accent);
  color: #000;
}

.card-play svg {
  width: var(--card-icon-size, 14px);
  height: var(--card-icon-size, 14px);
  fill: currentColor;
}

.card-play.has-image {
  padding: 0;
  overflow: hidden;
}

.card-play.has-custom {
  color: var(--color-accent);
}

/* Info block (library only) */
.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Name — shared between browse and library */
.card-name {
  font-size: 0.8rem;
  color: var(--color-text);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

/* Hotkey label */
.card-hotkey-label {
  font-size: 0.6rem;
  color: var(--color-accent);
  font-family: monospace;
  letter-spacing: 0.3px;
}

/* Favorite icon — hidden by default, shown in list view */
.card-favorite-icon {
  display: none;
  color: var(--color-warning, #f9a825);
  flex-shrink: 0;
}

/* ── Browse mode ── */
.sound-card.browse {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}

.card-browse-header {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  min-height: 34px;
}

.card-browse-header .card-name {
  flex: 1;
  min-width: 0;
}

.card-save-overlay {
  border: none;
  background: none;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s;
  flex-shrink: 0;
}

.sound-card.browse:hover .card-save-overlay {
  opacity: 1;
}

.card-save-overlay:hover {
  color: var(--color-accent);
}

.card-save-overlay.saved {
  opacity: 1;
  color: var(--color-accent);
  pointer-events: none;
}

.card-save-overlay.card-reset {
  opacity: 0;
}

.sound-card.browse:hover .card-save-overlay.card-reset {
  opacity: 1;
}

.card-save-overlay.card-reset:hover {
  color: var(--color-warning, #f9a825);
}

.card-browse-buttons {
  display: flex;
  gap: 8px;
}

.browse-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.browse-btn svg {
  width: 12px;
  height: 12px;
  fill: currentColor;
}

.browse-btn-play {
  background: var(--color-accent);
  color: #000;
}

.browse-btn-play:hover {
  filter: brightness(1.15);
}

.browse-btn-test {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-dim);
}

.browse-btn-test:hover {
  background: rgba(255, 255, 255, 0.14);
  color: var(--color-text-white);
}

.browse-btn-test.previewing {
  background: rgba(229, 57, 53, 0.15);
  color: var(--color-error, #e53935);
}

.browse-btn-test.previewing:hover {
  background: rgba(229, 57, 53, 0.25);
}

/* Menu items */
.card-menu-item {
  width: 100%;
  border: none;
  background: none;
  color: var(--color-text-dimmer);
  cursor: pointer;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  transition: background 0.15s, color 0.15s;
}

.card-menu-item:hover {
  background: var(--color-bg-card-hover);
  color: var(--color-text-white);
}

.card-menu-item svg {
  width: 16px;
  height: 16px;
  min-width: 16px;
  fill: currentColor;
  flex-shrink: 0;
}

.card-menu-item.danger {
  color: var(--color-error, #e53935);
}

.card-menu-item.danger:hover {
  background: rgba(229, 57, 53, 0.1);
}

.card-menu-divider {
  height: 1px;
  background: var(--color-border, #333);
  margin: 4px 0;
}

.card-menu-label {
  padding: 6px 12px 2px;
  font-size: 0.65rem;
  color: var(--color-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-menu-groups {
  max-height: 150px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.card-menu-groups::-webkit-scrollbar {
  width: 4px;
}

.card-menu-groups::-webkit-scrollbar-track {
  background: transparent;
}

.card-menu-groups::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.card-menu-item.group-item {
  font-size: 0.75rem;
  padding: 6px 12px;
}
</style>
