import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type SelectOption<T extends string = string> = {
  label: string;
  value: T;
};

export interface SelectProps<T extends string = string>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function Select<T extends string = string>({
  className,
  options,
  value,
  onChange,
  ...props
}: SelectProps<T>) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-11 w-full appearance-none rounded-2xl border border-input bg-background px-3 pr-9 text-sm text-foreground outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-950"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-muted-foreground" />
    </div>
  );
}
