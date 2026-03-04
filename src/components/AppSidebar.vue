<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const navItems = computed(() => [
  { name: 'browse', label: t('sidebar.browse'), icon: '\u2630' },
  { name: 'library', label: t('sidebar.library'), icon: '\u266B' },
  { name: 'settings', label: t('sidebar.settings'), icon: '\u2699' }
]);

function navigate(name: string) {
  router.push({ name });
}
</script>

<template>
  <nav class="sidebar">
    <div class="sidebar-logo">Sound<span>Dome</span></div>
    <div class="sidebar-nav">
      <div
        v-for="item in navItems"
        :key="item.name"
        class="nav-item"
        :class="{ active: route.name === item.name }"
        @click="navigate(item.name)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </div>
    </div>
    <div class="sidebar-footer">SoundDome v0.1</div>
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
}

.sidebar-logo {
  padding: 28px 24px 32px;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text-white);
  letter-spacing: 0.5px;
}

.sidebar-logo span {
  color: var(--color-accent);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px;
  flex: 1;
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
  text-align: center;
  font-size: 1.05rem;
}

.sidebar-footer {
  padding: 16px 24px;
  font-size: 0.7rem;
  color: var(--color-text-faint);
}
</style>
