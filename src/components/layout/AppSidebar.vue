<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import { RouteName } from '../../enums/routes';
import { IconName } from '../../enums/icons';
import { SIDEBAR_AUTO_COLLAPSE_WIDTH } from '../../enums/constants';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const manualCollapse = ref<boolean | null>(null);
const autoCollapse = ref(false);

const collapsed = computed(() => manualCollapse.value ?? autoCollapse.value);

const appVersion = APP_VERSION;

const navItems = computed(() => [
  { name: RouteName.BROWSE, label: t('sidebar.browse'), icon: IconName.SEARCH },
  { name: RouteName.LIBRARY, label: t('sidebar.library'), icon: IconName.MUSIC },
  { name: RouteName.STREAM_DECK, label: 'Stream Deck', icon: IconName.WIDGET },
  { name: RouteName.SETTINGS, label: t('sidebar.settings'), icon: IconName.SETTINGS }
]);

function navigate(name: string) {
  router.push({ name });
}

function toggleCollapse() {
  manualCollapse.value = !collapsed.value;
}

function onResize() {
  const shouldCollapse = window.innerWidth < SIDEBAR_AUTO_COLLAPSE_WIDTH;
  if (shouldCollapse !== autoCollapse.value) {
    manualCollapse.value = null;
  }
  autoCollapse.value = shouldCollapse;
}

onMounted(() => {
  onResize();
  window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>

<template>
  <div class="sidebar-wrapper" :class="{ collapsed }">
    <nav class="sidebar">
      <div class="sidebar-nav">
      <div
        v-for="item in navItems"
        :key="item.name"
        class="nav-item"
        :class="{ active: route.name === item.name }"
        v-tooltip="collapsed ? item.label : undefined"
        @click="navigate(item.name)"
      >
        <span class="nav-icon"><AppIcon :name="item.icon" :size="18" /></span>
        <span class="nav-label">{{ item.label }}</span>
      </div>
    </div>
      <div class="sidebar-footer">v{{ appVersion }}</div>
    </nav>
    <button class="edge-handle" @click="toggleCollapse" v-tooltip="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
      <span class="edge-arrow">
        <AppIcon :name="collapsed ? IconName.CHEVRON_RIGHT : IconName.CHEVRON_LEFT" :size="12" />
      </span>
    </button>
  </div>
</template>

<style scoped>
.sidebar-wrapper {
  display: flex;
  position: relative;
}

.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  padding: 12px 0 0;
  transition: width 0.2s ease, min-width 0.2s ease;
  overflow: hidden;
}

.sidebar-wrapper.collapsed .sidebar {
  width: var(--sidebar-collapsed-width);
  min-width: var(--sidebar-collapsed-width);
}

.edge-handle {
  position: absolute;
  right: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 56px;
  background: var(--bg-secondary);
  border: none;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 1;
  transition: background 0.15s;
}

.edge-handle:hover {
  background: var(--accent);
}

.edge-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-nav);
  transition: color 0.15s;
}

.edge-handle:hover .edge-arrow {
  color: var(--text-inverse);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px;
  flex: 1;
}

.sidebar-wrapper.collapsed .sidebar-nav {
  padding: 0 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 16px;
  border-radius: var(--small-radius);
  cursor: pointer;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--text-nav);
  transition: all 0.15s;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-wrapper.collapsed .nav-item {
  justify-content: center;
  padding: 11px 0;
  gap: 0;
}

.sidebar-wrapper.collapsed .nav-label {
  display: none;
}

.nav-item:hover {
  color: var(--text-inverse);
  background: var(--bg-card);
}

.nav-item.active {
  color: var(--text-inverse);
  background: var(--bg-card);
}

.nav-item.active .nav-icon {
  color: var(--accent);
}

.nav-icon {
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: inherit;
  fill: currentColor;
}

.sidebar-footer {
  padding: 16px 24px;
  font-size: 0.7rem;
  color: var(--text-faint);
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-wrapper.collapsed .sidebar-footer {
  text-align: center;
  padding: 16px 0;
}
</style>
