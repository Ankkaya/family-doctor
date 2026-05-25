import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AppHousehold } from "@/shared/api/app-api";

type FamilyMode = "create" | "join";

export function FamilySetupScreen({
  households,
  loading,
  error,
  onCreate,
  onJoin,
  onSwitch,
  onLogout,
}: {
  households: AppHousehold[];
  loading: boolean;
  error?: string;
  onCreate: (name: string) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
  onSwitch: (householdId: string) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [mode, setMode] = useState<FamilyMode>("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "create") {
      await onCreate(name);
      return;
    }

    await onJoin(code);
  };

  return (
    <main className="h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,_#eef8f4_0%,_#f8fafc_48%,_#ffffff_100%)] px-3 py-4 text-foreground">
      <div className="mx-auto flex h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[2.15rem] border border-white/70 bg-white shadow-[0_28px_100px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70">
        <div className="scrollbar-none flex-1 overflow-y-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-700">家庭管理</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">选择家庭</h1>
            </div>
            <button className="text-sm font-medium text-slate-500" type="button" onClick={() => void onLogout()}>
              退出
            </button>
          </div>

          {households.length > 0 ? (
            <section className="mt-6 space-y-2">
              {households.map((household) => (
                <button
                  key={household.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm"
                  onClick={() => void onSwitch(household.id)}
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-950">{household.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">{household.code || "未生成邀请码"}</span>
                  </span>
                  <span className="text-lg text-slate-300">›</span>
                </button>
              ))}
            </section>
          ) : null}

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {(["create", "join"] as FamilyMode[]).map((item) => (
              <button
                key={item}
                type="button"
                className={[
                  "h-10 rounded-lg text-sm font-semibold transition-colors",
                  mode === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500",
                ].join(" ")}
                onClick={() => setMode(item)}
              >
                {item === "create" ? "新建家庭" : "加入家庭"}
              </button>
            ))}
          </div>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            {mode === "create" ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">家庭名称</span>
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            ) : (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">家庭邀请码</span>
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base uppercase tracking-[0.18em] text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                />
              </label>
            )}

            {error ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
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
