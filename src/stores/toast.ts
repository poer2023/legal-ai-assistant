import { readonly, ref } from 'vue';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

type ToastOptions = {
  tone?: ToastTone;
  duration?: number;
};

const toastMessage = ref('');
const toastTone = ref<ToastTone>('success');
let toastTimer: number | undefined;

const clearToast = () => {
  toastMessage.value = '';
  if (toastTimer !== undefined) {
    window.clearTimeout(toastTimer);
    toastTimer = undefined;
  }
};

const showToast = (message: string, options: ToastOptions = {}) => {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) return;

  toastMessage.value = normalizedMessage;
  toastTone.value = options.tone ?? 'success';

  if (toastTimer !== undefined) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toastMessage.value = '';
    toastTimer = undefined;
  }, options.duration ?? 2200);
};

export const useToast = () => ({
  toastMessage: readonly(toastMessage),
  toastTone: readonly(toastTone),
  showToast,
  clearToast,
});
