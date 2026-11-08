"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const selectClass =
  "h-12 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Native date input with the Ethiopian date under it; the value stored is Gregorian. */
export function DateField({ name, label, defaultValue, min }: { name: string; label: string; defaultValue: string; min?: string }) {
  const locale = useLocale() as Locale;
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="date" min={min} value={value} onChange={(e) => setValue(e.target.value)} required />
      <p className="num text-sm text-muted-foreground" aria-live="polite">
        {/^\d{4}-\d{2}-\d{2}$/.test(value) ? formatEthiopianDate(value, locale) : ""}
      </p>
    </div>
  );
}

export function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} defaultValue={defaultValue} className={selectClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
