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
  title: string;
  onBack: () => void;
  onNewChat: () => void;
}) {
  const showBack =
    (activeTab === "dashboard" && currentScreen !== "dashboard-home") ||
    (activeTab === "chat" && currentScreen !== "chat-history");
  const showNewChat = currentScreen === "chat-history";

  return (
    <header className="shrink-0 border-b border-slate-200/70 bg-white/85 px-3 pb-3 pt-3 backdrop-blur-md">
      <div className="flex h-11 items-center justify-between gap-2">
        <button
          type="button"
          aria-label="返回"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors active:bg-slate-100 active:text-slate-900",
            !showBack && "invisible pointer-events-none",
          )}
          onClick={onBack}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="flex-1 truncate text-center text-[17px] font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <button
          type="button"
          aria-label="新对话"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-emerald-700 transition-colors active:bg-emerald-50 active:text-emerald-900",
            !showNewChat && "invisible pointer-events-none",
          )}
          onClick={onNewChat}
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
