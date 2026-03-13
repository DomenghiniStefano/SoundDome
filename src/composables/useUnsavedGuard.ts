import { ref, computed, unref } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { ModalAction } from '../components/ui/ConfirmModal.vue';
import { RouteName } from '../enums/routes';

export function useUnsavedGuard(options: {
  hasUnsavedChanges: Ref<boolean> | ComputedRef<boolean>;
  onSave: () => Promise<void>;
  onLeave: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();

  const showUnsavedConfirm = ref(false);
  const skipGuard = ref(false);

  function goBackSafe() {
    if (unref(options.hasUnsavedChanges)) {
      showUnsavedConfirm.value = true;
    } else {
      router.push({ name: RouteName.LIBRARY });
    }
  }

  function onConfirmLeave() {
    showUnsavedConfirm.value = false;
    skipGuard.value = true;
    options.onLeave();
    router.push({ name: RouteName.LIBRARY });
  }

  async function onSaveAndLeave() {
    showUnsavedConfirm.value = false;
    await options.onSave();
  }

  const unsavedActions = computed<ModalAction[]>(() => [
    { label: t('editSound.saveAndExit'), event: 'save', variant: 'accent' },
    { label: t('editSound.exitAnyway'), event: 'confirm', variant: 'danger' },
  ]);

  function onUnsavedAction(event: string) {
    if (event === 'save') onSaveAndLeave();
    if (event === 'confirm') onConfirmLeave();
    if (event === 'cancel') showUnsavedConfirm.value = false;
  }

  onBeforeRouteLeave(() => {
    if (skipGuard.value || !unref(options.hasUnsavedChanges)) return true;
    showUnsavedConfirm.value = true;
    return false;
  });

  return { showUnsavedConfirm, skipGuard, goBackSafe, unsavedActions, onUnsavedAction };
}
