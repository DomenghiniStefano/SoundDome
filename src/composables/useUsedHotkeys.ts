import { computed } from 'vue';
import _ from 'lodash';
import { useLibraryStore } from '../stores/library';
import { useConfigStore } from '../stores/config';
import { useI18n } from 'vue-i18n';

export function useUsedHotkeys() {
  const libraryStore = useLibraryStore();
  const config = useConfigStore();
  const { t } = useI18n();

  const usedHotkeys = computed(() => {
    const entries: [string, string][] = _.map(
      _.filter(libraryStore.items, 'hotkey') as LibraryItem[],
      it => [it.hotkey!, it.name]
    );
    if (config.stopHotkey) {
      entries.push([config.stopHotkey, t('settingsHotkeys.stopLabel')]);
    }
    return new Map(entries);
  });

  return { usedHotkeys };
}
