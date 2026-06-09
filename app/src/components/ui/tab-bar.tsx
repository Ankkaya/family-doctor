import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export type TabBarItem<K extends string = string> = {
  key: K;
  label: string;
  icon: ReactNode;
  sublabel?: string;
};

type TabBarProps<K extends string> = {
  items: TabBarItem<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
};

/**
 * 通用底部 Tab 栏：
 * - 作为父级 flex 列的 `shrink-0` 子项时自动贴底
 * - 自带 `env(safe-area-inset-bottom)` 适配全面屏
 * - 图标 + 主文本 + 可选副文本
 */
export function TabBar<K extends string>({
  items,
  value,
  onChange,
  className,
}: TabBarProps<K>) {
  return (
    <nav
      className={cn(
        "shrink-0 border-t border-slate-200/70 bg-white/90 px-3 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] pt-1.5 backdrop-blur-md",
        className,
      )}
    >
      <ul
        className={cn(
          "grid gap-1.5 rounded-2xl bg-slate-100/80 p-1",
          items.length === 2 ? "grid-cols-2" : "",
        )}
        style={items.length > 2 ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` } : undefined}
      >
        {items.map((item) => {
          const active = item.key === value;
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onChange(item.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors",
                  active
                    ? "bg-[linear-gradient(135deg,_#0f172a,_#0f766e)] text-white shadow-[0_10px_22px_rgba(15,23,42,0.18)]"
                    : "text-slate-600 active:bg-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    active ? "bg-white/15 text-white" : "bg-white text-slate-700 shadow-sm",
                  )}
                >
                  <span className="[&_svg]:h-[17px] [&_svg]:w-[17px]">{item.icon}</span>
                </span>
                  <span className="min-w-0 flex-1">
                  <p className={cn("text-[13px] font-semibold leading-tight", active ? "text-white" : "text-slate-900")}>
                    {item.label}
                  </p>
                  {item.sublabel ? (
                    <p
                      className={cn(
                        "mt-0.5 truncate text-[11px] leading-tight",
                        active ? "text-slate-200" : "text-slate-500",
                      )}
                    >
                      {item.sublabel}
                    </p>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
