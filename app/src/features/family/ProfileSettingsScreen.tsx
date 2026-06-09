import { useEffect, useRef, useState } from "react";
import { Select } from "@/components/ui/select";
import type { AppProfileInput, AppUser } from "@/shared/api/app-api";

type GenderValue = "male" | "female" | "other" | "unknown";

const genderOptions: { label: string; value: GenderValue }[] = [
  { label: "男", value: "male" },
  { label: "女", value: "female" },
  { label: "其他", value: "other" },
  { label: "未知", value: "unknown" },
];

export function ProfileSettingsScreen({
  user,
  loading,
  error,
  onSave,
  onUploadAvatar,
  onCancel,
}: {
  user: AppUser;
  loading: boolean;
  error?: string;
  onSave: (input: AppProfileInput) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<AppUser>;
  onCancel: () => void;
}) {
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [age, setAge] = useState(user.age == null ? "" : String(user.age));
  const [gender, setGender] = useState<GenderValue>((user.gender as GenderValue | undefined) ?? "unknown");
  const [allergies, setAllergies] = useState(user.allergies ?? "");
  const [chronicDiseases, setChronicDiseases] = useState(user.chronicDiseases ?? "");
  const [medicationHistory, setMedicationHistory] = useState(user.medicationHistory ?? "");
  const [localError, setLocalError] = useState("");
  const [editor, setEditor] = useState<AvatarEditorState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarUrl(user.avatarUrl ?? "");
    setAge(user.age == null ? "" : String(user.age));
    setGender((user.gender as GenderValue | undefined) ?? "unknown");
    setAllergies(user.allergies ?? "");
    setChronicDiseases(user.chronicDiseases ?? "");
    setMedicationHistory(user.medicationHistory ?? "");
  }, [user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedAge = age.trim();
    const parsedAge = normalizedAge ? Number(normalizedAge) : null;

    if (parsedAge != null && (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 130)) {
      setLocalError("年龄需填写 0-130 之间的整数");
      return;
    }

    setLocalError("");
    await onSave({
      avatarUrl,
      age: parsedAge,
      gender,
      allergies,
      chronicDiseases,
      medicationHistory,
    });
  }

  function handleAvatarFile(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLocalError("请选择图片文件");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLocalError("头像图片大小不能超过 5MB");
      return;
    }

    setLocalError("");
    setEditor({
      sourceUrl: URL.createObjectURL(file),
      zoom: 1,
      rotation: 0,
    });
  }

  async function confirmAvatarEdit() {
    if (!editor) return;

    try {
      const blob = await renderAvatarBlob(editor);
      const file = new File([blob], `avatar-${Date.now()}.png`, { type: "image/png" });
      const updatedUser = await onUploadAvatar(file);
      setAvatarUrl(updatedUser.avatarUrl ?? "");
      URL.revokeObjectURL(editor.sourceUrl);
      setEditor(null);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "头像处理失败");
    }
  }

  function closeEditor() {
    if (editor) {
      URL.revokeObjectURL(editor.sourceUrl);
    }
    setEditor(null);
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <section className="rounded-[1.55rem] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative rounded-full outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
            aria-label="选择头像"
            title="选择头像"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            <AvatarPreview avatarUrl={avatarUrl} name={user.nickname || user.username || "我"} />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(event) => {
              handleAvatarFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-950">点击头像更换</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">支持选择图片后缩放、旋转并裁剪为方形头像</p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-[1.55rem] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="grid grid-cols-[1fr_1.4fr] gap-3">
          <label>
            <span className="text-xs font-semibold text-slate-500">年龄</span>
            <input
              value={age}
              onChange={(event) => setAge(event.target.value)}
              inputMode="numeric"
              placeholder="未填"
              className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-400"
            />
          </label>
          <label>
            <span className="text-xs font-semibold text-slate-500">性别</span>
            <Select
              className="mt-1"
              value={gender}
              options={genderOptions}
              onChange={setGender}
            />
          </label>
        </div>

        <TextAreaField
          label="过敏史"
          value={allergies}
          placeholder="例如：青霉素、花粉、海鲜"
          onChange={setAllergies}
        />
        <TextAreaField
          label="基础病"
          value={chronicDiseases}
          placeholder="例如：高血压、糖尿病、肝肾疾病"
          onChange={setChronicDiseases}
        />
        <TextAreaField
          label="长期用药"
          value={medicationHistory}
          placeholder="例如：降压药、降糖药、抗凝药"
          onChange={setMedicationHistory}
        />
      </section>

      {localError || error ? (
        <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{localError || error}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="h-12 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
          onClick={onCancel}
          disabled={loading}
        >
          取消
        </button>
        <button
          type="submit"
          className="h-12 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "保存中" : "保存"}
        </button>
      </div>
      {editor ? (
        <AvatarEditor
          state={editor}
          loading={loading}
          onChange={setEditor}
          onCancel={closeEditor}
          onConfirm={() => void confirmAvatarEdit()}
        />
      ) : null}
    </form>
  );
}

function AvatarPreview({ avatarUrl, name }: { avatarUrl: string; name: string }) {
  if (avatarUrl.trim()) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-14 w-14 shrink-0 rounded-full border border-slate-100 object-cover"
      />
    );
  }

  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-900 text-lg font-semibold text-white">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

type AvatarEditorState = {
  sourceUrl: string;
  zoom: number;
  rotation: number;
};

function AvatarEditor({
  state,
  loading,
  onChange,
  onCancel,
  onConfirm,
}: {
  state: AvatarEditorState;
  loading: boolean;
  onChange: (state: AvatarEditorState) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.26)]">
        <div className="mx-auto h-64 w-64 overflow-hidden rounded-full bg-slate-100">
          <img
            src={state.sourceUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{
              transform: `scale(${state.zoom}) rotate(${state.rotation}deg)`,
            }}
          />
        </div>
        <label className="mt-4 block">
          <span className="text-xs font-semibold text-slate-500">缩放</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={state.zoom}
            className="mt-2 w-full accent-emerald-600"
            onChange={(event) => onChange({ ...state, zoom: Number(event.target.value) })}
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="h-10 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700"
            onClick={() => onChange({ ...state, rotation: state.rotation - 90 })}
          >
            左转
          </button>
          <button
            type="button"
            className="h-10 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700"
            onClick={() => onChange({ ...state, rotation: state.rotation + 90 })}
          >
            右转
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="h-11 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            onClick={onCancel}
            disabled={loading}
          >
            取消
          </button>
          <button
            type="button"
            className="h-11 rounded-2xl bg-slate-950 text-sm font-semibold text-white disabled:opacity-60"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "上传中" : "使用头像"}
          </button>
        </div>
      </div>
    </div>
  );
}

async function renderAvatarBlob(state: AvatarEditorState) {
  const image = await loadImage(state.sourceUrl);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前设备不支持头像编辑");
  }

  context.clearRect(0, 0, size, size);
  context.translate(size / 2, size / 2);
  context.rotate((state.rotation * Math.PI) / 180);
  const baseScale = Math.max(size / image.width, size / image.height);
  const scale = baseScale * state.zoom;
  context.drawImage(
    image,
    -(image.width * scale) / 2,
    -(image.height * scale) / 2,
    image.width * scale,
    image.height * scale,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("头像导出失败"));
      }
    }, "image/png");
  });
}

function loadImage(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("头像图片读取失败"));
    image.src = sourceUrl;
  });
}

function TextAreaField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950 outline-none focus:border-emerald-400"
      />
    </label>
  );
}
