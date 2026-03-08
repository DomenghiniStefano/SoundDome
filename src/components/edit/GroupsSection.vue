<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import _ from 'lodash';
import EditSection from './EditSection.vue';
import AppIcon from '../ui/AppIcon.vue';

const props = defineProps<{
  itemId: string;
  groups: Group[];
}>();

const emit = defineEmits<{
  addToGroup: [groupId: string];
  removeFromGroup: [groupId: string];
}>();

const { t } = useI18n();

const memberGroupIds = computed(() =>
  _(props.groups)
    .filter((g: Group) => _.includes(g.itemIds, props.itemId))
    .map('id')
    .value()
);

function toggle(groupId: string) {
  if (_.includes(memberGroupIds.value, groupId)) {
    emit('removeFromGroup', groupId);
  } else {
    emit('addToGroup', groupId);
  }
}
</script>

<template>
  <EditSection icon="reorder" :title="t('groups.title')">
    <div v-if="_.isEmpty(groups)" class="groups-empty">
      {{ t('groups.noGroups') }}
    </div>
    <div v-else class="groups-list">
      <button
        v-for="group in groups"
        :key="group.id"
        class="groups-item"
        :class="{ active: _.includes(memberGroupIds, group.id) }"
        @click="toggle(group.id)"
      >
        <AppIcon v-if="_.includes(memberGroupIds, group.id)" name="check" :size="12" />
        <span class="groups-name">{{ group.name }}</span>
      </button>
    </div>
  </EditSection>
</template>

<style scoped>
.groups-empty {
  font-size: 0.78rem;
  color: var(--color-text-dimmer);
}

.groups-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.groups-item {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-border, #333);
  background: none;
  color: var(--color-text-dim);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 500;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.groups-item:hover {
  color: var(--color-text-white, #fff);
  border-color: var(--color-text-dim);
}

.groups-item.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: rgba(var(--color-accent-rgb, 255, 255, 255), 0.06);
}

.groups-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
