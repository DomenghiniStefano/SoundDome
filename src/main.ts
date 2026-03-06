import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import { i18n } from './i18n';
import BrowsePage from './pages/BrowsePage.vue';
import LibraryPage from './pages/LibraryPage.vue';
import SettingsPage from './pages/SettingsPage.vue';
import WidgetPage from './pages/WidgetPage.vue';
import EditSoundPage from './pages/EditSoundPage.vue';
import { RoutePath, RouteName } from './enums/routes';
import './styles/global.css';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: RoutePath.ROOT, redirect: RoutePath.BROWSE },
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
app.mount('#app');
