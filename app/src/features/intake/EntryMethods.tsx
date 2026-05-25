import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CameraIcon, EditIcon, ScanIcon } from "@/features/shared-ui/icons";
import { FormField, SectionCard, StepBanner } from "@/features/shared-ui/Surface";
import { medicines, type Medicine } from "@/shared/mock/app-data";
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
  onScanBarcode,
}: {
  onSave: (medicine: Medicine) => void;
  onScanBarcode: () => void;
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
        title="手动录入"
        description="填写药品基础信息和说明信息。"
        step="01"
      />
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
        <BarcodeField value={form.barcode} onChange={(value) => update("barcode", value)} onScan={onScanBarcode} />
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
  onScan,
}: {
  value: string;
  onChange: (value: string) => void;
  onScan: () => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block text-slate-500">条形码</span>
      <div className="relative">
        <input
          className={`${inputClass} pr-12`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-700"
          title="扫描条形码"
          aria-label="扫描条形码"
          onClick={onScan}
        >
          <ScanIcon className="h-4 w-4" />
        </button>
      </div>
    </label>
  );
}

export function ImageUpload({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="space-y-4">
      <StepBanner
        title="图片识别"
        description="拍摄药盒、说明书或瓶身图片。"
        step="02"
      />
      <section className="rounded-[1.75rem] border border-dashed border-sky-300 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.2),_transparent_50%),linear-gradient(180deg,_#eff6ff,_#f8fafc)] p-8 text-center">
        <p className="text-sm font-medium text-sky-700">上传药品图片</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          拍照或从相册选择图片后确认药品信息。
        </p>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="h-14 bg-white">拍照上传</Button>
        <Button variant="secondary" className="h-14 bg-white">从相册选择</Button>
      </div>
      <Button className="w-full" size="lg" onClick={onConfirm}>继续</Button>
    </div>
  );
}

export function RecognitionConfirm({ onSave }: { onSave: (medicine: Medicine) => void }) {
  const medicine = medicines[1];

  return (
    <div className="space-y-4">
      <StepBanner
        title="识别结果确认"
        description="确认药品基础信息和风险提示。"
        step="03"
      />
      <SectionCard title="结构化识别结果">
        <FormField label="药品名称" value={medicine.name} />
        <FormField label="有效期" value={medicine.expiry} />
        <FormField label="适应症" value={medicine.indication} multiline />
        <FormField label="禁忌人群" value={medicine.contraindications} multiline warning />
        <FormField label="不良反应" value={medicine.adverseReactions} multiline />
        <FormField label="条形码" value={medicine.barcode} />
      </SectionCard>
      <section className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        确认后进入药品列表页。
      </section>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="bg-white">重新识别</Button>
        <Button onClick={() => onSave({ ...medicine, source: "图片识别", quantity: 1 })}>确认保存</Button>
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
