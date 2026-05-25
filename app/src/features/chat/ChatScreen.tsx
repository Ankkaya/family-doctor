import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/features/chat/MessageList";
import type { AppUser } from "@/shared/api/app-api";
import type { ChatMessage, Medicine } from "@/shared/mock/app-data";

export function ChatScreen({
  input,
  messages,
  medicines,
  user,
  isSending,
  error,
  onInputChange,
  onSend,
  onOpenMedicine,
}: {
  input: string;
  messages: ChatMessage[];
  medicines: Medicine[];
  user?: AppUser;
  isSending: boolean;
  error?: string;
  onInputChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  onOpenMedicine: (medicineId: string) => void;
}) {
  const latestMessageId = messages[messages.length - 1]?.id ?? "";
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScopeNotice, setShowScopeNotice] = useState(false);

  useEffect(() => {
    const key = "chat_scope_notice_seen";
    if (window.localStorage.getItem(key) === "true") return;

    setShowScopeNotice(true);
    window.localStorage.setItem(key, "true");
  }, []);

  useEffect(() => {
    if (messages.length === 0 && !isSending) return;

    const target = bottomRef.current;
    if (!target) return;

    let timeoutId: number | undefined;
    const frameId = window.requestAnimationFrame(() => {
      scrollToBottom(target);
      timeoutId = window.setTimeout(() => scrollToBottom(target), 80);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [messages.length, latestMessageId, isSending]);

  return (
    <div className="flex min-h-full flex-col">
      {showScopeNotice ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
          <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.26)]">
            <p className="text-base font-semibold text-slate-950">寻药推荐说明</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              系统默认只推荐家庭药箱中的 OTC（非处方）药品。如需允许推荐 RX（处方）药品，可在“我的 - 系统设置”中开启。处方药必须在医生或药师指导下使用。
            </p>
            <button
              type="button"
              className="mt-5 h-11 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white"
              onClick={() => setShowScopeNotice(false)}
            >
              我知道了
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex-1 pb-4">
        {messages.length === 0 ? (
          <section className="rounded-[1.6rem] border border-emerald-100 bg-[linear-gradient(135deg,_#ecfdf5,_#f8fafc)] px-4 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <p className="text-base font-semibold text-slate-950">输入症状或用药问题</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              AI 会结合当前家庭药箱，给出可参考的药品建议和风险提示。
            </p>
          </section>
        ) : null}
        <MessageList
          messages={messages}
          medicines={medicines}
          userAvatarUrl={user?.avatarUrl}
          userName={user?.nickname || user?.username || "我"}
          isLoading={isSending}
          onOpenMedicine={onOpenMedicine}
        />
        <div ref={bottomRef} className="h-px" />
      </div>
      <div className="sticky bottom-0 z-20 mt-auto space-y-2 bg-[linear-gradient(180deg,_rgba(248,250,252,0),_rgba(248,250,252,0.96)_18%,_rgba(248,250,252,0.98))] pb-1 pt-3">
        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            {error}
          </div>
        )}
        <section className="rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)] p-3 shadow-[0_16px_34px_rgba(15,23,42,0.12)]">
          <div className="flex items-end gap-2">
            <textarea
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(14,165,233,0.12)]"
              rows={2}
              placeholder="描述症状，例如：头痛发热两天"
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
            />
            <Button className="h-11 shrink-0 px-4" onClick={onSend} disabled={isSending}>
              {isSending ? "发送中" : "发送"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function scrollToBottom(target: HTMLElement) {
  const scrollParent = findScrollParent(target);

  scrollParent.scrollTo({
    top: scrollParent.scrollHeight,
    behavior: "auto",
  });
}

function findScrollParent(target: HTMLElement): HTMLElement {
  let current = target.parentElement;

  while (current) {
    const overflowY = window.getComputedStyle(current).overflowY;
    const canScroll = /(auto|scroll|overlay)/.test(overflowY);

    if (canScroll && current.scrollHeight > current.clientHeight) {
      return current;
    }

    current = current.parentElement;
  }

  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}
