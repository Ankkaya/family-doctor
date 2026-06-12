import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppBrandIcon } from "@/features/shared-ui/AppBrand";

type AuthMode = "login" | "register";

export function AuthScreen({
  loading,
  onLogin,
  onRegister,
}: {
  loading: boolean;
  onLogin: (input: { username: string; password: string }) => Promise<void>;
  onRegister: (input: { username: string; password: string; registrationCode: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [localError, setLocalError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedUsername = username.trim();
    const normalizedRegistrationCode = registrationCode.trim();

    if (!normalizedUsername) {
      setLocalError("请输入用户名");
      return;
    }

    if (!password) {
      setLocalError("请输入密码");
      return;
    }

    if (mode === "login") {
      setLocalError("");
      await onLogin({ username: normalizedUsername, password });
      return;
    }

    if (normalizedUsername.length < 3) {
      setLocalError("用户名至少 3 个字符");
      return;
    }

    if (password.length < 6) {
      setLocalError("密码至少 6 个字符");
      return;
    }

    if (!normalizedRegistrationCode) {
      setLocalError("请输入注册码");
      return;
    }

    setLocalError("");
    await onRegister({ username: normalizedUsername, password, registrationCode: normalizedRegistrationCode });
  };

  return (
    <main className="h-[100dvh] overflow-hidden bg-white text-foreground dark:bg-slate-950">
      <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden bg-white dark:bg-slate-950">
        <div className="flex flex-1 flex-col justify-center px-6 pb-8 pt-[calc(env(safe-area-inset-top)+2rem)]">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(15,118,110,0.08)]">
              <AppBrandIcon
                className="h-24 w-24 rounded-[1.85rem] shadow-[0_18px_44px_rgba(15,118,110,0.18)] ring-white/80"
                imageClassName="h-20 w-20 rounded-[1.45rem]"
              />
            </div>
            <p className="mt-5 text-3xl font-bold leading-tight text-slate-950 dark:text-slate-100">家庭药箱</p>
          </div>

          <div className="mt-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            {(["login", "register"] as AuthMode[]).map((item) => (
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
                {item === "login" ? "登录" : "注册"}
              </Button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">用户名</span>
              <Input
                className="mt-2 h-12 rounded-xl border-slate-200 bg-white text-base text-slate-950 focus-visible:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                value={username}
                autoCapitalize="none"
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">密码</span>
              <Input
                className="mt-2 h-12 rounded-xl border-slate-200 bg-white text-base text-slate-950 focus-visible:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                type="password"
                value={password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {mode === "register" ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">注册码</span>
                <Input
                  className="mt-2 h-12 rounded-xl border-slate-200 bg-white text-base uppercase tracking-[0.18em] text-slate-950 focus-visible:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  value={registrationCode}
                  autoCapitalize="characters"
                  onChange={(event) => setRegistrationCode(event.target.value.toUpperCase())}
                />
              </label>
            ) : null}

            <div
              aria-live="polite"
              className={[
                "min-h-10 rounded-xl border px-3 py-2 text-sm transition-colors",
                localError
                  ? "border-red-100 bg-red-50 text-red-700"
                  : "border-transparent bg-transparent text-transparent",
              ].join(" ")}
            >
              {localError || " "}
            </div>

            <Button className="h-12 w-full rounded-xl" disabled={loading}>
              {loading ? "提交中" : mode === "login" ? "登录" : "注册"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
