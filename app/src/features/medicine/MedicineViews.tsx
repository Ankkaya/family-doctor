import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PillIcon } from "@/features/shared-ui/icons";
import { InfoRow, SectionCard, Tag } from "@/features/shared-ui/Surface";
import type { Medicine } from "@/shared/mock/app-data";
import { formatMedicineCategory } from "@/shared/lib/medicine-category";

export function MedicineList({
  medicines: list,
  keyword,
  loading,
  onSearch,
  onOpenMedicine,
}: {
  medicines: Medicine[];
  keyword: string;
  loading: boolean;
  onSearch: (value: string) => void;
  onOpenMedicine: (medicineId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.45rem] border border-slate-200 bg-white/95 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex gap-2">
          <Input
            className="h-11 flex-1 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-sky-100 dark:border-slate-800 dark:bg-slate-950"
            value={keyword}
            placeholder="搜索药品名称、适应症、分类"
            onChange={(event) => onSearch(event.target.value)}
          />
          <Button variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">筛选</Button>
        </div>
      </div>
      <div className="space-y-3">
        {list.map((medicine) => (
          <MedicineCard key={medicine.id} medicine={medicine} onClick={() => onOpenMedicine(medicine.id)} />
        ))}
      </div>
    </div>
  );
}

const inputClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(14,165,233,0.12)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100";
const medicineCategoryOptions: Array<{ label: string; value: Medicine["otc"] }> = [
  { label: "OTC(非处方药)", value: "OTC" },
  { label: "RX(处方药)", value: "Rx" },
];

export function MedicineDetail({
  medicine,
  onUpdate,
  onDelete,
}: {
  medicine: Medicine | null;
  onUpdate: (medicineId: string, medicine: Medicine) => Promise<void>;
  onDelete: (medicineId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Medicine | null>(medicine);

  useEffect(() => {
    setDraft(medicine);
    setEditing(false);
  }, [medicine]);

  if (!medicine) {
    return (
      <section className="rounded-[1.45rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        未找到药品
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,_#0f172a,_#111827)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{medicine.name}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">录入方式：{medicine.source}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Tag tone={medicine.otc === "OTC" ? "neutral" : "danger"}>{formatMedicineCategory(medicine.otc)}</Tag>
            <div className="flex gap-2">
              <Button variant="secondary" className="h-9 bg-white px-3 text-xs dark:bg-slate-800" onClick={() => setEditing(true)}>
                编辑
              </Button>
              <Button
                variant="destructive"
                className="h-9 px-3 text-xs"
                onClick={() => {
                  if (window.confirm(`删除「${medicine.name}」？`)) {
                    void onDelete(medicine.id);
                  }
                }}
              >
                删除
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-[linear-gradient(90deg,_#fef3c7,_#fff7ed)] px-4 py-3 text-sm text-amber-800">
          有效期：{medicine.expiry}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Tag tone="neutral">适应症</Tag>
          <Tag tone="danger">禁忌人群</Tag>
        </div>
      </section>
      <SectionCard title="适应症">
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{medicine.indication}</p>
      </SectionCard>
      <SectionCard title="禁忌人群">
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{medicine.contraindications}</p>
      </SectionCard>
      <SectionCard title="不良反应">
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{medicine.adverseReactions}</p>
      </SectionCard>
      <SectionCard title="来源信息">
        <div className="grid gap-3 text-sm text-slate-700 dark:text-slate-300">
          <InfoRow label="条形码" value={medicine.barcode} />
          <InfoRow label="数量" value={medicine.quantity ? String(medicine.quantity) : "未记录"} />
          <InfoRow label="分类" value={formatMedicineCategory(medicine.otc)} />
          <InfoRow label="录入方式" value={medicine.source} />
        </div>
      </SectionCard>
      {editing && draft && (
        <SectionCard title="编辑药品">
          <div className="space-y-3">
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
              label="数量"
              value={String(draft.quantity ?? 1)}
              onChange={(value) => setDraft({ ...draft, quantity: Math.max(1, Number(value) || 1) })}
            />
            <EditField
              label="适应症"
              value={draft.indication}
              multiline
              onChange={(value) => setDraft({ ...draft, indication: value })}
            />
            <EditField
              label="禁忌人群"
              value={draft.contraindications}
              multiline
              onChange={(value) => setDraft({ ...draft, contraindications: value })}
            />
            <EditField
              label="不良反应"
              value={draft.adverseReactions}
              multiline
              onChange={(value) => setDraft({ ...draft, adverseReactions: value })}
            />
            <EditField label="条形码" value={draft.barcode} onChange={(value) => setDraft({ ...draft, barcode: value })} />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" className="bg-white dark:bg-slate-800" onClick={() => setEditing(false)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  void onUpdate(medicine.id, draft).then(() => setEditing(false));
                }}
              >
                保存
              </Button>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function MedicineCard({
  medicine,
  onClick,
}: {
  medicine: Medicine;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      className="block h-auto w-full whitespace-normal rounded-[1.6rem] border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,_#0f172a,_#111827)]"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <PillIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-100">{medicine.name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{medicine.indication}</p>
          </div>
        </div>
        <Tag tone={medicine.otc === "OTC" ? "neutral" : "danger"}>{formatMedicineCategory(medicine.otc)}</Tag>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>有效期 {medicine.expiry}</span>
        <span>{medicine.source}</span>
      </div>
    </Button>
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
