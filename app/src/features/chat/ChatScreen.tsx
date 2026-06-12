import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageList } from "@/features/chat/MessageList";
import type { AppUser } from "@/shared/api/app-api";
import type { ChatMessage, Medicine } from "@/shared/mock/app-data";

export function ChatScreen({
  input,
  messages,
  medicines,
  user,
  isSending,
  onInputChange,
  onSend,
  onOpenMedicine,
}: {
  input: string;
  messages: ChatMessage[];
  medicines: Medicine[];
  user?: AppUser;
  isSending: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  onOpenMedicine: (medicineId: string) => void;
}) {
  const latestMessageId = messages[messages.length - 1]?.id ?? "";
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  useLayoutEffect(() => {
    resizeChatInput(inputRef.current);
  }, [input]);

  return (
    <div className="flex min-h-full flex-col">
      {showScopeNotice ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
          <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.26)] dark:bg-slate-900">
            <p className="text-base font-semibold text-slate-950 dark:text-slate-100">寻药推荐说明</p>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              系统默认只推荐家庭药箱中的 OTC（非处方）药品。如需允许推荐 RX（处方）药品，可在“我的 - 系统设置”中开启。处方药必须在医生或药师指导下使用。
            </p>
            <Button
              type="button"
              className="mt-5 h-11 w-full rounded-2xl text-sm font-semibold"
              onClick={() => setShowScopeNotice(false)}
            >
              我知道了
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex-1 px-4 pb-4">
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
      <div className="sticky bottom-0 z-20 mt-auto space-y-2 bg-[linear-gradient(180deg,_rgba(248,250,252,0),_rgba(248,250,252,0.96)_18%,_rgba(248,250,252,0.98))] pb-[env(safe-area-inset-bottom)] pt-3 dark:bg-[linear-gradient(180deg,_rgba(15,23,42,0),_rgba(15,23,42,0.96)_18%,_rgba(15,23,42,0.98))]">
        <section className="border-t border-slate-200 bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              className="scrollbar-none h-11 min-h-11 flex-1 resize-none overflow-y-auto rounded-xl border-slate-200 bg-slate-50 px-3 py-[11px] text-sm leading-[20px] focus-visible:ring-sky-100 dark:border-slate-800 dark:bg-slate-900"
              rows={1}
              placeholder="描述症状，例如：头痛发热两天"
              value={input}
              onInput={(event) => resizeChatInput(event.currentTarget)}
              onChange={(event) => onInputChange(event.target.value)}
            />
            <Button className="!h-11 shrink-0 px-4" onClick={onSend} disabled={isSending}>
              {isSending ? "发送中" : "发送"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function resizeChatInput(target: HTMLTextAreaElement | null) {
  if (!target) return;

  const styles = window.getComputedStyle(target);
  const lineHeight = Number.parseFloat(styles.lineHeight);
  const paddingTop = Number.parseFloat(styles.paddingTop);
  const paddingBottom = Number.parseFloat(styles.paddingBottom);
  const borderTop = Number.parseFloat(styles.borderTopWidth);
  const borderBottom = Number.parseFloat(styles.borderBottomWidth);
  const verticalSpace = paddingTop + paddingBottom + borderTop + borderBottom;
  const minHeight = Math.max(44, lineHeight + verticalSpace);
  const maxHeight = lineHeight * 6 + verticalSpace;

  target.style.height = "auto";
  const nextHeight = Math.min(Math.max(target.scrollHeight, minHeight), maxHeight);
  target.style.height = `${nextHeight}px`;

  if (target.scrollHeight > nextHeight && document.activeElement === target) {
    window.requestAnimationFrame(() => {
      target.scrollTop = target.scrollHeight;
    });
  }
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
