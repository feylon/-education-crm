import { reactive } from 'vue';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  timeout: number;
}

const state = reactive<{ toasts: Toast[] }>({ toasts: [] });
let counter = 0;

const push = (kind: ToastKind, title: string, message?: string, timeout = 4000): void => {
  const toast: Toast = { id: ++counter, kind, title, message, timeout };
  state.toasts.push(toast);
  if (timeout > 0) {
    window.setTimeout(() => dismiss(toast.id), timeout);
  }
};

const dismiss = (id: number): void => {
  const index = state.toasts.findIndex((toast) => toast.id === id);
  if (index >= 0) {
    state.toasts.splice(index, 1);
  }
};

export const useToast = () => ({
  toasts: state.toasts,
  success: (title: string, message?: string) => push('success', title, message),
  error: (title: string, message?: string) => push('error', title, message, 6000),
  info: (title: string, message?: string) => push('info', title, message),
  warning: (title: string, message?: string) => push('warning', title, message),
  dismiss,
});
