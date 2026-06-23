import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { AppCronJob, AppHousehold, AppHouseholdMember, AppUser } from "@/shared/api/app-api";
import { EditIcon, SettingsIcon } from "@/features/shared-ui/icons";
import { useTheme } from "@/shared/theme/theme-provider";

export function ProfileCenter({
  user,
  currentHousehold,
  households,
  members,
  reminderJobs,
  onSwitchHousehold,
  onUpdateMember,
  onEditProfile,
  onOpenSettings,
  onOpenReminders,
}: {
  user?: AppUser;
  currentHousehold?: AppHousehold;
  households: AppHousehold[];
  members: AppHouseholdMember[];
  reminderJobs: AppCronJob[];
  onSwitchHousehold: (householdId: string) => Promise<void>;
  onUpdateMember: (
    memberId: string,
    input: { role?: "owner" | "member"; displayName?: string },
  ) => Promise<void>;
  onEditProfile: () => void;
  onOpenSettings: () => void;
  onOpenReminders: () => void;
}) {
  const myRole = currentHousehold?.role ?? "member";
  const canEditMembers = myRole === "owner";
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-5">
      <section className="rounded-[1.7rem] bg-[linear-gradient(135deg,_#0f172a,_#0f766e)] p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-3">
          <AvatarPreview user={user} />
          <div className="min-w-0 flex-1 text-white">
            <p className="text-sm text-emerald-100">个人中心</p>
            <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight">
              {user?.nickname || user?.username || "用户"}
            </h2>
            <p className="mt-1 text-xs text-emerald-50/80">
              {[formatGender(user?.gender), user?.age != null ? `${user.age}岁` : "年龄未填"].join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-white/20 bg-white/10 text-white/90 hover:bg-white/15"
              aria-label="系统设置"
              title="系统设置"
              onClick={onOpenSettings}
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-white/20 bg-white/10 text-white/90 hover:bg-white/15"
              aria-label="编辑个人信息"
              title="编辑个人信息"
              onClick={onEditProfile}
            >
              <EditIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <InfoTile label="当前家庭" value={currentHousehold?.name ?? "未选择"} />
          <InfoTile label="邀请码" value={currentHousehold?.code ?? "未生成"} />
        </div>
      </section>

      <section className="rounded-[1.55rem] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">主题模式</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {theme === "dark" ? "深色模式" : "浅色模式"}
            </p>
          </div>
          <Switch
            checked={theme === "dark"}
            aria-label="切换深色模式"
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </section>

      <section className="rounded-[1.55rem] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">定时任务</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {formatReminderSummary(reminderJobs)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 shrink-0 rounded-xl px-3 text-xs font-semibold"
            onClick={onOpenReminders}
          >
            查看
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {reminderJobs.slice(0, 3).map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950"
            >
              <span className="min-w-0 truncate text-sm font-medium text-slate-800 dark:text-slate-100">{job.title}</span>
              <span className="shrink-0 text-xs text-slate-400">{job.nextRunAt || job.scheduleText}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.55rem] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">家庭</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{households.length} 个家庭</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {households.map((household) => {
            const active = household.id === currentHousehold?.id;
            return (
              <Button
                key={household.id}
                type="button"
                variant="outline"
                className={[
                  "flex h-auto w-full items-center justify-between whitespace-normal rounded-2xl px-3 py-3 text-left transition-colors",
                  active
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
                ].join(" ")}
                onClick={() => void onSwitchHousehold(household.id)}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-950 dark:text-slate-100">{household.name}</span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{household.code || "未生成邀请码"}</span>
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{household.role === "owner" ? "管理员" : "成员"}</span>
              </Button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.55rem] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">成员</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{canEditMembers ? "管理员可编辑" : "仅查看"}</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-5 text-center text-sm text-slate-400">
              暂无成员
            </div>
          ) : null}
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              editable={canEditMembers}
              onUpdateMember={onUpdateMember}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3 backdrop-blur">
      <p className="truncate text-lg font-semibold">{value}</p>
      <p className="mt-1 text-[11px] text-slate-200">{label}</p>
    </div>
  );
}

function AvatarPreview({ user }: { user?: AppUser }) {
  const fallback = (user?.nickname || user?.username || "我").slice(0, 1).toUpperCase();

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className="h-14 w-14 shrink-0 rounded-full border border-white/30 object-cover"
      />
    );
  }

  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/15 text-lg font-semibold text-white ring-1 ring-white/20">
      {fallback}
    </div>
  );
}

function formatGender(gender?: string | null) {
  const genderMap: Record<string, string> = {
    male: "男",
    female: "女",
    other: "其他",
    unknown: "未知",
  };
  return gender ? genderMap[gender] || gender : "性别未填";
}

function formatReminderSummary(jobs: AppCronJob[]) {
  const enabled = jobs.filter((job) => job.status === "enabled").length;
  const next = jobs.find((job) => job.nextRunAt)?.nextRunAt;
  return next ? `${enabled} 个启用，下次 ${next}` : `${enabled} 个启用`;
}

function MemberRow({
  member,
  editable,
  onUpdateMember,
}: {
  member: AppHouseholdMember;
  editable: boolean;
  onUpdateMember: (
    memberId: string,
    input: { role?: "owner" | "member"; displayName?: string },
  ) => Promise<void>;
}) {
  const customDisplayName = member.displayName?.trim();
  const displayName = customDisplayName || member.user.username || "成员";
  const canPromoteToOwner = editable && member.role !== "owner";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{displayName}</p>
            {editable ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="修改成员名称"
                title="修改成员名称"
                onClick={() => {
                  const nextName = window.prompt("成员显示名", displayName);
                  if (nextName !== null) {
                    void onUpdateMember(member.id, { displayName: nextName });
                  }
                }}
              >
                <EditIcon className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {member.role === "owner" ? "管理员" : "成员"}
        </span>
      </div>
      {canPromoteToOwner ? (
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            className="h-9 w-full rounded-xl bg-emerald-50 text-xs font-semibold text-emerald-700"
            onClick={() => {
              void onUpdateMember(member.id, { role: "owner" });
            }}
          >
            设为管理员
          </Button>
        </div>
      ) : null}
    </div>
  );
}
