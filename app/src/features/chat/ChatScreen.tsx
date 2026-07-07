import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageList } from "@/features/chat/MessageList";
import { ApiError } from "@/shared/api/api-error";
import type { AppUser } from "@/shared/api/app-api";
import type { ChatMessage, Medicine } from "@/shared/mock/app-data";
import { showErrorToast, showInfoToast } from "@/shared/toast/toast-store";
import { cn } from "@/shared/lib/utils";
import { Mic, Square } from "lucide-react";

export function ChatScreen({
  input,
  messages,
  medicines,
  user,
  isSending,
  isTranscribing,
  onInputChange,
  onAudioRecorded,
  onSend,
  onOpenMedicine,
}: {
  input: string;
  messages: ChatMessage[];
  medicines: Medicine[];
  user?: AppUser;
  isSending: boolean;
  isTranscribing: boolean;
  onInputChange: (value: string) => void;
  onAudioRecorded: (file: File) => Promise<unknown>;
  onSend: () => void | Promise<void>;
  onOpenMedicine: (medicineId: string) => void;
}) {
  const latestMessageId = messages[messages.length - 1]?.id ?? "";
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const audioSampleRateRef = useRef(44100);
  const [showScopeNotice, setShowScopeNotice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    return () => {
      stopAudioCapture();
    };
  }, []);

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
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              className={cn(
                "!h-11 !w-11 shrink-0 rounded-xl",
                isRecording && "animate-pulse",
              )}
              disabled={isSending || isTranscribing}
              aria-label={isRecording ? "停止录音" : "开始语音输入"}
              title={isRecording ? "停止录音" : "语音输入"}
              onClick={() => {
                if (isRecording) {
                  void finishRecording();
                  return;
                }
                void startRecording();
              }}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button className="!h-11 shrink-0 px-4" onClick={onSend} disabled={isSending || isTranscribing}>
              {isTranscribing ? "识别中" : isSending ? "发送中" : "发送"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showErrorToast("当前环境不支持录音");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("当前环境不支持音频采样");
      }
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const mute = audioContext.createGain();
      mute.gain.value = 0;

      audioChunksRef.current = [];
      audioSampleRateRef.current = audioContext.sampleRate;
      processor.onaudioprocess = (event) => {
        audioChunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };

      source.connect(processor);
      processor.connect(mute);
      mute.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      audioSourceRef.current = source;
      audioProcessorRef.current = processor;
      audioStreamRef.current = stream;
      setIsRecording(true);
      showInfoToast("正在录音", 1200);
    } catch (error) {
      stopAudioCapture();
      showErrorToast(error instanceof Error ? error.message : "无法开始录音");
    }
  }

  async function finishRecording() {
    const sourceSampleRate = audioSampleRateRef.current;
    const chunks = audioChunksRef.current;
    stopAudioCapture();
    setIsRecording(false);

    if (chunks.length === 0) {
      showErrorToast("没有录到有效语音");
      return;
    }

    const wavBlob = encodeWav(resampleTo16k(mergeAudioChunks(chunks), sourceSampleRate), 16000);
    if (wavBlob.size < 1024) {
      showErrorToast("录音时间太短");
      return;
    }

    const file = new File([wavBlob], `voice-${Date.now()}.wav`, { type: "audio/wav" });
    try {
      await onAudioRecorded(file);
      showInfoToast("已识别并填入输入框", 1600);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showErrorToast(error instanceof Error ? error.message : "语音识别失败");
      }
    }
  }

  function stopAudioCapture() {
    audioProcessorRef.current?.disconnect();
    audioSourceRef.current?.disconnect();
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close().catch(() => undefined);

    audioProcessorRef.current = null;
    audioSourceRef.current = null;
    audioStreamRef.current = null;
    audioContextRef.current = null;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
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

function mergeAudioChunks(chunks: Float32Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const samples = new Float32Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    samples.set(chunk, offset);
    offset += chunk.length;
  });

  return samples;
}

function resampleTo16k(samples: Float32Array, sourceSampleRate: number) {
  const targetSampleRate = 16000;
  if (sourceSampleRate === targetSampleRate) {
    return samples;
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const outputLength = Math.floor(samples.length / ratio);
  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = index * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(left + 1, samples.length - 1);
    const weight = sourceIndex - left;
    output[index] = samples[left] * (1 - weight) + samples[right] * weight;
  }

  return output;
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const bytesPerSample = 2;
  const channels = 1;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
