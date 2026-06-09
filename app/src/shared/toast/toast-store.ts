export type ToastMessage = {
  id: number;
  tone: "error" | "info";
  message: string;
};

type ToastListener = (toast: ToastMessage | null) => void;

const listeners = new Set<ToastListener>();
let activeToast: ToastMessage | null = null;
let nextToastId = 1;
let dismissTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  listeners.forEach((listener) => listener(activeToast));
}

export function showErrorToast(message: string, duration = 3200) {
  showToast(message, "error", duration);
}

export function showInfoToast(message: string, duration = 2200) {
  showToast(message, "info", duration);
}

function showToast(message: string, tone: ToastMessage["tone"], duration: number) {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) return;

  const toast = {
    id: nextToastId,
    tone,
    message: normalizedMessage,
  };
  nextToastId += 1;
  activeToast = toast;
  emit();

  if (dismissTimer) {
    clearTimeout(dismissTimer);
  }

  dismissTimer = setTimeout(() => {
    if (activeToast?.id === toast.id) {
      activeToast = null;
      emit();
    }
  }, duration);
}

export function dismissToast(id?: number) {
  if (id !== undefined && activeToast?.id !== id) return;

  activeToast = null;
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = undefined;
  }
  emit();
}

export function subscribeToast(listener: ToastListener) {
  listeners.add(listener);
  listener(activeToast);

  return () => {
    listeners.delete(listener);
  };
}
