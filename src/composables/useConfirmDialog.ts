import { ref } from 'vue';

export function useConfirmDialog() {
  const visible = ref(false);
  const title = ref('');
  const message = ref('');

  let pendingAction: (() => Promise<void>) | null = null;
  let pendingCancelAction: (() => Promise<void>) | null = null;

  function show(
    dialogTitle: string,
    dialogMessage: string,
    action: () => Promise<void>,
    cancelAction?: () => Promise<void>
  ) {
    title.value = dialogTitle;
    message.value = dialogMessage;
    visible.value = true;
    pendingAction = action;
    pendingCancelAction = cancelAction ?? null;
  }

  async function confirm() {
    visible.value = false;
    pendingCancelAction = null;
    if (pendingAction) await pendingAction();
    pendingAction = null;
  }

  async function cancel() {
    visible.value = false;
    pendingAction = null;
    if (pendingCancelAction) {
      const action = pendingCancelAction;
      pendingCancelAction = null;
      await action();
    }
  }

  return {
    visible,
    title,
    message,
    show,
    confirm,
    cancel,
  };
}
