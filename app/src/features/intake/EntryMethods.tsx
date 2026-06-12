import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CameraIcon, EditIcon, ScanIcon } from "@/features/shared-ui/icons";
import { SectionCard } from "@/features/shared-ui/Surface";
import type { Medicine } from "@/shared/mock/app-data";
import { cn } from "@/shared/lib/utils";
import type { ScreenKey } from "@/stores/useAppStore";

export function EntryMethods({ onNavigate }: { onNavigate: (screen: ScreenKey) => void }) {
  const methods: Array<{
    title: string;
    description: string;
    screen: ScreenKey;
    icon: ReactNode;
    tone: string;
  }> = [
    {
      title: "手动录入",
      description: "按字段分组填写基础信息与药品说明信息。",
      screen: "manual-entry",
      icon: <EditIcon className="h-5 w-5" />,
      tone: "bg-sky-500 text-white",
    },
    {
      title: "图片识别",
      description: "上传药盒、说明书或瓶身图片。",
      screen: "image-upload",
      icon: <CameraIcon className="h-5 w-5" />,
      tone: "bg-emerald-500 text-white",
    },
    {
      title: "扫描条形码",
      description: "扫描药品条形码并确认信息。",
      screen: "scan-entry",
      icon: <ScanIcon className="h-5 w-5" />,
      tone: "bg-amber-500 text-white",
    },
  ];

  return (
    <div className="space-y-3">
      {methods.map((method) => (
        <Button
          key={method.title}
          variant="outline"
          className="block h-auto w-full whitespace-normal rounded-[1.55rem] border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,_#0f172a,_#111827)]"
          onClick={() => onNavigate(method.screen)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", method.tone)}>
                {method.icon}
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-slate-100">{method.title}</h3>
              </div>
            </div>
            <span className="text-slate-400">›</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{method.description}</p>
        </Button>
      ))}
    </div>
  );
}

const inputClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(14,165,233,0.12)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100";
const medicineCategoryOptions: Array<{ label: string; value: Medicine["otc"] }> = [
  { label: "OTC(非处方药)", value: "OTC" },
  { label: "RX(处方药)", value: "Rx" },
];
type RecognitionPhase = "idle" | "uploading" | "recognizing" | "finalizing" | "completed" | "failed";
type RecognitionResultSummary = Medicine & { confidence?: number };

export function ManualEntry({
  onSave,
  onUploadImage,
}: {
  onSave: (medicine: Medicine) => void;
  onUploadImage: () => void;
}) {
  const [form, setForm] = useState<Medicine>({
    id: "manual-draft",
    name: "布洛芬缓释胶囊",
    expiry: "2026-12-31",
    indication: "头痛、发热、肌肉酸痛的短期缓解",
    contraindications: "胃溃疡、消化道出血史、孕晚期人群慎用",
    adverseReactions: "胃部不适、恶心、头晕",
    otc: "OTC",
    barcode: "6901234567890",
    source: "手动录入",
    quantity: 1,
  });

  const update = (key: keyof Medicine, value: string | number) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="flex h-auto w-full items-center justify-between whitespace-normal rounded-[1.35rem] border-emerald-100 bg-emerald-50 px-4 py-3 text-left active:bg-emerald-100"
        onClick={onUploadImage}
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white">
            <CameraIcon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-950 dark:text-slate-100">上传药盒图片识别</span>
            <span className="mt-1 block text-xs text-emerald-700">识别后可在确认页补充和修改</span>
          </span>
        </span>
        <span className="text-lg text-emerald-700">›</span>
      </Button>
      <SectionCard title="基础信息">
        <EditField label="药品名称" value={form.name} onChange={(value) => update("name", value)} />
        <EditField label="有效期" value={form.expiry} onChange={(value) => update("expiry", value)} />
        <label className="block text-sm">
          <span className="mb-2 block text-slate-500 dark:text-slate-400">分类</span>
          <Select
            className="mt-0"
            value={form.otc}
            options={medicineCategoryOptions}
            onChange={(value) => update("otc", value)}
          />
        </label>
        <EditField
          label="数量"
          value={String(form.quantity ?? 1)}
          onChange={(value) => update("quantity", Math.max(1, Number(value) || 1))}
        />
        <BarcodeField value={form.barcode} onChange={(value) => update("barcode", value)} />
      </SectionCard>
      <SectionCard title="说明信息">
        <EditField label="适应症" value={form.indication} onChange={(value) => update("indication", value)} multiline />
        <EditField
          label="禁忌人群"
          value={form.contraindications}
          onChange={(value) => update("contraindications", value)}
          multiline
        />
        <EditField
          label="不良反应"
          value={form.adverseReactions}
          onChange={(value) => update("adverseReactions", value)}
          multiline
        />
      </SectionCard>
      <Button className="w-full" size="lg" onClick={() => onSave({ ...form, id: `manual-${Date.now()}` })}>
        保存到家庭药箱
      </Button>
    </div>
  );
}

function BarcodeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block text-slate-500 dark:text-slate-400">条形码</span>
      <Input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function ImageUpload({
  loading,
  onConfirm,
  onViewResult,
}: {
  loading: boolean;
  onConfirm: (files: File[]) => Promise<RecognitionResultSummary>;
  onViewResult: () => void;
}) {
  const albumInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Array<{ id: string; file: File; url: string }>>([]);
  const [activePreviewUrl, setActivePreviewUrl] = useState("");
  const [showPickerOptions, setShowPickerOptions] = useState(false);
  const [recognitionPhase, setRecognitionPhase] = useState<RecognitionPhase>("idle");
  const [resultSummary, setResultSummary] = useState<RecognitionResultSummary | null>(null);

  const resetRecognitionState = () => {
    setRecognitionPhase("idle");
    setResultSummary(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      resetRecognitionState();
      const nextImages = files.map((file) => {
        const url = URL.createObjectURL(file);
        previewUrlsRef.current.add(url);
        return {
          id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
          url,
        };
      });
      setSelectedImages((current) => [...current, ...nextImages]);
    }
    event.target.value = "";
  };

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.clear();
    };
  }, []);

  const removeImage = (id: string) => {
    setSelectedImages((current) => {
      const image = current.find((item) => item.id === id);
      if (image) {
        URL.revokeObjectURL(image.url);
        previewUrlsRef.current.delete(image.url);
        if (activePreviewUrl === image.url) {
          setActivePreviewUrl("");
        }
      }
      return current.filter((item) => item.id !== id);
    });
    resetRecognitionState();
  };

  const handleConfirm = async () => {
    const files = selectedImages.map((image) => image.file);
    if (files.length === 0 || loading) return;

    setResultSummary(null);
    setRecognitionPhase("uploading");
    const recognizingTimer = window.setTimeout(() => setRecognitionPhase("recognizing"), 450);
    const finalizingTimer = window.setTimeout(() => setRecognitionPhase("finalizing"), 1800);

    try {
      const result = await onConfirm(files);
      window.clearTimeout(recognizingTimer);
      window.clearTimeout(finalizingTimer);
      setResultSummary(result);
      setRecognitionPhase("completed");
    } catch {
      window.clearTimeout(recognizingTimer);
      window.clearTimeout(finalizingTimer);
      setRecognitionPhase("failed");
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={cameraInputRef}
        className="hidden"
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
      />
      <input
        ref={albumInputRef}
        className="hidden"
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />
      {selectedImages.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {selectedImages.map((image, index) => (
            <div key={image.id} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <Button
                type="button"
                variant="ghost"
                className="h-full w-full rounded-none p-0"
                onClick={() => setActivePreviewUrl(image.url)}
              >
                <img className="h-full w-full object-cover" src={image.url} alt={`药品照片 ${index + 1}`} />
              </Button>
              <Button
                type="button"
                aria-label="删除图片"
                variant="destructive"
                size="icon"
                className="absolute right-1 top-1 h-6 w-6 rounded-full p-0 text-sm leading-none shadow-sm"
                onClick={() => removeImage(image.id)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="h-12 w-full"
          disabled={loading}
          onClick={() => setShowPickerOptions(true)}
        >
          {loading ? "识别中" : "添加照片"}
        </Button>
        <Button
          className="h-12 w-full"
          disabled={selectedImages.length === 0 || loading}
          onClick={() => void handleConfirm()}
        >
          确定
        </Button>
      </div>
      <RecognitionStatusPanel
        phase={recognitionPhase}
        imageCount={selectedImages.length}
        result={resultSummary}
        onViewResult={onViewResult}
      />
      {showPickerOptions ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <section className="w-full rounded-[1.35rem] bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:bg-slate-900">
            <Button
              type="button"
              variant="ghost"
              className="h-12 w-full rounded-2xl text-sm font-semibold text-slate-900 active:bg-slate-100 dark:text-slate-100 dark:active:bg-slate-800"
              onClick={() => {
                setShowPickerOptions(false);
                cameraInputRef.current?.click();
              }}
            >
              拍照
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="mt-1 h-12 w-full rounded-2xl text-sm font-semibold text-slate-900 active:bg-slate-100 dark:text-slate-100 dark:active:bg-slate-800"
              onClick={() => {
                setShowPickerOptions(false);
                albumInputRef.current?.click();
              }}
            >
              从相册选择
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="mt-2 h-12 w-full rounded-2xl bg-slate-100 text-sm font-semibold text-slate-600 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:active:bg-slate-700"
              onClick={() => setShowPickerOptions(false)}
            >
              取消
            </Button>
          </section>
        </div>
      ) : null}
      {activePreviewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4" onClick={() => setActivePreviewUrl("")}>
          <Button
            type="button"
            aria-label="关闭预览"
            variant="ghost"
            size="icon"
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] h-10 w-10 rounded-full bg-white/15 text-2xl text-white hover:bg-white/20"
            onClick={() => setActivePreviewUrl("")}
          >
            ×
          </Button>
          <img className="max-h-full max-w-full object-contain" src={activePreviewUrl} alt="药品照片预览" />
        </div>
      ) : null}
    </div>
  );
}

function RecognitionStatusPanel({
  phase,
  imageCount,
  result,
  onViewResult,
}: {
  phase: RecognitionPhase;
  imageCount: number;
  result: RecognitionResultSummary | null;
  onViewResult: () => void;
}) {
  if (imageCount === 0 && phase === "idle") {
    return null;
  }

  const isRunning = phase === "uploading" || phase === "recognizing" || phase === "finalizing";
  const statusText = getRecognitionStatusText(phase, imageCount);

  return (
    <section className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {phase === "completed" ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : isRunning ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <span className="text-sm font-bold">{imageCount}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{statusText.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{statusText.description}</p>
        </div>
      </div>

      {result ? (
        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-950">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <SummaryItem label="药品名称" value={result.name} />
            <SummaryItem label="分类" value={result.otc} />
            <SummaryItem label="有效期" value={result.expiry} />
            <SummaryItem
              label="置信度"
              value={formatConfidence(result.confidence)}
            />
          </div>
          <Button className="mt-3 h-10 w-full rounded-2xl" onClick={onViewResult}>
            查看并确认
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <p className="font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate font-semibold text-slate-900 dark:text-slate-100">{value || "未识别"}</p>
    </div>
  );
}

function formatConfidence(confidence?: number) {
  if (confidence == null) {
    return "未返回";
  }

  return `${Math.round(confidence <= 1 ? confidence * 100 : confidence)}%`;
}

function getRecognitionStatusText(phase: RecognitionPhase, imageCount: number) {
  if (phase === "uploading") {
    return {
      title: "正在上传图片",
      description: "已开始提交图片，请保持当前页面打开。",
    };
  }

  if (phase === "recognizing") {
    return {
      title: "正在识别药品信息",
      description: "正在读取药盒、说明书或瓶身中的关键信息。",
    };
  }

  if (phase === "finalizing") {
    return {
      title: "正在整理识别结果",
      description: "正在生成可确认和编辑的结构化信息。",
    };
  }

  if (phase === "completed") {
    return {
      title: "识别完成",
      description: "请查看识别摘要，确认后可继续编辑药品信息。",
    };
  }

  if (phase === "failed") {
    return {
      title: "识别未完成",
      description: "请根据顶部提示调整后重试，或重新选择图片。",
    };
  }

  return {
    title: `已选择 ${imageCount} 张图片`,
    description: "点击确定后开始上传并识别药品信息。",
  };
}

export function RecognitionConfirm({
  medicine,
  onRetry,
  onSave,
}: {
  medicine: Medicine | null;
  onRetry: () => void;
  onSave: (medicine: Medicine) => void;
}) {
  const [draft, setDraft] = useState<Medicine | null>(medicine);

  useEffect(() => {
    setDraft(medicine);
  }, [medicine]);

  if (!draft) {
    return (
      <div className="space-y-4">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-5 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          暂未识别到药品信息，请重新选择图片。
        </section>
        <Button className="w-full" onClick={onRetry}>重新识别</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard title="结构化识别结果">
        <EditField label="药品名称" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <EditField label="有效期" value={draft.expiry} onChange={(value) => setDraft({ ...draft, expiry: value })} />
        <label className="block text-sm">
          <span className="mb-2 block text-slate-500 dark:text-slate-400">分类</span>
          <Select
            value={draft.otc}
            options={medicineCategoryOptions}
            onChange={(value) => setDraft({ ...draft, otc: value })}
          />
        </label>
        <EditField
          label="适应症"
          value={draft.indication}
          onChange={(value) => setDraft({ ...draft, indication: value })}
          multiline
        />
        <EditField
          label="禁忌人群"
          value={draft.contraindications}
          onChange={(value) => setDraft({ ...draft, contraindications: value })}
          multiline
        />
        <EditField
          label="不良反应"
          value={draft.adverseReactions}
          onChange={(value) => setDraft({ ...draft, adverseReactions: value })}
          multiline
        />
        <EditField
          label="条形码"
          value={draft.barcode}
          onChange={(value) => setDraft({ ...draft, barcode: value })}
        />
        <EditField
          label="批准文号"
          value={draft.approvalNumber ?? ""}
          onChange={(value) => setDraft({ ...draft, approvalNumber: value })}
        />
        <EditField
          label="生产厂家"
          value={draft.manufacturer ?? ""}
          onChange={(value) => setDraft({ ...draft, manufacturer: value })}
        />
        <EditField
          label="用法用量"
          value={draft.dosage ?? ""}
          onChange={(value) => setDraft({ ...draft, dosage: value })}
          multiline
        />
      </SectionCard>
      <section className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        确认后进入药品列表页。
      </section>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="bg-white dark:bg-slate-800" onClick={onRetry}>重新识别</Button>
        <Button onClick={() => onSave({ ...draft, source: "图片识别", quantity: draft.quantity ?? 1 })}>确认保存</Button>
      </div>
    </div>
  );
}

export function ScanEntry({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-[linear-gradient(180deg,_#020617,_#111827)] p-5 text-white shadow-[0_14px_34px_rgba(15,23,42,0.2)]">
        <div className="mx-auto flex aspect-square max-w-[15rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-500 bg-[radial-gradient(circle,_rgba(14,165,233,0.12),_transparent_55%)]">
          <div className="relative h-40 w-40 overflow-hidden rounded-[1.2rem] border-2 border-sky-400 shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]">
            <div className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 bg-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.9)]" />
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-slate-300">
          将条形码置于框内。
        </p>
      </section>
      <Button className="w-full" size="lg" onClick={onConfirm}>继续</Button>
    </div>
  );
}

function EditField({
  label,
  value,
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block text-slate-500 dark:text-slate-400">{label}</span>
      {multiline ? (
        <Textarea
          className={`${inputClass} min-h-24 resize-none py-3 leading-6`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
