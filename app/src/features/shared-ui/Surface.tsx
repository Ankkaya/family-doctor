import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight text-slate-950">{title}</h3>
        <span className="h-px flex-1 bg-slate-100" />
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function StepBanner({
  title,
  description,
  step,
}: {
  title: string;
  description: string;
  step: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(135deg,_#ffffff,_#f8fafc)] px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Step {step}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
          {step}
        </div>
      </div>
    </section>
  );
}

export function FormField({
  label,
  value,
  multiline,
  warning,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div
        className={cn(
          "rounded-2xl border px-4 py-3 text-sm leading-6",
          warning
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-slate-200 bg-slate-50 text-slate-700",
          multiline && "min-h-20",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}

export function Tag({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "neutral"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
      )}
    >
      {children}
    </span>
  );
}

