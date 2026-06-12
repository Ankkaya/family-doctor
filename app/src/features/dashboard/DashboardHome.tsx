import { Button } from "@/components/ui/button";
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
  const cards = [
    {
      title: "药品录入",
      description: "补充家中常备用药信息。",
      iconTone: "bg-sky-100 text-sky-700",
      icon: <EditIcon className="h-5 w-5" />,
      action: () => onNavigate("manual-entry"),
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
      <section className="grid grid-cols-3 gap-2">
        {cards.map((card, index) => (
          <Button
            key={card.title}
            variant="outline"
            className={cn(
              "block h-auto min-h-[8.6rem] whitespace-normal rounded-[1.35rem] bg-white p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-transform active:scale-[0.98] dark:bg-slate-900",
              index === 0 && "border-sky-100",
              index === 1 && "border-emerald-100",
              index === 2 && "border-amber-100",
            )}
            onClick={card.action}
          >
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", card.iconTone)}>
              {card.icon}
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-950 dark:text-slate-100">{card.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{card.description}</p>
          </Button>
        ))}
      </section>

      <section className="rounded-[1.45rem] border border-slate-200 bg-white/95 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">常看药品</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">来自当前家庭药箱</p>
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
              className="min-w-[9.5rem] rounded-[1.2rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] px-3 py-3 dark:border-slate-800 dark:bg-[linear-gradient(180deg,_#0f172a,_#111827)]"
            >
              <p className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{medicine.name}</p>
              <p className="mt-2 text-[11px] text-slate-500">有效期</p>
              <p className="mt-1 text-sm text-amber-700">{medicine.expiry}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.45rem] border border-slate-200 bg-[linear-gradient(135deg,_#fff7ed,_#ffffff_58%,_#f0fdfa)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,_#1f2937,_#0f172a_58%,_#042f2e)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">最近使用</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">继续进行症状咨询。</p>
          </div>
          <Button variant="secondary" className="bg-white dark:bg-slate-800" onClick={() => onTabChange("chat")}>
            去寻药
          </Button>
        </div>
      </section>
    </div>
  );
}
