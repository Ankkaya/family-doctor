import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CameraIcon, EditIcon, ScanIcon } from "@/features/shared-ui/icons";
import { FormField, SectionCard, StepBanner } from "@/features/shared-ui/Surface";
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
        <button
          key={method.title}
          className="w-full rounded-[1.55rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
          onClick={() => onNavigate(method.screen)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", method.tone)}>
                {method.icon}
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-slate-950">{method.title}</h3>
              </div>
            </div>
            <span className="text-slate-400">›</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{method.description}</p>
        </button>
      ))}
    </div>
  );
}

const inputClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(14,165,233,0.12)]";

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
      <StepBanner
        title="药品录入"
        description="手动填写药品信息，也可以上传药盒图片识别。"
        step="01"
      />
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-[1.35rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-left active:bg-emerald-100"
        onClick={onUploadImage}
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white">
            <CameraIcon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-950">上传药盒图片识别</span>
            <span className="mt-1 block text-xs text-emerald-700">识别后可在确认页补充和修改</span>
          </span>
        </span>
        <span className="text-lg text-emerald-700">›</span>
      </button>
      <SectionCard title="基础信息">
        <EditField label="药品名称" value={form.name} onChange={(value) => update("name", value)} />
        <EditField label="有效期" value={form.expiry} onChange={(value) => update("expiry", value)} />
        <label className="block text-sm">
          <span className="mb-2 block text-slate-500">分类</span>
          <select className={inputClass} value={form.otc} onChange={(event) => update("otc", event.target.value)}>
            <option value="OTC">OTC(非处方药)</option>
            <option value="Rx">RX(处方药)</option>
          </select>
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
      <span className="mb-2 block text-slate-500">条形码</span>
      <input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function ImageUpload({
  loading,
  error,
  onConfirm,
}: {
  loading: boolean;
  error?: string;
  onConfirm: (files: File[]) => Promise<void>;
}) {
  const albumInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Array<{ id: string; file: File; url: string }>>([]);
  const [activePreviewUrl, setActivePreviewUrl] = useState("");
  const [showPickerOptions, setShowPickerOptions] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
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
  };

  return (
    <div className="space-y-4">
      <StepBanner
        title="图片识别"
        description="拍摄药盒、说明书或瓶身图片。"
        step="02"
      />
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
            <div key={image.id} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <button
                type="button"
                className="h-full w-full"
                onClick={() => setActivePreviewUrl(image.url)}
              >
                <img className="h-full w-full object-cover" src={image.url} alt={`药品照片 ${index + 1}`} />
              </button>
              <button
                type="button"
                aria-label="删除图片"
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-slate-950/70 text-sm leading-none text-white"
                onClick={() => removeImage(image.id)}
              >
                ×
              </button>
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
          onClick={() => void onConfirm(selectedImages.map((image) => image.file))}
        >
          确定
        </Button>
      </div>
      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          {error}
        </div>
      ) : null}
      {showPickerOptions ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <section className="w-full rounded-[1.35rem] bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.24)]">
            <button
              type="button"
              className="h-12 w-full rounded-2xl text-sm font-semibold text-slate-900 active:bg-slate-100"
              onClick={() => {
                setShowPickerOptions(false);
                cameraInputRef.current?.click();
              }}
            >
              拍照
            </button>
            <button
              type="button"
              className="mt-1 h-12 w-full rounded-2xl text-sm font-semibold text-slate-900 active:bg-slate-100"
              onClick={() => {
                setShowPickerOptions(false);
                albumInputRef.current?.click();
              }}
            >
              从相册选择
            </button>
            <button
              type="button"
              className="mt-2 h-12 w-full rounded-2xl bg-slate-100 text-sm font-semibold text-slate-600 active:bg-slate-200"
              onClick={() => setShowPickerOptions(false)}
            >
              取消
            </button>
          </section>
        </div>
      ) : null}
      {activePreviewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4" onClick={() => setActivePreviewUrl("")}>
          <button
            type="button"
            aria-label="关闭预览"
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] grid h-10 w-10 place-items-center rounded-full bg-white/15 text-2xl text-white"
            onClick={() => setActivePreviewUrl("")}
          >
            ×
          </button>
          <img className="max-h-full max-w-full object-contain" src={activePreviewUrl} alt="药品照片预览" />
        </div>
      ) : null}
    </div>
  );
}

export function RecognitionConfirm({
  medicine,
  error,
  onRetry,
  onSave,
}: {
  medicine: Medicine | null;
  error?: string;
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
        <StepBanner
          title="识别结果确认"
          description="确认药品基础信息和风险提示。"
          step="03"
        />
        <section className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-5 text-sm leading-6 text-slate-600">
          {error || "暂未识别到药品信息，请重新选择图片。"}
        </section>
        <Button className="w-full" onClick={onRetry}>重新识别</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StepBanner
        title="识别结果确认"
        description="确认药品基础信息和风险提示。"
        step="03"
      />
      {error ? (
        <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          {error}
        </section>
      ) : null}
      <SectionCard title="结构化识别结果">
        <EditField label="药品名称" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <EditField label="有效期" value={draft.expiry} onChange={(value) => setDraft({ ...draft, expiry: value })} />
        <label className="block text-sm">
          <span className="mb-2 block text-slate-500">分类</span>
          <select
            className={inputClass}
            value={draft.otc}
            onChange={(event) => setDraft({ ...draft, otc: event.target.value as Medicine["otc"] })}
          >
            <option value="OTC">OTC(非处方药)</option>
            <option value="Rx">RX(处方药)</option>
          </select>
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
        <Button variant="secondary" className="bg-white" onClick={onRetry}>重新识别</Button>
        <Button onClick={() => onSave({ ...draft, source: "图片识别", quantity: draft.quantity ?? 1 })}>确认保存</Button>
      </div>
    </div>
  );
}

export function ScanEntry({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="space-y-4">
      <StepBanner
        title="扫码录入"
        description="将条形码置于扫描框内。"
        step="02"
      />
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
      <span className="mb-2 block text-slate-500">{label}</span>
      {multiline ? (
        <textarea
          className={`${inputClass} min-h-24 resize-none py-3 leading-6`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
