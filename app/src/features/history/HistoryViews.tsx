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
  const grouped = sessions.reduce<Record<string, HistorySession[]>>((acc, session) => {
    acc[session.date] = acc[session.date] ? [...acc[session.date], session] : [session];
    return acc;
  }, {});

  if (loading) {
    return (
      <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
        正在加载
      </section>
    );
  }

  if (sessions.length === 0) {
    return (
      <section className="rounded-[1.45rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        暂无对话历史
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, sessions]) => (
        <section key={date}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{date}</p>
          <div className="space-y-3">
            {sessions.map((session) => (
              <button
                key={session.id}
                className="w-full rounded-[1.45rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                onClick={() => onOpenHistory(session.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="relative pl-4">
                    <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <h3 className="text-base font-semibold text-slate-950">{session.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{session.summary}</p>
                  </div>
                  <span className="text-sm text-slate-400">{session.time}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
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
      <section className="rounded-[1.45rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        未找到对话
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.45rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <p className="text-sm text-slate-500">{session.date} · {session.time}</p>
        <p className="mt-1 text-lg font-semibold text-slate-950">{session.title}</p>
      </section>
      <MessageList messages={session.messages as ChatMessage[]} medicines={medicines} onOpenMedicine={onOpenMedicine} />
    </div>
  );
}
