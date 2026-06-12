import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppHousehold } from "@/shared/api/app-api";

type FamilyMode = "create" | "join";

export function FamilySetupScreen({
  households,
  loading,
  onCreate,
  onJoin,
  onSwitch,
  onLogout,
}: {
  households: AppHousehold[];
  loading: boolean;
  onCreate: (name: string) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
  onSwitch: (householdId: string) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [mode, setMode] = useState<FamilyMode>("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "create") {
      const normalizedName = name.trim();
      if (!normalizedName) {
        setLocalError("请输入家庭名称");
        return;
      }
      setLocalError("");
      await onCreate(normalizedName);
      return;
    }

    const normalizedCode = code.trim();
    if (!normalizedCode) {
      setLocalError("请输入家庭邀请码");
      return;
    }
    setLocalError("");
    await onJoin(normalizedCode);
  };

  return (
    <main className="h-[100dvh] overflow-hidden bg-white text-foreground dark:bg-slate-950">
      <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden bg-white dark:bg-slate-950">
        <div className="scrollbar-none flex-1 overflow-y-auto px-6 pb-8 pt-[calc(env(safe-area-inset-top)+2rem)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-700">家庭管理</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">选择家庭</h1>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-xl text-sm font-medium"
              type="button"
              onClick={() => void onLogout()}
            >
              退出
            </Button>
          </div>

          {households.length > 0 ? (
            <section className="mt-6 space-y-2">
              {households.map((household) => (
                <Button
                  key={household.id}
                  type="button"
                  variant="outline"
                  className="flex h-auto w-full items-center justify-between whitespace-normal rounded-2xl border-slate-200 bg-white px-4 py-3 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  onClick={() => void onSwitch(household.id)}
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-950 dark:text-slate-100">{household.name}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{household.code || "未生成邀请码"}</span>
                  </span>
                  <span className="text-lg text-slate-300">›</span>
                </Button>
              ))}
            </section>
          ) : null}

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            {(["create", "join"] as FamilyMode[]).map((item) => (
              <Button
                key={item}
                type="button"
                variant="ghost"
                className={[
                  "h-10 rounded-lg text-sm font-semibold transition-colors",
                  mode === item ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400",
                ].join(" ")}
                onClick={() => setMode(item)}
              >
                {item === "create" ? "新建家庭" : "加入家庭"}
              </Button>
            ))}
          </div>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            {mode === "create" ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">家庭名称</span>
                <Input
                  className="mt-2 h-12 rounded-xl border-slate-200 bg-white text-base text-slate-950 focus-visible:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            ) : (
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">家庭邀请码</span>
                <Input
                  className="mt-2 h-12 rounded-xl border-slate-200 bg-white text-base uppercase tracking-[0.18em] text-slate-950 focus-visible:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                />
              </label>
            )}

            {localError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {localError}
              </div>
            ) : null}

            <Button className="h-12 w-full rounded-xl" disabled={loading}>
              {loading ? "提交中" : mode === "create" ? "创建家庭" : "加入家庭"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
