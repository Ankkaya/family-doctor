import { useEffect, useState } from "react";
import { dismissToast, subscribeToast, type ToastMessage } from "@/shared/toast/toast-store";

export function ToastHost() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => subscribeToast(setToast), []);

  if (!toast) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-red-100 bg-white px-4 py-3 text-red-700 shadow-[0_18px_44px_rgba(15,23,42,0.18)]"
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold">
          !
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium leading-5">{toast.message}</p>
        <button
          type="button"
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-red-500 transition-colors active:bg-red-50"
          onClick={() => dismissToast(toast.id)}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
