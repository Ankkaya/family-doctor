import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { appApi, type AppCronJob, type AppCronJobExecution } from "@/shared/api/app-api";

export function ReminderTasksScreen({
  jobs,
  loading,
  onToggleStatus,
  onDelete,
}: {
  jobs: AppCronJob[];
  loading: boolean;
  onToggleStatus: (jobId: string, enabled: boolean) => Promise<void>;
  onDelete: (jobId: string) => Promise<void>;
}) {
  const [expandedJobId, setExpandedJobId] = useState<string>("");
  const [executions, setExecutions] = useState<Record<string, AppCronJobExecution[]>>({});
  const [executionsLoading, setExecutionsLoading] = useState("");

  const toggleExecutions = async (job: AppCronJob) => {
    if (expandedJobId === job.id) {
      setExpandedJobId("");
      return;
    }
    setExpandedJobId(job.id);
    if (job.virtual || executions[job.id]) return;

    setExecutionsLoading(job.id);
    try {
      const rows = await appApi.listCronJobExecutions(job.id);
      setExecutions((current) => ({
        ...current,
        [job.id]: rows,
      }));
    } finally {
      setExecutionsLoading("");
    }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          正在加载定时任务
        </div>
      ) : null}
      {!loading && jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
          暂无定时任务
        </div>
      ) : null}
      {jobs.map((job) => (
        <section
          key={job.id}
          className="rounded-[1.35rem] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/90"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={statusClassName(job.status)}>
                  {formatStatus(job.status)}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {formatTaskType(job.taskType)}
                </span>
                {job.source === "system" ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    系统默认
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 truncate text-base font-semibold text-slate-950 dark:text-slate-100">
                {job.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{job.scheduleText}</p>
              <p className="mt-1 text-xs text-slate-400">
                下次：{job.nextRunAt || "等待调度"}{job.lastRunAt ? ` · 上次：${job.lastRunAt}` : ""}
              </p>
            </div>
            {job.virtual ? null : (
              <Switch
                checked={job.status === "enabled"}
                aria-label="切换定时任务状态"
                onCheckedChange={(checked) => {
                  void onToggleStatus(job.id, checked);
                }}
              />
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {!job.virtual ? (
              <Button
                type="button"
                variant="secondary"
                className="h-9 rounded-xl px-3 text-xs font-semibold"
                onClick={() => {
                  void toggleExecutions(job);
                }}
              >
                记录
              </Button>
            ) : null}
            {!job.virtual ? (
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-xl px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  if (window.confirm(`删除「${job.title}」？`)) {
                    void onDelete(job.id);
                  }
                }}
              >
                删除
              </Button>
            ) : null}
          </div>
          {expandedJobId === job.id ? (
            <ExecutionList
              loading={executionsLoading === job.id}
              executions={executions[job.id] ?? []}
            />
          ) : null}
        </section>
      ))}
    </div>
  );
}

function ExecutionList({ loading, executions }: { loading: boolean; executions: AppCronJobExecution[] }) {
  if (loading) {
    return <p className="mt-3 text-xs text-slate-400">正在加载执行记录</p>;
  }
  if (executions.length === 0) {
    return <p className="mt-3 text-xs text-slate-400">暂无执行记录</p>;
  }
  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      {executions.slice(0, 5).map((execution) => (
        <div key={execution.id} className="flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-slate-600 dark:text-slate-300">{formatExecutionStatus(execution.status)}</span>
          <span className="text-slate-400">{formatExecutionTime(execution.startedAt)}</span>
        </div>
      ))}
    </div>
  );
}

function formatExecutionStatus(status: AppCronJobExecution["status"]) {
  if (status === "success") return "成功";
  if (status === "failed") return "失败";
  return "跳过";
}

function formatExecutionTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function statusClassName(status: AppCronJob["status"]) {
  if (status === "enabled") {
    return "rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300";
  }
  if (status === "expired") {
    return "rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300";
  }
  return "rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300";
}

function formatStatus(status: AppCronJob["status"]) {
  if (status === "enabled") return "启用";
  if (status === "expired") return "已结束";
  return "暂停";
}

function formatTaskType(taskType: AppCronJob["taskType"]) {
  if (taskType === "medicine") return "吃药";
  if (taskType === "temperature") return "量体温";
  return "药箱";
}
