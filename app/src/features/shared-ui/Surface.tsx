import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/shared/lib/utils";

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 pb-0">
        <CardTitle className="text-base font-semibold tracking-tight text-slate-950 dark:text-slate-100">{title}</CardTitle>
        <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
      </CardHeader>
      <CardContent className="mt-4 space-y-3 p-4 pt-0">{children}</CardContent>
    </Card>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-800 dark:text-slate-200">{value}</span>
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
    <Badge
      variant="outline"
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "neutral"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
      )}
    >
      {children}
    </Badge>
  );
}
