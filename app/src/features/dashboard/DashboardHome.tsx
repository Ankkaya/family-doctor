import { Button } from "@/components/ui/button";
import { AppBrandIcon } from "@/features/shared-ui/AppBrand";
import { EditIcon, HistoryIcon, SearchIcon } from "@/features/shared-ui/icons";
import { cn } from "@/shared/lib/utils";
import type { Medicine } from "@/shared/mock/app-data";
import type { ScreenKey, TabKey } from "@/stores/useAppStore";

export function DashboardHome({
  medicines,
  onNavigate,
  onTabChange,
}: {
  medicines: Medicine[];
  onNavigate: (screen: ScreenKey) => void;
  onTabChange: (tab: TabKey) => void;
}) {
  const otcCount = medicines.filter((medicine) => medicine.otc === "OTC").length;
  const cards = [
    {
      title: "药品录入",
      description: "补充家中常备用药信息。",
      iconTone: "bg-sky-100 text-sky-700",
      icon: <EditIcon className="h-5 w-5" />,
      action: () => onNavigate("entry-methods"),
    },
    {
      title: "药品查询",
      description: "查看药品标签、有效期和适应症。",
      iconTone: "bg-emerald-100 text-emerald-700",
      icon: <SearchIcon className="h-5 w-5" />,
      action: () => onNavigate("medicine-list"),
    },
    {
      title: "对话历史",
      description: "回看已保存的问诊记录。",
      iconTone: "bg-amber-100 text-amber-700",
      icon: <HistoryIcon className="h-5 w-5" />,
      action: () => onNavigate("history-list"),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-[linear-gradient(145deg,_#ffffff_0%,_#eefbf7_54%,_#eaf4ff_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <AppBrandIcon className="h-16 w-16 rounded-[1.35rem]" imageClassName="h-12 w-12 rounded-[1rem]" />
            <div className="min-w-0">
              <h2 className="truncate text-[1.7rem] font-semibold leading-tight text-slate-950">家庭药箱</h2>
              <p className="mt-1 truncate text-sm font-medium text-emerald-700">家庭用药控制台</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-100 bg-white/75 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
            当前家庭
          </span>
        </div>
        <p className="mt-5 rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm">
          管理常备用药，按家庭药箱给出寻药参考。
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric value={String(medicines.length)} label="药箱药品" />
          <Metric value={String(otcCount)} label="OTC" />
          <Metric value="AI" label="寻药" />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {cards.map((card, index) => (
          <button
            key={card.title}
            className={cn(
              "min-h-[8.6rem] rounded-[1.35rem] border bg-white p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-transform active:scale-[0.98]",
              index === 0 && "border-sky-100",
              index === 1 && "border-emerald-100",
              index === 2 && "border-amber-100",
            )}
            onClick={card.action}
          >
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", card.iconTone)}>
              {card.icon}
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-950">{card.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{card.description}</p>
          </button>
        ))}
      </section>

      <section className="rounded-[1.45rem] border border-slate-200 bg-white/95 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">常看药品</p>
            <p className="mt-1 text-xs text-slate-500">来自当前家庭药箱</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">CABINET</span>
        </div>
        <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto pb-1">
          {medicines.length === 0 && (
            <div className="w-full rounded-[1.2rem] border border-dashed border-slate-200 px-3 py-5 text-center text-sm text-slate-400">
              暂无药品
            </div>
          )}
          {medicines.slice(0, 3).map((medicine) => (
            <div
              key={medicine.id}
              className="min-w-[9.5rem] rounded-[1.2rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] px-3 py-3"
            >
              <p className="line-clamp-1 text-sm font-semibold text-slate-900">{medicine.name}</p>
              <p className="mt-2 text-[11px] text-slate-500">有效期</p>
              <p className="mt-1 text-sm text-amber-700">{medicine.expiry}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.45rem] border border-slate-200 bg-[linear-gradient(135deg,_#fff7ed,_#ffffff_58%,_#f0fdfa)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">最近使用</p>
            <p className="mt-1 text-sm text-slate-500">继续进行症状咨询。</p>
          </div>
          <Button variant="secondary" className="bg-white" onClick={() => onTabChange("chat")}>
            去寻药
          </Button>
        </div>
      </section>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-3 shadow-sm backdrop-blur">
      <p className="text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
