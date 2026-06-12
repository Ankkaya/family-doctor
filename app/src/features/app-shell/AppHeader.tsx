import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, PlusIcon } from "@/features/shared-ui/icons";
import { cn } from "@/shared/lib/utils";
import type { ScreenKey, TabKey } from "@/stores/useAppStore";

export function AppHeader({
  activeTab,
  currentScreen,
  title,
  onBack,
  onNewChat,
}: {
  activeTab: TabKey;
  currentScreen: ScreenKey;
  title: ReactNode;
  onBack: () => void;
  onNewChat: () => void;
}) {
  const showBack = currentScreen !== tabRootScreen(activeTab);
  const showNewChat = currentScreen === "chat-history";

  return (
    <header className="shrink-0 border-b border-slate-200/70 bg-white/85 px-3 pb-2 pt-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="flex h-9 items-center justify-between gap-2">
        <Button
          type="button"
          aria-label="返回"
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-full text-slate-600 active:bg-slate-100 active:text-slate-900 dark:text-slate-300 dark:active:bg-slate-800 dark:active:text-slate-50",
            !showBack && "invisible pointer-events-none",
          )}
          onClick={onBack}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 flex-1 justify-center text-center text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </div>
        <Button
          type="button"
          aria-label="新对话"
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-full text-emerald-700 active:bg-emerald-50 active:text-emerald-900",
            !showNewChat && "invisible pointer-events-none",
          )}
          onClick={onNewChat}
        >
          <PlusIcon className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

function tabRootScreen(tab: TabKey): ScreenKey {
  if (tab === "chat") return "chat-history";
  if (tab === "profile") return "profile";
  return "dashboard-home";
}
