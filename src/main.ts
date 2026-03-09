import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import { i18n } from './i18n';
import SplashPage from './pages/SplashPage.vue';
import BrowsePage from './pages/BrowsePage.vue';
import LibraryPage from './pages/LibraryPage.vue';
import SettingsPage from './pages/SettingsPage.vue';
import WidgetPage from './pages/WidgetPage.vue';
import EditSoundPage from './pages/EditSoundPage.vue';
import _ from 'lodash';
import { RoutePath, RouteName } from './enums/routes';
import { MOUSE_NAV_BUTTONS } from './enums/hotkeys';
import { vTooltip } from './directives/tooltip';
import './styles/global.css';

// Block mouse back/forward navigation globally
window.addEventListener('mouseup', (e) => {
  if (_.includes(MOUSE_NAV_BUTTONS, e.button)) e.preventDefault();
}, true);

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: RoutePath.ROOT, redirect: RoutePath.SPLASH },
    { path: RoutePath.SPLASH, name: RouteName.SPLASH, component: SplashPage },
    { path: RoutePath.BROWSE, name: RouteName.BROWSE, component: BrowsePage },
    { path: RoutePath.LIBRARY, name: RouteName.LIBRARY, component: LibraryPage },
    { path: RoutePath.EDIT_SOUND, name: RouteName.EDIT_SOUND, component: EditSoundPage },
    { path: RoutePath.SETTINGS, name: RouteName.SETTINGS, component: SettingsPage },
    { path: RoutePath.WIDGET, name: RouteName.WIDGET, component: WidgetPage }
  ]
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(i18n);
app.directive('tooltip', vTooltip);
app.mount('#app');
