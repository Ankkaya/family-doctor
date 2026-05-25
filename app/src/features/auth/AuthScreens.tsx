import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppBrandIcon } from "@/features/shared-ui/AppBrand";

type AuthMode = "login" | "register";

export function AuthScreen({
  loading,
  error,
  onLogin,
  onRegister,
}: {
  loading: boolean;
  error?: string;
  onLogin: (input: { username: string; password: string }) => Promise<void>;
  onRegister: (input: { username: string; password: string; registrationCode: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "login") {
      await onLogin({ username, password });
      return;
    }

    await onRegister({ username, password, registrationCode });
  };

  return (
    <main className="h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,_#e8f6f2_0%,_#f8fbfc_46%,_#ffffff_100%)] px-3 py-4 text-foreground">
      <div className="mx-auto flex h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[2.15rem] border border-white/70 bg-white shadow-[0_28px_100px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70">
        <div className="flex flex-1 flex-col justify-center px-6 py-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(15,118,110,0.08)]">
              <AppBrandIcon
                className="h-24 w-24 rounded-[1.85rem] shadow-[0_18px_44px_rgba(15,118,110,0.18)] ring-white/80"
                imageClassName="h-20 w-20 rounded-[1.45rem]"
              />
            </div>
            <p className="mt-5 text-3xl font-bold leading-tight text-slate-950">家庭药箱</p>
          </div>

          <div className="mt-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {(["login", "register"] as AuthMode[]).map((item) => (
              <button
                key={item}
                type="button"
                className={[
                  "h-10 rounded-lg text-sm font-semibold transition-colors",
                  mode === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500",
                ].join(" ")}
                onClick={() => setMode(item)}
              >
                {item === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">用户名</span>
              <input
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={username}
                autoCapitalize="none"
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">密码</span>
              <input
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                type="password"
                value={password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {mode === "register" ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">注册码</span>
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base uppercase tracking-[0.18em] text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  value={registrationCode}
                  autoCapitalize="characters"
                  onChange={(event) => setRegistrationCode(event.target.value.toUpperCase())}
                />
              </label>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button className="h-12 w-full rounded-xl" disabled={loading}>
              {loading ? "提交中" : mode === "login" ? "登录" : "注册"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
