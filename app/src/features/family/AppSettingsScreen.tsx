import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function AppSettingsScreen({
  allowRxRecommendation,
  onToggleAllowRx,
  onLogout,
}: {
  allowRxRecommendation: boolean;
  onToggleAllowRx: (value: boolean) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  async function handleToggle(nextValue: boolean) {
    if (nextValue) {
      const confirmed = window.confirm(
        "开启后，寻药可能会推荐 RX（处方）药品。处方药必须在医生或药师指导下使用，不能自行购买或服用。确定开启吗？",
      );
      if (!confirmed) return;
    }

    await onToggleAllowRx(nextValue);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.55rem] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">开启 RX 处方药推荐</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              默认关闭。关闭时，寻药只推荐家庭药箱中的 OTC 非处方药。
            </p>
          </div>
          <Switch
            role="switch"
            checked={allowRxRecommendation}
            aria-label="开启 RX 处方药推荐"
            onCheckedChange={(checked) => void handleToggle(checked)}
          />
        </div>
      </section>

      <Button
        type="button"
        variant="destructive"
        className="h-12 w-full rounded-2xl text-sm font-semibold"
        onClick={() => void onLogout()}
      >
        退出登录
      </Button>
    </div>
  );
}
