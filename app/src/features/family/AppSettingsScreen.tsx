export function AppSettingsScreen({
  allowRxRecommendation,
  onToggleAllowRx,
  onBack,
  onLogout,
}: {
  allowRxRecommendation: boolean;
  onToggleAllowRx: (value: boolean) => Promise<void>;
  onBack: () => void;
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
      <section className="rounded-[1.55rem] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-950">系统设置</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">控制寻药推荐范围和账号操作</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
            onClick={onBack}
          >
            返回
          </button>
        </div>
      </section>

      <section className="rounded-[1.55rem] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">开启 RX 处方药推荐</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              默认关闭。关闭时，寻药只推荐家庭药箱中的 OTC 非处方药。
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={allowRxRecommendation}
            className={[
              "relative h-8 w-14 shrink-0 rounded-full transition-colors",
              allowRxRecommendation ? "bg-emerald-600" : "bg-slate-300",
            ].join(" ")}
            onClick={() => void handleToggle(!allowRxRecommendation)}
          >
            <span
              className={[
                "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
                allowRxRecommendation ? "translate-x-7" : "translate-x-1",
              ].join(" ")}
            />
          </button>
        </div>
      </section>

      <button
        type="button"
        className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white"
        onClick={() => void onLogout()}
      >
        退出登录
      </button>
    </div>
  );
}
