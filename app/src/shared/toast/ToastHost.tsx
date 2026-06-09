import { useEffect, useState } from "react";
import { dismissToast, subscribeToast, type ToastMessage } from "@/shared/toast/toast-store";
import { cn } from "@/shared/lib/utils";

export function ToastHost() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => subscribeToast(setToast), []);

  if (!toast) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.18)]",
          toast.tone === "error" ? "border-red-100 text-red-700" : "border-slate-200 text-slate-800",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            toast.tone === "error" ? "bg-red-50" : "bg-emerald-50 text-emerald-700",
          )}
        >
          {toast.tone === "error" ? "!" : "i"}
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium leading-5">{toast.message}</p>
        <button
          type="button"
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors",
            toast.tone === "error" ? "text-red-500 active:bg-red-50" : "text-slate-500 active:bg-slate-100",
          )}
          onClick={() => dismissToast(toast.id)}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
