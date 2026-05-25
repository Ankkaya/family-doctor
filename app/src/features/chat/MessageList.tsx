import type { ChatMessage } from "@/shared/mock/app-data";
import type { Medicine } from "@/shared/mock/app-data";
import { ChatIcon, PillIcon, UserIcon } from "@/features/shared-ui/icons";
import { Tag } from "@/features/shared-ui/Surface";
import { formatMedicineCategory } from "@/shared/lib/medicine-category";
import { cn } from "@/shared/lib/utils";

export function MessageList({
  messages,
  medicines,
  userAvatarUrl,
  userName = "我",
  isLoading = false,
  onOpenMedicine,
}: {
  messages: ChatMessage[];
  medicines: Medicine[];
  userAvatarUrl?: string | null;
  userName?: string;
  isLoading?: boolean;
  onOpenMedicine: (medicineId: string) => void;
}) {
  if (messages.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isUser = message.role === "user";
        const rowAlign = isUser ? "justify-end" : "justify-start";
        const bubble =
          isUser
            ? "bg-sky-600 text-white"
            : "border border-slate-200 bg-white text-slate-800";

        return (
          <div key={message.id} className="flex flex-col">
            {message.timestamp ? (
              <div className="mb-2 self-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                {message.timestamp}
              </div>
            ) : null}
            <div className={cn("flex w-full items-start gap-2", rowAlign)}>
              {!isUser ? <MessageAvatar role={message.role} /> : null}
              <div className={cn("flex max-w-[calc(100%-2.5rem)] flex-col", isUser ? "items-end" : "items-start")}>
                <div className={cn("max-w-full rounded-[1.45rem] px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)]", bubble)}>
                  <MessageText message={message} />
                </div>
                {message.cards && (
                  <div className="mt-2 grid w-full gap-2">
                    {message.cards.map((card) => {
                      const medicine = medicines.find((item) => item.id === card.medicineId);
                      const medicineName = medicine?.name || card.name;
                      if (!medicineName) return null;

                      return (
                        <button
                          key={card.medicineId}
                          className="rounded-[1.45rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                          onClick={() => onOpenMedicine(card.medicineId)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                                <PillIcon className="h-5 w-5" />
                              </div>
                              <p className="text-base font-semibold text-slate-950">{medicineName}</p>
                            </div>
                            <Tag tone={(medicine?.otc || card.otc) === "OTC" ? "neutral" : "danger"}>
                              {formatMedicineCategory(medicine?.otc || card.otc || "OTC")}
                            </Tag>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{card.summary}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-slate-400">{medicine?.indication || card.indication || "适应症摘要"}</span>
                            <span className="text-sm font-semibold text-sky-700">{medicine ? "进入药品页" : "查看建议"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {isUser ? <MessageAvatar role={message.role} avatarUrl={userAvatarUrl} name={userName} /> : null}
            </div>
          </div>
        );
      })}
      {isLoading ? <AssistantLoadingMessage /> : null}
    </div>
  );
}

function MessageText({ message }: { message: ChatMessage }) {
  const disclaimer = message.role === "assistant" ? message.disclaimer : undefined;

  return (
    <>
      <p className="whitespace-pre-line text-sm leading-6">{message.text}</p>
      {disclaimer ? (
        <p className="mt-3 border-t border-amber-100 pt-2 text-xs leading-5 text-amber-700">
          {disclaimer}
        </p>
      ) : null}
    </>
  );
}

function MessageAvatar({
  role,
  avatarUrl,
  name = "我",
}: {
  role: ChatMessage["role"];
  avatarUrl?: string | null;
  name?: string;
}) {
  const isUser = role === "user";

  if (isUser && avatarUrl?.trim()) {
    return (
      <img
        src={avatarUrl}
        alt={`${name}头像`}
        className="h-8 w-8 shrink-0 rounded-full object-cover shadow-[0_6px_14px_rgba(15,23,42,0.08)] ring-1 ring-white/80"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-[0_6px_14px_rgba(15,23,42,0.08)] ring-1 ring-white/80",
        isUser ? "bg-sky-600 text-white" : "bg-emerald-100 text-emerald-700",
      )}
      aria-hidden="true"
    >
      {isUser ? <UserIcon className="h-4 w-4" /> : <ChatIcon className="h-4 w-4" />}
    </div>
  );
}

function AssistantLoadingMessage() {
  return (
    <div className="flex w-full items-start justify-start gap-2">
      <MessageAvatar role="assistant" />
      <div className="rounded-[1.45rem] border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-2 text-sm leading-6">
          <span>AI 正在回复</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"
                style={{ animationDelay: `${index * 120}ms` }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
