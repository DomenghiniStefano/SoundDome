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
import './styles/global.css';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/browse' },
    { path: '/browse', name: 'browse', component: BrowsePage },
    { path: '/library', name: 'library', component: LibraryPage },
    { path: '/library/edit/:id', name: 'edit-sound', component: EditSoundPage },
    { path: '/settings', name: 'settings', component: SettingsPage },
    { path: '/widget', name: 'widget', component: WidgetPage }
  ]
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(i18n);
app.mount('#app');
