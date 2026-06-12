import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HistorySession } from "@/shared/mock/app-data";
import type { Medicine } from "@/shared/mock/app-data";
import type { ChatMessage } from "@/shared/mock/app-data";
import { MessageList } from "@/features/chat/MessageList";

export function HistoryList({
  sessions,
  loading,
  onOpenHistory,
}: {
  sessions: HistorySession[];
  loading: boolean;
  onOpenHistory: (historyId: string) => void;
}) {
  if (loading) {
    return (
      <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        正在加载
      </section>
    );
  }

  if (sessions.length === 0) {
    return (
      <section className="rounded-[1.45rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        暂无对话历史
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Button
          key={session.id}
          variant="outline"
          className="block h-auto w-full whitespace-normal rounded-[1.45rem] border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,_#0f172a,_#111827)]"
          onClick={() => onOpenHistory(session.id)}
        >
          <div className="relative pl-4">
            <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-950 dark:text-slate-100">
                {getHistoryTitle(session)}
              </h3>
              <HistoryDateBadge session={session} />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{session.summary}</p>
          </div>
        </Button>
      ))}
    </div>
  );
}

export function HistoryTitleText({ session }: { session: HistorySession }) {
  return (
    <span className="min-w-0 truncate">
      {getHistoryTitle(session)}
    </span>
  );
}

export function HistoryDateBadge({ session }: { session: HistorySession }) {
  return (
    <Badge
      variant="outline"
      className="shrink-0 border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300"
    >
      {formatHistoryDateTag(session)}
    </Badge>
  );
}

export function getHistoryTitle(session: HistorySession) {
  const firstUserMessage = session.messages.find((message) => message.role === "user")?.text;
  return truncateHistoryTitle(firstUserMessage || session.title || "未命名对话");
}

export function truncateHistoryTitle(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "未命名对话";

  return normalized.length > 18 ? `${normalized.slice(0, 18)}...` : normalized;
}

export function formatHistoryDateTag(session: HistorySession) {
  if (!session.createdAt) return session.date;

  const date = new Date(session.createdAt);
  if (Number.isNaN(date.getTime())) return session.date;

  const today = new Date();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (date.getFullYear() === today.getFullYear()) {
    return `${month}月${day}日`;
  }

  return `${date.getFullYear()}年${month}月${day}日`;
}

export function HistoryDetail({
  session,
  medicines,
  onOpenMedicine,
}: {
  session: HistorySession | null;
  medicines: Medicine[];
  onOpenMedicine: (medicineId: string) => void;
}) {
  if (!session) {
    return (
      <section className="rounded-[1.45rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        未找到对话
      </section>
    );
  }

  return (
    <div>
      <MessageList messages={session.messages as ChatMessage[]} medicines={medicines} onOpenMedicine={onOpenMedicine} />
    </div>
  );
}
