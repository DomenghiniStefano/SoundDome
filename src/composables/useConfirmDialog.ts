import { ref } from 'vue';
import type { ModalAction } from '../components/ui/ConfirmModal.vue';

export function useConfirmDialog() {
  const visible = ref(false);
  const title = ref('');
  const message = ref('');
  const actions = ref<ModalAction[] | undefined>(undefined);

  let pendingHandlers: Record<string, () => Promise<void>> = {};

  function show(
    dialogTitle: string,
    dialogMessage: string,
    action: () => Promise<void>,
    cancelAction?: () => Promise<void>
  ) {
    title.value = dialogTitle;
    message.value = dialogMessage;
    actions.value = undefined;
    visible.value = true;
    pendingHandlers = { confirm: action };
    if (cancelAction) pendingHandlers.cancel = cancelAction;
  }

  function showCustom(
    dialogTitle: string,
    dialogMessage: string,
    dialogActions: ModalAction[],
    handlers: Record<string, () => Promise<void>>
  ) {
    title.value = dialogTitle;
    message.value = dialogMessage;
    actions.value = dialogActions;
    visible.value = true;
    pendingHandlers = handlers;
  }

  async function confirm() {
    visible.value = false;
    const handler = pendingHandlers.confirm;
    pendingHandlers = {};
    if (handler) await handler();
  }

  async function cancel() {
    visible.value = false;
    const handler = pendingHandlers.cancel;
    pendingHandlers = {};
    if (handler) await handler();
  }

  async function onAction(event: string) {
    visible.value = false;
    const handler = pendingHandlers[event];
    pendingHandlers = {};
    if (handler) await handler();
  }

  return {
    visible,
    title,
    message,
    actions,
    show,
    showCustom,
    confirm,
    cancel,
    onAction,
  };
}
