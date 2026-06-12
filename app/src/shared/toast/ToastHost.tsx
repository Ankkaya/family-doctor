import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissToast, subscribeToast, type ToastMessage } from "@/shared/toast/toast-store";
import { cn } from "@/shared/lib/utils";

const TOAST_ANIMATION_MS = 180;

export function ToastHost() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let enterFrame: number | undefined;

    const unsubscribe = subscribeToast((nextToast) => {
      if (exitTimer) {
        clearTimeout(exitTimer);
        exitTimer = undefined;
      }
      if (enterFrame) {
        cancelAnimationFrame(enterFrame);
        enterFrame = undefined;
      }

      if (nextToast) {
        setToast(nextToast);
        setIsVisible(false);
        enterFrame = requestAnimationFrame(() => {
          setIsVisible(true);
        });
        return;
      }

      setIsVisible(false);
      exitTimer = setTimeout(() => {
        setToast(null);
      }, TOAST_ANIMATION_MS);
    });

    return () => {
      unsubscribe();
      if (exitTimer) {
        clearTimeout(exitTimer);
      }
      if (enterFrame) {
        cancelAnimationFrame(enterFrame);
      }
    };
  }, []);

  if (!toast) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.18)]",
          "transition-all duration-200 ease-out",
          isVisible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-3 scale-95 opacity-0",
          "dark:bg-slate-900",
          toast.tone === "error"
            ? "border-red-100 text-red-700 dark:border-red-950 dark:text-red-300"
            : "border-slate-200 text-slate-800 dark:border-slate-800 dark:text-slate-100",
        )}
      >
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            toast.tone === "error" ? "bg-red-50 dark:bg-red-950" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
          )}
        >
          {toast.tone === "error" ? "!" : "i"}
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium leading-5">{toast.message}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 shrink-0 rounded-full",
            toast.tone === "error" ? "text-red-500 active:bg-red-50 dark:text-red-300 dark:active:bg-red-950" : "text-slate-500 active:bg-slate-100 dark:text-slate-300 dark:active:bg-slate-800",
          )}
          aria-label="关闭提示"
          onClick={() => dismissToast(toast.id)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
