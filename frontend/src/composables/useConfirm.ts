import { reactive } from 'vue';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
}

const state = reactive<ConfirmState>({ open: false, options: { title: '' }, resolve: null });

export const useConfirm = () => {
  const confirm = (options: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
      state.options = options;
      state.open = true;
      state.resolve = resolve;
    });

  const answer = (value: boolean): void => {
    state.open = false;
    state.resolve?.(value);
    state.resolve = null;
  };

  return { state, confirm, answer };
};
