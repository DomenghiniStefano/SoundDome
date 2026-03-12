import { ref } from 'vue';
import { ToastType } from '../enums/ui';
import type { ToastTypeValue } from '../enums/ui';
import { TOAST_RESET_DELAY } from '../enums/constants';

export function useToast() {
  const toastMessage = ref('');
  const toastType = ref<ToastTypeValue>(ToastType.INFO);

  function showToast(message: string, type: ToastTypeValue = ToastType.INFO) {
    toastMessage.value = '';
    setTimeout(() => {
      toastMessage.value = message;
      toastType.value = type;
    }, TOAST_RESET_DELAY);
  }

  return {
    toastMessage,
    toastType,
    showToast,
  };
}
