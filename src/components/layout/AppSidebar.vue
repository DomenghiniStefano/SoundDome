<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppIcon from '../ui/AppIcon.vue';
import { RouteName } from '../../enums/routes';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const collapsed = ref(false);
const appVersion = APP_VERSION;

const navItems = computed(() => [
  { name: RouteName.BROWSE, label: t('sidebar.browse'), icon: 'search' },
  { name: RouteName.LIBRARY, label: t('sidebar.library'), icon: 'music' },
  { name: RouteName.SETTINGS, label: t('sidebar.settings'), icon: 'settings' }
]);

function navigate(name: string) {
  router.push({ name });
}

function toggleCollapse() {
  collapsed.value = !collapsed.value;
}
</script>

<template>
  <nav class="sidebar" :class="{ collapsed }">
    <button class="hamburger" @click="toggleCollapse" aria-label="Toggle sidebar">☰</button>
    <div class="sidebar-nav">
      <div
        v-for="item in navItems"
        :key="item.name"
        class="nav-item"
        :class="{ active: route.name === item.name }"
        :title="collapsed ? item.label : undefined"
        @click="navigate(item.name)"
      >
        <span class="nav-icon"><AppIcon :name="item.icon" :size="18" /></span>
        <span class="nav-label">{{ item.label }}</span>
      </div>
    </div>
    <div class="sidebar-footer">v{{ appVersion }}</div>
  </nav>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--color-bg-sidebar);
  display: flex;
  flex-direction: column;
  padding: 0;
  transition: width 0.2s ease, min-width 0.2s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
  min-width: var(--sidebar-collapsed-width);
}

.hamburger {
  background: none;
  border: none;
  color: var(--color-text-nav);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 14px 16px 0;
  text-align: right;
  transition: color 0.15s;
}

.sidebar.collapsed .hamburger {
  text-align: center;
  padding: 14px 0 0;
}

.hamburger:hover {
  color: var(--color-text-white);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px;
  flex: 1;
}

.sidebar.collapsed .sidebar-nav {
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
  color: var(--color-text-nav);
  transition: all 0.15s;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 11px 0;
  gap: 0;
}

.sidebar.collapsed .nav-label {
  display: none;
}

.nav-item:hover {
  color: var(--color-text-white);
  background: var(--color-bg-card);
}

.nav-item.active {
  color: var(--color-text-white);
  background: var(--color-bg-card);
}

.nav-item.active .nav-icon {
  color: var(--color-accent);
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
  color: var(--color-text-faint);
  white-space: nowrap;
  overflow: hidden;
}

.sidebar.collapsed .sidebar-footer {
  text-align: center;
  padding: 16px 0;
}
</style>
