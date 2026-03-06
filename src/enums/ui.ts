export const ToastType = {
  INFO: '',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type ToastTypeValue = (typeof ToastType)[keyof typeof ToastType];
export const toastTypes = Object.values(ToastType);

export const ConfirmAction = {
  SINGLE: 'single',
  ALL: 'all',
} as const;

export type ConfirmActionValue = (typeof ConfirmAction)[keyof typeof ConfirmAction];
export const confirmActions = Object.values(ConfirmAction);
