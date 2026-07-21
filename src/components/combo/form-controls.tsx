"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-caption font-medium text-ink-3">{children}</Label>;
}

export function SliderRow({
  label,
  value,
  suffix,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (_value: number) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[12px] font-semibold text-brand-text">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </section>
  );
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  cols = 2,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (_value: T) => void;
  cols?: number;
}) {
  const colClass =
    cols === 5 ? "grid-cols-5" : cols === 4 ? "grid-cols-4" : cols === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={cn("grid gap-1.5", colClass)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-[10px] border px-2 py-2 text-[12px] font-semibold transition-colors",
            value === o.id
              ? "border-brand bg-brand-soft text-brand-text"
              : "border-line-strong text-ink-2 hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

